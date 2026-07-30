import { useEffect, useRef, useState, useCallback } from 'react'
import {
  firebaseEnabled, onAuth, signIn as fbSignIn, signOutUser,
  fetchRemote, writeRemote, subscribeRemote, deleteRemote,
} from './firebase.js'
import { CURRENT_VERSION, hangsToObject, defaultData, migrate } from './storage.js'
import { mergeStates, emptyMeta, staleTombstonePaths } from './lww.js'

// Only these fields sync. UI-only state stays local. clock/tombstones travel
// with the data so last-write-wins + deletions work across devices.
function pick(d) {
  return {
    settings: d.settings,
    marks: d.marks || {}, logs: d.logs || {}, extra: d.extra || {}, hangs: hangsToObject(d.hangs),
    clock: d.clock || emptyMeta(), tombstones: d.tombstones || emptyMeta(),
  }
}

// migrate() shape-normalizes any doc (legacy "bonus" key, hangs array, missing
// clock/tombstones) so both sides of a merge are in the current shape.
export function mergeData(local, remote) {
  const l = migrate(local || {})
  if (!remote) return l
  const r = migrate(remote)
  const settings = r.settings?.onboarded
    ? { ...l.settings, ...r.settings }   // adopt the already-onboarded plan
    : { ...r.settings, ...l.settings }   // local is the real one
  // Last-write-wins per item, honoring tombstones so a deletion on one device
  // sticks instead of being re-added from the other's stale copy.
  const merged = mergeStates(l, r)
  return { version: CURRENT_VERSION, settings, ...merged }
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

// Account reset — the one intentional path that bypasses the write guard.
// Ordering is the safety property: the cloud document must be deleted and
// CONFIRMED before local is cleared. If deleteRemote rejects, clearLocal is
// never reached, so the user is never left with local wiped but cloud intact.
// When signed out (no uid) there is no cloud copy — just clear local.
export async function performReset({ uid, deleteRemote, clearLocal }) {
  if (uid) await deleteRemote(uid)   // throws on failure -> local left untouched
  clearLocal()
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
  // Last remote doc we've seen, so the push can GC tombstones the cloud still holds.
  const remoteRef = useRef(null)

  // A live snapshot arrived: merge it into local per-key so unpushed local edits
  // aren't wiped.
  const applyRemote = useCallback((remoteData) => {
    remoteRef.current = remoteData
    const next = mergeData(dataRef.current, remoteData)
    if (JSON.stringify(pick(next)) === JSON.stringify(pick(dataRef.current))) return
    applyingRemote.current = true
    setData(() => next)
  }, [setData])

  // The cloud doc was deleted on the server = the account was reset (here or on
  // another device). Mirror the wipe locally instead of re-uploading our copy —
  // and flag it as a remote-driven change so the push effect doesn't recreate it.
  const applyRemoteGone = useCallback(() => {
    if (JSON.stringify(pick(dataRef.current)) === JSON.stringify(pick(defaultData()))) return
    applyingRemote.current = true
    setData(() => defaultData())
  }, [setData])

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
        remoteRef.current = remote
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
        unsubDoc.current = await subscribeRemote(user.uid, applyRemote, applyRemoteGone)
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
  }, [user, setData, applyRemote, applyRemoteGone])

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
      // Clean up tombstones the cloud doc still holds past the TTL (a merge write
      // can't remove them, so delete those fields explicitly).
      const gc = staleTombstonePaths(remoteRef.current?.tombstones)
      writeRemote(user.uid, pick(dataRef.current), gc)
        .then(() => { setStatus('synced'); setLastSyncedAt(Date.now()) })
        .catch(() => setStatus('error'))
    }, 700)
    return () => { if (writeTimer.current) clearTimeout(writeTimer.current) }
  }, [data, user])

  const signIn = useCallback(async () => {
    try { setStatus('syncing'); await fbSignIn() } catch { setStatus('error') }
  }, [])
  const signOut = useCallback(async () => { await signOutUser() }, [])

  // Erase the account and start over. Deletes the cloud doc FIRST and only then
  // clears local; if the delete fails it rejects with local untouched so the
  // caller can surface an error. This is the one path allowed past the guard.
  const resetAccount = useCallback(async () => {
    await performReset({
      uid: user?.uid || null,
      deleteRemote,
      clearLocal: () => {
        // Cloud is confirmed gone. Tear down the live sub, wipe local, and keep
        // the push gate open for this uid so re-onboarding syncs to a fresh doc.
        if (unsubDoc.current) { unsubDoc.current(); unsubDoc.current = null }
        if (user) hydratedForUid.current = user.uid
        applyingRemote.current = true            // the wipe below is not a user edit
        setData(() => defaultData())
        if (user) { setStatus('synced'); setLastSyncedAt(Date.now()) }
        // Re-subscribe so re-onboarding and other devices stay in sync.
        if (user) {
          subscribeRemote(user.uid, applyRemote, applyRemoteGone).then((fn) => { unsubDoc.current = fn })
        }
      },
    })
  }, [user, setData, applyRemote, applyRemoteGone])

  const ready = isReady({ enabled: firebaseEnabled, authResolved, hydrated })
  return { user, status, signIn, signOut, enabled: firebaseEnabled, ready, lastSyncedAt, resetAccount }
}
