import { describe, it, expect } from 'vitest'
import { parseRun } from '../src/lib/runIntervals.js'

const labels = (r) => r.intervals.map((p) => p.label)

describe('run interval parser', () => {
  it('parses run/walk intervals with warm-up and cool-down', () => {
    const r = parseRun('2 min run / 2 min walk x 7')
    expect(r).not.toBeNull()
    // warm-up + 7*(run+walk) + cool-down = 16 phases
    expect(r.intervals.length).toBe(16)
    expect(r.intervals[0].label).toBe('Warm-up walk')
    expect(r.intervals[r.intervals.length - 1].label).toBe('Cool-down walk')
  })

  it('keeps the incline segment for mid-run incline runs (1.7)', () => {
    const r = parseRun('30-35 min easy, plus 5 min at 4% incline mid-run')
    expect(r).not.toBeNull()
    const inc = r.intervals.find((p) => p.kind === 'incline')
    expect(inc).toBeTruthy()
    expect(inc.label).toMatch(/4%/)
    expect(inc.sec).toBe(300) // 5 min incline
    // easy / incline / easy between the walks
    expect(labels(r).filter((l) => l === 'Easy').length).toBe(2)
  })

  it('parses incline intervals and shows the grade', () => {
    const r = parseRun('Incline intervals: 3 min at 6-8% / 3 min flat, x 6')
    expect(r.intervals.some((p) => p.kind === 'incline' && /6-8%/.test(p.label))).toBe(true)
  })

  it('parses hill repeats', () => {
    const r = parseRun('Hills: 8 x 45 sec hard uphill, walk down')
    expect(r.intervals.filter((p) => p.kind === 'hard').length).toBe(8)
  })

  it('returns null for distance / free-form runs', () => {
    expect(parseRun('3.5 miles easy')).toBeNull()
    expect(parseRun('Broken 5K: 1 mi, 20 burpees, 1 mi')).toBeNull()
  })
})
