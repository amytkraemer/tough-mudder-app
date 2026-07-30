// Account-reset rules test — verifies against the Firestore emulator that an
// intentional reset can actually DELETE the user's document server-side, and
// that a second device reading afterward finds nothing to restore.
// Run via: npm run test:rules
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'

let env
const ALICE = 'alice-uid'
const BOB = 'bob-uid'

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'tm-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
afterAll(async () => { await env?.cleanup() })
beforeEach(async () => { await env.clearFirestore() })

const dbFor = (uid) => env.authenticatedContext(uid).firestore()

describe('account reset — cloud delete is real and propagates', () => {
  it('a user can DELETE their own doc, and a later read finds it gone', async () => {
    const alice = dbFor(ALICE)
    await assertSucceeds(setDoc(doc(alice, 'users', ALICE), {
      settings: { onboarded: true, daysPerWeek: 4 },
      marks: { '1:run': 'done', '3:strength': 'done' },
      hangs: { h1: { id: 'h1', seconds: 42 } },
    }))

    // Reset: delete the cloud document.
    await assertSucceeds(deleteDoc(doc(alice, 'users', ALICE)))

    // A second device (same account) refreshes and fetches the doc: it's gone,
    // so there is nothing to restore — the empty state stands.
    const secondDevice = dbFor(ALICE)
    const snap = await assertSucceeds(getDoc(doc(secondDevice, 'users', ALICE)))
    expect(snap.exists()).toBe(false)
  })

  it('a user cannot delete ANOTHER user\'s doc (guard/isolation intact)', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', BOB), { marks: { '1:run': 'done' } })
    })
    const alice = dbFor(ALICE)
    await assertFails(deleteDoc(doc(alice, 'users', BOB)))
  })
})
