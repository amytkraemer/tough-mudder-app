import { describe, it, expect, vi } from 'vitest'
import { performReset, mergeData, canPush } from '../src/lib/sync.js'
import { defaultData } from '../src/lib/storage.js'

describe('account reset ordering — cloud delete must confirm before local clears', () => {
  it('signed in: deletes the cloud doc, THEN clears local', async () => {
    const calls = []
    const deleteRemote = vi.fn(async () => { calls.push('delete') })
    const clearLocal = vi.fn(() => { calls.push('clear') })
    await performReset({ uid: 'user-a', deleteRemote, clearLocal })
    expect(deleteRemote).toHaveBeenCalledWith('user-a')
    expect(clearLocal).toHaveBeenCalledTimes(1)
    expect(calls).toEqual(['delete', 'clear'])   // delete is confirmed first
  })

  it('a FAILED cloud delete leaves local intact and surfaces the error', async () => {
    const deleteRemote = vi.fn(async () => { throw new Error('offline') })
    const clearLocal = vi.fn()
    await expect(performReset({ uid: 'user-a', deleteRemote, clearLocal })).rejects.toThrow('offline')
    expect(clearLocal).not.toHaveBeenCalled()   // never wipe local when cloud still holds data
  })

  it('signed out: no cloud doc to delete, just clears local', async () => {
    const deleteRemote = vi.fn()
    const clearLocal = vi.fn()
    await performReset({ uid: null, deleteRemote, clearLocal })
    expect(deleteRemote).not.toHaveBeenCalled()
    expect(clearLocal).toHaveBeenCalledTimes(1)
  })
})

describe('after reset, a second device does not restore the old data', () => {
  it('a device that loads a DELETED cloud doc (fetch -> null) gets a clean slate', () => {
    // deleteRemote removed users/{uid}; a second device now fetches null.
    const merged = mergeData(defaultData(), null)
    expect(merged.settings.onboarded).toBe(false)      // onboarding, not restored data
    expect(Object.keys(merged.marks)).toHaveLength(0)
    expect(Object.keys(merged.hangs)).toHaveLength(0)
  })
})

describe('the empty-local-can\'t-overwrite guard still holds for normal sign-ins', () => {
  it('a fresh device may not push until it has hydrated THIS user\'s cloud doc', () => {
    expect(canPush({ uid: 'u', hydratedUid: null })).toBe(false)        // fresh sign-in, pre-fetch
    expect(canPush({ uid: 'u', hydratedUid: 'other' })).toBe(false)     // different user's data loaded
    expect(canPush({ uid: 'u', hydratedUid: 'u' })).toBe(true)          // only after reading own doc
  })

  it('reset does not weaken the merge: a real cloud doc still wins over empty local', () => {
    const cloud = { settings: { onboarded: true, daysPerWeek: 5 }, marks: { '2:run': 'done' }, hangs: { h: { id: 'h', seconds: 30 } } }
    const merged = mergeData(defaultData(), cloud)
    expect(merged.settings.onboarded).toBe(true)
    expect(merged.marks['2:run']).toBe('done')
    expect(merged.hangs.h.seconds).toBe(30)
  })
})
