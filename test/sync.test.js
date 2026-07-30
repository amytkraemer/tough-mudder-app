import { describe, it, expect } from 'vitest'
import { mergeData } from '../src/lib/sync.js'
import { defaultData } from '../src/lib/storage.js'

const base = () => defaultData()

describe('sync per-key merge (item 4): two devices cannot wipe each other', () => {
  it('two offline edits to DIFFERENT weeks both survive', () => {
    const a = { ...base(), marks: { '1:run': 'done' }, logs: { '1:run': { min: '30' } } }
    const b = { ...base(), marks: { '2:strength': 'done' }, logs: { '2:strength': { ex: { 0: { n: '10' } } } } }
    const merged = mergeData(a, b) // reconnect: remote (b) merged into local (a)
    expect(merged.marks['1:run']).toBe('done')
    expect(merged.marks['2:strength']).toBe('done')
    expect(merged.logs['1:run'].min).toBe('30')
    expect(merged.logs['2:strength'].ex[0].n).toBe('10')
  })

  it('two offline hang entries both survive (merged by id)', () => {
    const a = { ...base(), hangs: { h1: { id: 'h1', date: '2026-09-01', seconds: 40 } } }
    const b = { ...base(), hangs: { h2: { id: 'h2', date: '2026-09-02', seconds: 45 } } }
    const merged = mergeData(a, b)
    expect(Object.keys(merged.hangs).sort()).toEqual(['h1', 'h2'])
    expect(merged.hangs.h1.seconds).toBe(40)
    expect(merged.hangs.h2.seconds).toBe(45)
  })

  it('a legacy array of hangs on either side is normalized and merged, not dropped', () => {
    const a = { ...base(), hangs: [{ id: 'x', date: '2026-09-01', seconds: 30 }] } // old shape
    const b = { ...base(), hangs: { y: { id: 'y', date: '2026-09-02', seconds: 35 } } }
    const merged = mergeData(a, b)
    expect(merged.hangs.x.seconds).toBe(30)
    expect(merged.hangs.y.seconds).toBe(35)
  })

  it('same-key conflict resolves to the NEWER write (LWW), never drops a local-only key', () => {
    const a = { ...base(), marks: { '1:run': 'partial', '3:run': 'done' }, clock: { ...base().clock, marks: { '1:run': 100, '3:run': 100 } } }
    const b = { ...base(), marks: { '1:run': 'done' }, clock: { ...base().clock, marks: { '1:run': 200 } } } // newer
    const merged = mergeData(a, b)
    expect(merged.marks['1:run']).toBe('done') // newer write wins the conflict
    expect(merged.marks['3:run']).toBe('done') // local-only key preserved
  })

  it('merging against no remote just normalizes local (first sign-in with empty cloud)', () => {
    const a = { ...base(), hangs: [{ id: 'z', date: '2026-09-01', seconds: 22 }] }
    const merged = mergeData(a, null)
    expect(merged.hangs.z.seconds).toBe(22)
  })
})
