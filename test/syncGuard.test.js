import { describe, it, expect } from 'vitest'
import { mergeData, isReady, canPush } from '../src/lib/sync.js'
import { defaultData } from '../src/lib/storage.js'

// A populated cloud document for a returning user (already onboarded, with real
// progress). This is what should be in Firestore for someone who trained on
// another device.
const CLOUD = {
  version: 2,
  settings: { onboarded: true, raceDate: '2027-06-26', runningBase: 'some', daysPerWeek: 4, startDate: '2026-08-01' },
  marks: { '1:run': 'done', '3:strength': 'done' },
  logs: { '1:run': { min: '31', mi: '2.1' } },
  extra: { 5: [{ id: 'extra-strength-1', kind: 'strength', n: 1 }] },
  hangs: { h1: { id: 'h1', date: '2026-08-22', seconds: 42, grip: 'Bar' } },
}

describe('load ordering — decide onboarding only after cloud loads (item: fix ordering)', () => {
  it('is NOT ready until auth resolves AND (when signed in) the cloud doc is hydrated', () => {
    // firebase enabled, nothing resolved yet -> loading, never onboarding
    expect(isReady({ enabled: true, authResolved: false, hydrated: false })).toBe(false)
    // auth resolved but doc not fetched yet -> still loading
    expect(isReady({ enabled: true, authResolved: true, hydrated: false })).toBe(false)
    // both done -> ready to decide
    expect(isReady({ enabled: true, authResolved: true, hydrated: true })).toBe(true)
    // cloud disabled -> local is source of truth, ready immediately
    expect(isReady({ enabled: false, authResolved: false, hydrated: false })).toBe(true)
  })
})

describe('signed-in user WITH cloud data, empty local -> loads cloud, no onboarding', () => {
  it('merging empty local with a populated cloud doc adopts the cloud plan and progress', () => {
    const merged = mergeData(defaultData(), CLOUD)
    expect(merged.settings.onboarded).toBe(true)          // will NOT show onboarding
    expect(merged.settings.daysPerWeek).toBe(4)           // real plan restored
    expect(merged.marks['1:run']).toBe('done')            // progress intact
    expect(merged.marks['3:strength']).toBe('done')
    expect(merged.logs['1:run'].min).toBe('31')
    expect(merged.extra[5]).toHaveLength(1)
    expect(merged.hangs.h1.seconds).toBe(42)
  })
})

describe('fresh account, NO cloud data -> onboarding shows', () => {
  it('merging empty local with no remote stays un-onboarded', () => {
    const merged = mergeData(defaultData(), null)
    expect(merged.settings.onboarded).toBe(false)         // onboarding will show
  })
})

describe('DATA GUARD — empty local can never overwrite a populated cloud doc', () => {
  it('a write is blocked until THIS user\'s cloud doc has been fetched & merged', () => {
    const uid = 'user-abc'
    // Before hydration (hydratedUid null / different) the push is forbidden.
    expect(canPush({ uid, hydratedUid: null })).toBe(false)
    expect(canPush({ uid, hydratedUid: 'someone-else' })).toBe(false)
    // Only after we've read this user's doc do writes open up.
    expect(canPush({ uid, hydratedUid: uid })).toBe(true)
    // No user -> never push.
    expect(canPush({ uid: null, hydratedUid: null })).toBe(false)
  })

  it('the value that eventually gets written (pick of the merge) still contains all cloud data', () => {
    // Even once the gate opens, what we write is the MERGE of empty-local + cloud,
    // which retains every cloud key — so cloud data cannot be lost.
    const merged = mergeData(defaultData(), CLOUD)
    expect(Object.keys(merged.marks).sort()).toEqual(['1:run', '3:strength'])
    expect(merged.hangs.h1).toBeTruthy()
    expect(merged.settings.onboarded).toBe(true)
  })
})

describe('marking a session survives a reload in a different browser', () => {
  it('a mark made on device A appears after signing in on empty device B', () => {
    // Device A logged a session; that reached Firestore as CLOUD.
    // Device B is a fresh browser (empty local) that signs in.
    const deviceB = mergeData(defaultData(), CLOUD)
    expect(deviceB.marks['3:strength']).toBe('done')
    expect(deviceB.settings.onboarded).toBe(true)
  })
})
