import { useEffect, useRef, useState, useCallback } from 'react'
import {
  firebaseEnabled, onAuth, signIn as fbSignIn, signOutUser,
  fetchRemote, writeRemote, subscribeRemote,
} from './firebase.js'
import { CURRENT_VERSION, hangsToObject } from './storage.js'

// Only these fields sync. UI-only state stays local.
function pick(d) {
  return { settings: d.settings, marks: d.marks || {}, logs: d.logs || {}, extra: d.extra || {}, hangs: hangsToObject(d.hangs) }
}

// Per-key merge so two devices editing DIFFERENT weeks (or logging different
// hangs) both survive a reconnect instead of one wiping the other. marks/logs/
// extra are id-keyed maps; hangs is now an id-keyed object. On a same-key
// conflict, the remote (last confirmed server value) wins — an accepted
// trade-off that resolves virtually every real-world conflict.
// normalize a doc that may be in the old shape (legacy "bonus" key, hangs array)
function norm(x) {
  const s = x || {}
  return {
    settings: s.settings || {},
    marks: s.marks || {},
    logs: s.logs || {},
    extra: s.extra || s.bonus || {},   // migrate legacy "bonus"
    hangs: hangsToObject(s.hangs),      // migrate legacy array
  }
}

export function mergeData(local, remote) {
  const l = norm(local)
  if (!remote) return { version: CURRENT_VERSION, ...l }
  const r = norm(remote)
  const settings = r.settings?.onboarded
    ? { ...l.settings, ...r.settings }   // adopt the already-onboarded plan
    : { ...r.settings, ...l.settings }   // local is the real one
  return {
    version: CURRENT_VERSION,
    settings,
    marks: { ...l.marks, ...r.marks },
    logs: { ...l.logs, ...r.logs },
    extra: { ...l.extra, ...r.extra },
    hangs: { ...l.hangs, ...r.hangs },   // merge by id — never drops entries
  }
}

export function useCloudSync(data, setData) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(firebaseEnabled ? 'signed-out' : 'disabled')
  const applyingRemote = useRef(false)
  const unsubDoc = useRef(null)
  const writeTimer = useRef(null)
  const dataRef = useRef(data)
  dataRef.current = data

  // auth state
  useEffect(() => {
    if (!firebaseEnabled) return
    let unsub
    onAuth((u) => { setUser(u); if (!u) setStatus('signed-out') }).then((fn) => { unsub = fn })
    return () => { unsub && unsub() }
  }, [])

  // initial sync + live subscription while signed in
  useEffect(() => {
    if (!user) {
      if (unsubDoc.current) { unsubDoc.current(); unsubDoc.current = null }
      return
    }
    let cancelled = false
    setStatus('syncing')
    ;(async () => {
      try {
        const remote = await fetchRemote(user.uid)
        const merged = mergeData(dataRef.current, remote)
        applyingRemote.current = true
        setData(() => merged)
        await writeRemote(user.uid, pick(merged))
        if (cancelled) return
        setStatus('synced')
        unsubDoc.current = await subscribeRemote(user.uid, (remoteData) => {
          // merge remote into local per-key so unpushed local edits aren't wiped
          const next = mergeData(dataRef.current, remoteData)
          if (JSON.stringify(pick(next)) === JSON.stringify(pick(dataRef.current))) return
          applyingRemote.current = true
          setData(() => next)
        })
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => {
      cancelled = true
      if (unsubDoc.current) { unsubDoc.current(); unsubDoc.current = null }
    }
  }, [user, setData])

  // push local edits up (debounced); skip the change that came FROM remote
  useEffect(() => {
    if (!user) return
    if (applyingRemote.current) { applyingRemote.current = false; return }
    if (writeTimer.current) clearTimeout(writeTimer.current)
    setStatus('syncing')
    writeTimer.current = setTimeout(() => {
      writeRemote(user.uid, pick(dataRef.current))
        .then(() => setStatus('synced'))
        .catch(() => setStatus('error'))
    }, 700)
    return () => { if (writeTimer.current) clearTimeout(writeTimer.current) }
  }, [data, user])

  const signIn = useCallback(async () => {
    try { setStatus('syncing'); await fbSignIn() } catch { setStatus('error') }
  }, [])
  const signOut = useCallback(async () => { await signOutUser() }, [])

  return { user, status, signIn, signOut, enabled: firebaseEnabled }
}
