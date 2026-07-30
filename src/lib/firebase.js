// Firebase init: Auth (Google) + Firestore with offline persistence.
// Lazily initialized so the app has zero Firebase overhead when sync is off.
import { firebaseConfig, firebaseEnabled } from './firebaseConfig.js'

let _app, _auth, _db, _provider
let _loading

async function ensure() {
  if (!firebaseEnabled) return null
  if (_db) return { app: _app, auth: _auth, db: _db, provider: _provider }
  if (_loading) return _loading
  _loading = (async () => {
    const { initializeApp } = await import('firebase/app')
    const { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } = await import('firebase/auth')
    const { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } = await import('firebase/firestore')
    _app = initializeApp(firebaseConfig)
    _auth = getAuth(_app)
    try { await setPersistence(_auth, browserLocalPersistence) } catch {}
    _provider = new GoogleAuthProvider()
    // Offline-first cache: writes queue locally and sync when back online.
    _db = initializeFirestore(_app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
    return { app: _app, auth: _auth, db: _db, provider: _provider }
  })()
  return _loading
}

export { firebaseEnabled }

export async function onAuth(cb) {
  const fb = await ensure()
  if (!fb) return () => {}
  const { onAuthStateChanged, getRedirectResult } = await import('firebase/auth')
  // Complete any pending redirect sign-in (mobile / installed PWA flow).
  try { await getRedirectResult(fb.auth) } catch {}
  return onAuthStateChanged(fb.auth, cb)
}

export async function signIn() {
  const fb = await ensure()
  if (!fb) throw new Error('Sync is not configured')
  const { signInWithPopup, signInWithRedirect } = await import('firebase/auth')
  // Popups are blocked in installed/standalone PWAs and many mobile browsers;
  // fall back to redirect there.
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
  if (standalone) return signInWithRedirect(fb.auth, fb.provider)
  try {
    return await signInWithPopup(fb.auth, fb.provider)
  } catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e?.code)) {
      return signInWithRedirect(fb.auth, fb.provider)
    }
    throw e
  }
}

export async function signOutUser() {
  const fb = await ensure()
  if (!fb) return
  const { signOut } = await import('firebase/auth')
  await signOut(fb.auth)
}

// --- Firestore doc I/O: one document per user at users/{uid} ---
export async function fetchRemote(uid) {
  const fb = await ensure()
  const { doc, getDoc } = await import('firebase/firestore')
  const snap = await getDoc(doc(fb.db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export async function writeRemote(uid, payload) {
  const fb = await ensure()
  const { doc, setDoc, serverTimestamp } = await import('firebase/firestore')
  // merge:true does a recursive map merge, so a device pushing its state never
  // deletes keys (other weeks' marks/logs, other hangs) it doesn't know about.
  await setDoc(doc(fb.db, 'users', uid), { ...payload, updatedAt: serverTimestamp() }, { merge: true })
}

// Intentional, full delete of the user's cloud document. This is the ONLY path
// that removes cloud data — used by account reset. Because writeRemote merges
// (never deletes keys), a reset that only cleared local would be restored from
// the cloud on the next load; this makes the erase real and server-side.
export async function deleteRemote(uid) {
  const fb = await ensure()
  const { doc, deleteDoc } = await import('firebase/firestore')
  await deleteDoc(doc(fb.db, 'users', uid))
}

export async function subscribeRemote(uid, cb, onGone) {
  const fb = await ensure()
  const { doc, onSnapshot } = await import('firebase/firestore')
  return onSnapshot(doc(fb.db, 'users', uid), (snap) => {
    // Ignore our own not-yet-committed local writes echoing back.
    if (snap.metadata.hasPendingWrites) return
    if (snap.exists()) { cb(snap.data()); return }
    // Doc is gone. Only act on a SERVER-confirmed deletion (not a cold cache
    // miss while offline) — that means the account was reset, possibly on
    // another device, and this device should mirror the wipe.
    if (onGone && !snap.metadata.fromCache) onGone()
  })
}
