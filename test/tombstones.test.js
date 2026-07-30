import { describe, it, expect } from 'vitest'
import { mergeData } from '../src/lib/sync.js'
import { defaultData } from '../src/lib/storage.js'
import {
  mergeStates, stamp, tomb, importInto, normalizeMeta, staleTombstonePaths,
  TOMBSTONE_TTL_MS,
} from '../src/lib/lww.js'

// Merge/prune uses Date.now(), so timestamps must be recent (inside the TTL)
// or normalizeMeta would GC them before the merge even runs.
const T = Date.now()
const state = (over = {}) => ({ ...defaultData(), ...over })
const clk = (field, map) => ({ ...defaultData().clock, [field]: map })
const tmb = (field, map) => ({ ...defaultData().tombstones, [field]: map })

describe('deletion tracking — a delete on device A stays gone on device B', () => {
  it('un-checking a session sticks: the deletion beats B\'s stale copy', () => {
    // Device A un-checked the mark (recent tombstone); device B still shows the
    // older live copy. After they sync it stays gone.
    const deviceA = state({ marks: {}, tombstones: tmb('marks', { '5:run': T - 1000 }) })
    const deviceB = state({ marks: { '5:run': 'done' }, clock: clk('marks', { '5:run': T - 5000 }) })
    const merged = mergeData(deviceA, deviceB)
    expect(merged.marks['5:run']).toBeUndefined()
    expect(merged.tombstones.marks['5:run']).toBe(T - 1000)
  })

  it('removing an extra session sticks across a sync', () => {
    const deviceA = state({ extra: {}, tombstones: tmb('extra', { '3:extra-run-1': T - 1000 }) })
    const deviceB = state({ extra: { 3: [{ id: 'extra-run-1', kind: 'run', n: 1 }] }, clock: clk('extra', { '3:extra-run-1': T - 5000 }) })
    const merged = mergeData(deviceA, deviceB)
    expect(merged.extra['3']).toBeUndefined()
  })

  it('deleting a hang sticks across a sync', () => {
    const deviceA = state({ hangs: {}, tombstones: tmb('hangs', { h1: T - 1000 }) })
    const deviceB = state({ hangs: { h1: { id: 'h1', seconds: 40 } }, clock: clk('hangs', { h1: T - 5000 }) })
    const merged = mergeData(deviceA, deviceB)
    expect(merged.hangs.h1).toBeUndefined()
  })
})

describe('LWW ordering both directions', () => {
  it('a deletion beats an OLDER version of the item', () => {
    const merged = mergeData(
      state({ marks: {}, tombstones: tmb('marks', { k: T - 1000 }) }),         // delete newer
      state({ marks: { k: 'done' }, clock: clk('marks', { k: T - 5000 }) }),   // edit older
    )
    expect(merged.marks.k).toBeUndefined()
    expect(merged.tombstones.marks.k).toBe(T - 1000)
  })

  it('a newer edit beats an OLDER deletion (item comes back)', () => {
    const merged = mergeData(
      state({ marks: { k: 'done' }, clock: clk('marks', { k: T - 1000 }) }),   // edit newer
      state({ marks: {}, tombstones: tmb('marks', { k: T - 5000 }) }),         // delete older
    )
    expect(merged.marks.k).toBe('done')
    expect(merged.tombstones.marks.k).toBeUndefined()
  })
})

describe('mutation helpers stamp/tomb', () => {
  it('stamp sets a clock and clears any prior tombstone; tomb does the reverse', () => {
    const d = defaultData()
    tomb(d, 'hangs', 'h1', 100)
    expect(d.tombstones.hangs.h1).toBe(100)
    expect(d.clock.hangs.h1).toBeUndefined()
    // a later re-add of the same id must clear the tombstone so it wins
    stamp(d, 'hangs', 'h1', 200)
    expect(d.clock.hangs.h1).toBe(200)
    expect(d.tombstones.hangs.h1).toBeUndefined()
  })
})

describe('tombstone cleanup after the TTL window', () => {
  it('normalizeMeta drops tombstones older than the TTL and keeps recent ones', () => {
    const now = 1_000_000_000_000
    const d = defaultData()
    d.tombstones.marks = { old: now - TOMBSTONE_TTL_MS - 1, recent: now - 1000 }
    normalizeMeta(d, now)
    expect(d.tombstones.marks.old).toBeUndefined()
    expect(d.tombstones.marks.recent).toBe(now - 1000)
  })

  it('staleTombstonePaths reports cloud field paths to delete', () => {
    const now = 1_000_000_000_000
    const tombstones = { ...defaultData().tombstones, hangs: { h1: now - TOMBSTONE_TTL_MS - 1, h2: now - 5 } }
    expect(staleTombstonePaths(tombstones, now)).toEqual(['tombstones.hangs.h1'])
  })
})

describe('Import JSON under LWW', () => {
  it('importing an older/smaller backup does NOT silently re-add the entries it omits', () => {
    // Current (cloud-synced) state has three marks and two hangs.
    const current = state({
      marks: { '1:run': 'done', '2:run': 'done', '3:run': 'done' },
      hangs: { h1: { id: 'h1', seconds: 40 }, h2: { id: 'h2', seconds: 50 } },
    })
    normalizeMeta(current, T - 100000) // existing items get (recent) legacy clocks
    // An OLD backup that only knows about a subset.
    const backup = state({ marks: { '1:run': 'done' }, hangs: { h1: { id: 'h1', seconds: 40 } } })
    const imported = importInto(current, backup, T)
    // present in the backup -> kept
    expect(imported.marks['1:run']).toBe('done')
    expect(imported.hangs.h1).toBeTruthy()
    // omitted by the backup -> tombstoned now, so a later cloud merge can't re-add
    expect(imported.marks['2:run']).toBeUndefined()
    expect(imported.marks['3:run']).toBeUndefined()
    expect(imported.hangs.h2).toBeUndefined()
    expect(imported.tombstones.marks['2:run']).toBe(T)

    // Prove it against a stale cloud copy that still has everything:
    const cloud = state({
      marks: { '1:run': 'done', '2:run': 'done', '3:run': 'done' },
      hangs: { h1: { id: 'h1', seconds: 40 }, h2: { id: 'h2', seconds: 50 } },
    })
    normalizeMeta(cloud, T - 100000)
    const afterSync = mergeData({ ...imported, version: 2 }, cloud)
    expect(afterSync.marks['2:run']).toBeUndefined() // stays gone
    expect(afterSync.marks['3:run']).toBeUndefined()
    expect(afterSync.hangs.h2).toBeUndefined()
    expect(afterSync.marks['1:run']).toBe('done')    // kept
  })
})
