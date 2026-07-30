// Account-isolation rules test — runs against the Firestore emulator so it can
// exercise AUTHENTICATED cross-user access, not just the signed-out case.
// Run via: npm run test:rules  (wraps this in `firebase emulators:exec`).
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'
import {
  initializeTestEnvironment, assertFails, assertSucceeds,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'

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

describe('Firestore rules — account isolation', () => {
  it('a signed-in user CAN read and write their OWN doc', async () => {
    const alice = dbFor(ALICE)
    await assertSucceeds(setDoc(doc(alice, 'users', ALICE), { marks: { '1:run': 'done' } }))
    await assertSucceeds(getDoc(doc(alice, 'users', ALICE)))
  })

  it('a signed-in user CANNOT read another user’s doc', async () => {
    // seed Bob's doc with rules bypassed (as the owner would have)
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', BOB), { secret: 'bob-data' })
    })
    const alice = dbFor(ALICE)
    await assertFails(getDoc(doc(alice, 'users', BOB)))
  })

  it('a signed-in user CANNOT write another user’s doc', async () => {
    const alice = dbFor(ALICE)
    await assertFails(setDoc(doc(alice, 'users', BOB), { evil: true }))
  })

  it('an unauthenticated user is denied read and write', async () => {
    const anon = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(anon, 'users', ALICE)))
    await assertFails(setDoc(doc(anon, 'users', ALICE), { x: 1 }))
  })
})
