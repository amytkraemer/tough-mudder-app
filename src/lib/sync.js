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

// --- Pure decision helpers (exported for tests) ----------------------------
// The app may leave the loading gate and decide onboarding ONLY once auth has
// resolved and — if signed in — the user's cloud doc has been fetched & merged.
// Before that, deciding onboarding from local storage alone shows onboarding to
// a returning user whose data is still in the cloud.
export function isReady({ enabled, authResolved, hydrated }) {
  if (!enabled) return true          // no cloud: local storage is the source of truth
  return !!authResolved && !!hydrated
}

// A local edit may be pushed to cloud ONLY after we have fetched & merged THIS
// user's cloud document. This is the data guard: it makes it impossible for an
// empty or freshly-onboarded local state to overwrite a populated cloud doc
// during the initial-load race (cloud always wins until we've read it).
export function canPush({ uid, hydratedUid }) {
  return !!uid && hydratedUid === uid
}

export function useCloudSync(data, setData) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(firebaseEnabled ? 'init' : 'disabled')
  // Gate: has auth resolved, and (if signed in) has the cloud doc loaded yet?
  const [authResolved, setAuthResolved] = useState(!firebaseEnabled)
  const [hydrated, setHydrated] = useState(!firebaseEnabled)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const applyingRemote = useRef(false)
  // uid whose cloud doc we've fetched & merged. The push guard keys off this,
  // so an empty local state can NEVER be written until cloud has been read.
  const hydratedForUid = useRef(null)
  const unsubDoc = useRef(null)
  const writeTimer = useRef(null)
  const dataRef = useRef(data)
  dataRef.current = data

  // auth state
  useEffect(() => {
    if (!firebaseEnabled) return
    let unsub
    onAuth((u) => {
      setUser(u)
      setAuthResolved(true)
      if (!u) {
        // Signed out: local storage is the source of truth, nothing to fetch.
        setStatus('signed-out')
        hydratedForUid.current = null
        setHydrated(true)
      } else {
        // A (different) user just signed in — must read their cloud doc before
        // we trust local state or allow any write.
        setHydrated(false)
      }
    }).then((fn) => { unsub = fn })
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
        // Mark hydrated BEFORE the first write and BEFORE opening the push gate,
        // so the only thing ever written now already contains the cloud data.
        hydratedForUid.current = user.uid
        await writeRemote(user.uid, pick(merged))
        if (cancelled) return
        setStatus('synced'); setLastSyncedAt(Date.now())
        setHydrated(true)
        unsubDoc.current = await subscribeRemote(user.uid, (remoteData) => {
          // merge remote into local per-key so unpushed local edits aren't wiped
          const next = mergeData(dataRef.current, remoteData)
          if (JSON.stringify(pick(next)) === JSON.stringify(pick(dataRef.current))) return
          applyingRemote.current = true
          setData(() => next)
        })
      } catch {
        if (cancelled) return
        // Fetch failed. Don't strand the user on the loading screen, but keep the
        // push gate CLOSED (hydratedForUid stays null) so we still never clobber
        // a cloud doc we couldn't read.
        setStatus('error')
        setHydrated(true)
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
    // DATA GUARD: never write until this user's cloud doc has been fetched &
    // merged. Closes the initial-load race where an empty local state could
    // overwrite populated cloud data.
    if (!canPush({ uid: user.uid, hydratedUid: hydratedForUid.current })) return
    if (applyingRemote.current) { applyingRemote.current = false; return }
    if (writeTimer.current) clearTimeout(writeTimer.current)
    setStatus('syncing')
    writeTimer.current = setTimeout(() => {
      writeRemote(user.uid, pick(dataRef.current))
        .then(() => { setStatus('synced'); setLastSyncedAt(Date.now()) })
        .catch(() => setStatus('error'))
    }, 700)
    return () => { if (writeTimer.current) clearTimeout(writeTimer.current) }
  }, [data, user])

  const signIn = useCallback(async () => {
    try { setStatus('syncing'); await fbSignIn() } catch { setStatus('error') }
  }, [])
  const signOut = useCallback(async () => { await signOutUser() }, [])

  const ready = isReady({ enabled: firebaseEnabled, authResolved, hydrated })
  return { user, status, signIn, signOut, enabled: firebaseEnabled, ready, lastSyncedAt }
}
