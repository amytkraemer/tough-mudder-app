import { describe, it, expect, beforeEach } from 'vitest'
import { importJSON, loadData, migrate } from '../src/lib/storage.js'
import { mergeData } from '../src/lib/sync.js'

// A backup exported BEFORE the bonus->extra + hangs-array->object migration.
const OLD_EXPORT = {
  version: 1,
  settings: { onboarded: true, raceDate: '2027-06-26', runningBase: 'none', daysPerWeek: 4 },
  marks: { '1:run': 'done' },
  logs: { '1:run': { min: '30' } },
  bonus: { 5: [{ id: 'bonus-strength-1', kind: 'strength', n: 1 }] },
  hangs: [
    { id: 'a', date: '2026-08-22', seconds: 24, grip: 'Bar' },
    { id: 'b', date: '2026-09-05', seconds: 33, grip: 'Bar' },
  ],
}

describe('import across the bonus->extra rename (item 5)', () => {
  it('a pre-rename exported JSON imports with bonus->extra and hangs->object, no loss', () => {
    const data = importJSON(JSON.stringify(OLD_EXPORT))
    expect(data.bonus).toBeUndefined()
    expect(data.extra[5]).toHaveLength(1)
    expect(data.extra[5][0].kind).toBe('strength')
    // hangs became an id-keyed object with every entry preserved
    expect(Array.isArray(data.hangs)).toBe(false)
    expect(Object.keys(data.hangs).sort()).toEqual(['a', 'b'])
    expect(data.hangs.a.seconds).toBe(24)
    expect(data.version).toBe(2)
  })

  it('a Firestore doc still in the OLD shape merges correctly (bonus + array hangs)', () => {
    const local = migrate({}) // fresh signed-in device, current shape
    const oldRemote = {
      settings: { onboarded: true, raceDate: '2027-06-26', runningBase: 'none', daysPerWeek: 4 },
      marks: { '2:strength': 'done' },
      bonus: { 3: [{ id: 'bonus-run-1', kind: 'run', n: 1 }] },
      hangs: [{ id: 'r1', date: '2026-10-01', seconds: 50 }],
    }
    const merged = mergeData(local, oldRemote)
    expect(merged.extra[3][0].kind).toBe('run')   // bonus migrated to extra
    expect(merged.marks['2:strength']).toBe('done')
    expect(merged.hangs.r1.seconds).toBe(50)      // array hang preserved
    expect(merged.bonus).toBeUndefined()
  })
})

describe('migration writes back so it does not re-run every load (item 5)', () => {
  beforeEach(() => {
    const store = {}
    globalThis.localStorage = {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v) },
      removeItem: (k) => { delete store[k] },
    }
  })

  it('loadData persists the migrated shape once', () => {
    localStorage.setItem('tm.data.v1', JSON.stringify(OLD_EXPORT))
    const loaded = loadData()
    expect(loaded.version).toBe(2)

    // what is now on disk should already be migrated (no bonus, hangs object, v2)
    const onDisk = JSON.parse(localStorage.getItem('tm.data.v1'))
    expect(onDisk.version).toBe(2)
    expect('bonus' in onDisk).toBe(false)
    expect(Array.isArray(onDisk.hangs)).toBe(false)
    expect(onDisk.extra[5]).toHaveLength(1)

    // a second load sees already-current data and needs no further migration
    const before = localStorage.getItem('tm.data.v1')
    loadData()
    expect(localStorage.getItem('tm.data.v1')).toBe(before)
  })
})
