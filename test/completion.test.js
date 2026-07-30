import { describe, it, expect } from 'vitest'
import { buildSchedule } from '../src/lib/schedule.js'
import { computeStats } from '../src/lib/stats.js'

const TODAY = new Date('2027-01-01T12:00:00Z')
const sched = (days, base = 'regular') =>
  buildSchedule({ raceDate: '2027-06-26', runningBase: base, daysPerWeek: days, startDate: '2026-08-03', today: TODAY })

const markCore = (weeks) => {
  const m = {}
  for (const w of weeks) for (const s of ['run', 'strength', 'circuit']) m[`${w.week}:${s}`] = 'done'
  return m
}
const markOverlays = (weeks, m) => {
  for (const w of weeks) for (const o of w.overlays || []) m[`${w.week}:${o.key}`] = 'done'
  return m
}

describe('core vs plan completion by days-per-week (item 2)', () => {
  for (const days of [3, 4, 5, 6]) {
    it(`${days} days: core = 100% when the spine is done; plan reflects overlays`, () => {
      const s = sched(days)
      const marks = markCore(s.weeks)
      const st = computeStats({ weeks: s.weeks, marks, extra: {}, today: TODAY })

      // spine done -> core is 100%
      expect(st.core.rate).toBe(1)
      // neither can exceed 100%
      expect(st.core.rate).toBeLessThanOrEqual(1)
      expect(st.plan.rate).toBeLessThanOrEqual(1)

      // with overlays skipped, plan completion drops below 100% for 4/5/6 days
      const overlaysPerWeek = days - 3
      const expectedPlan = 3 / (3 + overlaysPerWeek)
      expect(st.plan.rate).toBeCloseTo(expectedPlan, 5)
      if (days === 3) expect(st.plan.rate).toBe(1)
      else expect(st.plan.rate).toBeLessThan(1)

      // completing the overlays too brings plan to 100%
      markOverlays(s.weeks, marks)
      const st2 = computeStats({ weeks: s.weeks, marks, extra: {}, today: TODAY })
      expect(st2.plan.rate).toBe(1)
      expect(st2.core.rate).toBe(1)
    })
  }

  it('the reported bug: 6-day user who skips every overlay is NOT 100% plan-complete', () => {
    const s = sched(6)
    const marks = markCore(s.weeks) // all core, zero overlays
    const st = computeStats({ weeks: s.weeks, marks, extra: {}, today: TODAY })
    expect(st.core.rate).toBe(1)          // spine perfect
    expect(st.plan.rate).toBeCloseTo(0.5) // but half the chosen plan was skipped
  })

  it('core denominator is the fixed 3-day spine (3 * weeks, = 141 standard)', () => {
    const s = sched(3, 'none') // standard 47-week plan
    expect(s.totalWeeks).toBe(47)
    const st = computeStats({ weeks: s.weeks, marks: {}, extra: {}, today: TODAY })
    expect(st.core.total).toBe(141)
    // plan total scales with days-per-week (overlays added)
    const s6 = sched(6)
    const st6 = computeStats({ weeks: s6.weeks, marks: {}, extra: {}, today: TODAY })
    expect(st6.plan.total).toBeGreaterThan(st6.core.total)
  })

  it('supplemental extras count separately and never enter completion', () => {
    const s = sched(6)
    const marks = markCore(s.weeks); markOverlays(s.weeks, marks)
    const extra = { 5: [{ id: 'extra-grip-ladder-1', kind: 'strength', n: 1, preset: 'grip-ladder' }] }
    marks['5:extra-grip-ladder-1'] = 'done'
    const st = computeStats({ weeks: s.weeks, marks, extra, today: TODAY })
    expect(st.plan.rate).toBe(1)              // fully complete, extra doesn't push over 100
    expect(st.plan.rate).toBeLessThanOrEqual(1)
    expect(st.extras.done).toBe(1)
    expect(st.extras.total).toBe(1)
  })

  it('marking future weeks never pushes either rate over 100%', () => {
    const s = sched(6)
    const marks = {}
    for (const w of s.weeks) {
      for (const x of ['run', 'strength', 'circuit']) marks[`${w.week}:${x}`] = 'done'
      for (const o of w.overlays) marks[`${w.week}:${o.key}`] = 'done'
    }
    const st = computeStats({ weeks: s.weeks, marks, extra: {}, today: TODAY })
    expect(st.core.rate).toBeLessThanOrEqual(1)
    expect(st.plan.rate).toBeLessThanOrEqual(1)
  })
})
