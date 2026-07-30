// Verifies against the Firestore emulator that expired-tombstone GC actually
// removes the nested field (setDoc + nested deleteField), while a merge write
// leaves everything else untouched. Run via: npm run test:rules
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import { initializeTestEnvironment, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, deleteField, serverTimestamp } from 'firebase/firestore'

let env
const ALICE = 'alice-uid'

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'tm-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
afterAll(async () => { await env?.cleanup() })
beforeEach(async () => { await env.clearFirestore() })

const dbFor = (uid) => env.authenticatedContext(uid).firestore()

describe('tombstone GC — nested deleteField prunes cloud tombstones', () => {
  it('removes an expired tombstone key but keeps live data and other tombstones', async () => {
    const db = dbFor(ALICE)
    const ref = doc(db, 'users', ALICE)
    await assertSucceeds(setDoc(ref, {
      marks: { '1:run': 'done' },
      tombstones: { hangs: { old: 111, recent: 222 }, marks: {} },
    }))

    // GC write: a normal merge payload PLUS a nested deleteField for the stale key.
    await assertSucceeds(setDoc(ref, {
      marks: { '2:run': 'done' },
      updatedAt: serverTimestamp(),
      tombstones: { hangs: { old: deleteField() } },
    }, { merge: true }))

    const snap = await getDoc(ref)
    const data = snap.data()
    expect(data.tombstones.hangs.old).toBeUndefined()   // stale tombstone pruned
    expect(data.tombstones.hangs.recent).toBe(222)      // recent one kept
    expect(data.marks['1:run']).toBe('done')            // pre-existing live data kept
    expect(data.marks['2:run']).toBe('done')            // merge write applied
  })
})
