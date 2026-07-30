import { describe, it, expect } from 'vitest'
import { buildSchedule } from '../src/lib/schedule.js'
import { computeStats } from '../src/lib/stats.js'

const opts = (over = {}) => ({ raceDate: '2027-06-26', runningBase: 'none', startDate: '2026-08-03', today: new Date('2027-01-01T12:00:00Z'), ...over })
const overlayTypes = (week) => (week.overlays || []).map((o) => o.type)

describe('overlay days switch on/off with days-per-week (2.1)', () => {
  it('3 days = no overlays', () => {
    const s = buildSchedule(opts({ daysPerWeek: 3 }))
    expect(s.weeks.every((w) => (w.overlays || []).length === 0)).toBe(true)
  })
  it('4 days adds Grip & Pull only', () => {
    const w = buildSchedule(opts({ daysPerWeek: 4, runningBase: 'regular' })).weeks[20]
    expect(overlayTypes(w)).toEqual(['grip'])
  })
  it('5 days adds Easy Run 2 (non-beginner)', () => {
    const w = buildSchedule(opts({ daysPerWeek: 5, runningBase: 'regular' })).weeks[20]
    expect(overlayTypes(w)).toEqual(['grip', 'run2'])
  })
  it('6 days adds Mobility & Carry, in fixed order', () => {
    const w = buildSchedule(opts({ daysPerWeek: 6, runningBase: 'regular' })).weeks[20]
    expect(overlayTypes(w)).toEqual(['grip', 'run2', 'mobility'])
  })
})

describe('beginner safety gate (2.1)', () => {
  it('not-running: Easy Run 2 is locked before week 5, substituted by Mobility', () => {
    const s = buildSchedule(opts({ daysPerWeek: 5, runningBase: 'none' }))
    expect(overlayTypes(s.weeks[0])).toEqual(['grip', 'mobility']) // week 1
    expect(overlayTypes(s.weeks[3])).toEqual(['grip', 'mobility']) // week 4
  })
  it('not-running: Easy Run 2 unlocks at week 5', () => {
    const s = buildSchedule(opts({ daysPerWeek: 5, runningBase: 'none' }))
    expect(overlayTypes(s.weeks[4])).toEqual(['grip', 'run2']) // week 5
  })
  it('running regularly has no gate', () => {
    const s = buildSchedule(opts({ daysPerWeek: 5, runningBase: 'regular' }))
    expect(overlayTypes(s.weeks[0])).toEqual(['grip', 'run2'])
  })
})

describe('overlays never alter the core plan or phases', () => {
  it('Run 1 / Strength / Circuit and phases are identical at 3 vs 6 days', () => {
    const a = buildSchedule(opts({ daysPerWeek: 3 }))
    const b = buildSchedule(opts({ daysPerWeek: 6 }))
    expect(a.totalWeeks).toBe(b.totalWeeks)
    for (let i = 0; i < a.weeks.length; i++) {
      expect(a.weeks[i].run).toBe(b.weeks[i].run)
      expect(a.weeks[i].strength.label).toBe(b.weeks[i].strength.label)
      expect(a.weeks[i].circuit.label).toBe(b.weeks[i].circuit.label)
      expect(a.weeks[i].phaseId).toBe(b.weeks[i].phaseId)
    }
    expect(a.layout).toEqual(b.layout)
  })
})

describe('Grip & Pull progresses by set count and tapers', () => {
  const grip = (w) => w.overlays.find((o) => o.type === 'grip').content
  it('Phase 1 = 2 sets, Phase 2 = 3, Phase 3 = 4 with negative pull-ups', () => {
    const s = buildSchedule(opts({ daysPerWeek: 4, runningBase: 'regular' }))
    expect(grip(s.weeks[0]).scheme).toMatch(/2 set/)   // phase 1
    expect(grip(s.weeks[10]).scheme).toMatch(/3 set/)  // phase 2
    expect(grip(s.weeks[24]).scheme).toMatch(/4 set/)  // phase 3
    expect(grip(s.weeks[24]).exercises.some((e) => /Negative pull-ups/.test(e))).toBe(true)
  })
  it('final 2 weeks drop to 2 sets', () => {
    const s = buildSchedule(opts({ daysPerWeek: 4, runningBase: 'regular' }))
    expect(grip(s.weeks[s.weeks.length - 1]).scheme).toMatch(/2 set/)
    expect(grip(s.weeks[s.weeks.length - 2]).scheme).toMatch(/2 set/)
  })
})

describe('completion rate stays <= 100% with overlays and extras marked', () => {
  it('marking every core + overlay + extra done never exceeds 100%', () => {
    const s = buildSchedule(opts({ daysPerWeek: 6, runningBase: 'regular' }))
    const marks = {}
    for (const w of s.weeks) {
      for (const k of ['run', 'strength', 'circuit']) marks[`${w.week}:${k}`] = 'done'
      for (const o of w.overlays) marks[`${w.week}:${o.key}`] = 'done'
      marks[`${w.week}:extra-strength-1`] = 'done'
    }
    const stats = computeStats({ weeks: s.weeks, marks, today: new Date('2027-06-26T12:00:00Z') })
    expect(stats.completionRate).toBeLessThanOrEqual(1)
    expect(stats.completed).toBeLessThanOrEqual(stats.scheduledToDate)
  })
})
