import { useEffect, useRef, useState, useCallback } from 'react'
import {
  firebaseEnabled, onAuth, signIn as fbSignIn, signOutUser,
  fetchRemote, writeRemote, subscribeRemote,
} from './firebase.js'
import { CURRENT_VERSION, defaultData } from './storage.js'

// Only these fields sync. UI-only state stays local.
function pick(d) {
  return { settings: d.settings, marks: d.marks || {}, logs: d.logs || {}, extra: d.extra || {}, hangs: d.hangs || [] }
}

function dedupeHangs(arr) {
  const m = new Map()
  for (const h of arr || []) m.set(h?.id ?? JSON.stringify(h), h)
  return [...m.values()]
}

// One-time reconciliation when a device first signs in: never lose anything.
function mergeInitial(local, remote) {
  if (!remote) return local
  const settings = remote.settings?.onboarded
    ? { ...local.settings, ...remote.settings }   // adopt the already-onboarded plan
    : { ...remote.settings, ...local.settings }   // local is the real one
  return {
    version: CURRENT_VERSION,
    settings,
    marks: { ...remote.marks, ...local.marks },
    logs: { ...remote.logs, ...local.logs },
    extra: { ...remote.extra, ...local.extra },
    hangs: dedupeHangs([...(remote.hangs || []), ...(local.hangs || [])]),
  }
}

// After the initial merge, the server doc is authoritative (last-write-wins).
function applyRemote(remote) {
  const d = defaultData()
  return {
    version: CURRENT_VERSION,
    settings: { ...d.settings, ...(remote.settings || {}) },
    marks: remote.marks || {},
    logs: remote.logs || {},
    extra: remote.extra || {},
    hangs: remote.hangs || [],
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
        const merged = mergeInitial(dataRef.current, remote)
        applyingRemote.current = true
        setData(() => merged)
        await writeRemote(user.uid, pick(merged))
        if (cancelled) return
        setStatus('synced')
        unsubDoc.current = await subscribeRemote(user.uid, (remoteData) => {
          const next = applyRemote(remoteData)
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
