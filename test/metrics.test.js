import { describe, it, expect } from 'vitest'
import { buildSchedule } from '../src/lib/schedule.js'
import { computeStats } from '../src/lib/stats.js'
import { buildLogIndex, prevFor, currentStreak } from '../src/lib/metrics.js'

const sched = buildSchedule({ raceDate: '2027-06-26', runningBase: 'none', startDate: '2026-08-03', today: new Date('2027-01-01T12:00:00Z') })
const weeks = sched.weeks

describe('completion rate can never exceed 100%', () => {
  it('marking every session (including future) done stays <= 100%', () => {
    const marks = {}
    for (const w of weeks) for (const s of ['run', 'strength', 'circuit']) marks[`${w.week}:${s}`] = 'done'
    const stats = computeStats({ weeks, marks, today: new Date('2027-01-01T12:00:00Z') })
    expect(stats.completionRate).toBeLessThanOrEqual(1)
    expect(stats.completed).toBeLessThanOrEqual(stats.scheduledToDate)
  })

  it('extra sessions never enter the denominator or push rate over 100%', () => {
    const marks = {}
    // complete all arrived core sessions
    for (const w of weeks) if (w.mondayNum <= sched.weeks[sched.currentIndex].mondayNum) {
      for (const s of ['run', 'strength', 'circuit']) marks[`${w.week}:${s}`] = 'done'
    }
    // plus a pile of completed EXTRA sessions (non-core keys)
    for (let i = 0; i < 20; i++) marks[`3:extra-strength-${i}`] = 'done'
    const stats = computeStats({ weeks, marks, today: new Date('2027-01-01T12:00:00Z') })
    expect(stats.completionRate).toBeLessThanOrEqual(1)
  })

  it('rate is 0 with no marks', () => {
    const stats = computeStats({ weeks, marks: {}, today: new Date('2027-01-01T12:00:00Z') })
    expect(stats.completionRate).toBe(0)
  })
})

describe('log index + previous-value lookup', () => {
  const logs = {
    '12:strength': { ex: { 0: { n: '10', w: '30' } } },
    '14:strength': { ex: { 0: { n: '10', w: '35' } } },
    '13:run': { min: '32', mi: '3.2' },
  }
  const idx = buildLogIndex(weeks, logs, {})

  it('finds the most recent prior strength value by movement', () => {
    const prev = prevFor(idx, 16, 'strength', weeks[15])
    // week 16 is Strength B; index 0 is "Rows"; last logged was week 14 @ 35lb
    expect(prev.ex[0]).toMatchObject({ w: '35', week: 14 })
  })

  it('includes extra-session logs in the index', () => {
    const bonus = { 15: [{ id: 'extra-run-1', kind: 'run', n: 1 }] }
    const logs2 = { ...logs, '15:extra-run-1': { min: '25', mi: '2.5' } }
    const idx2 = buildLogIndex(weeks, logs2, bonus)
    const prev = prevFor(idx2, 16, 'run', weeks[15])
    expect(prev).toMatchObject({ mi: '2.5', week: 15 })
  })
})

describe('currentStreak', () => {
  it('counts consecutive recent weeks with a completion', () => {
    const marks = {}
    for (const wk of [1, 2, 3, 4, 5]) marks[`${wk}:strength`] = 'done'
    // currentIndex ~ week for 2027-01-01; give it a run of completions ending at current
    const ci = sched.currentIndex
    for (let i = ci; i > ci - 3 && i >= 0; i--) marks[`${weeks[i].week}:run`] = 'done'
    const streak = currentStreak(weeks, marks, ci)
    expect(streak).toBeGreaterThanOrEqual(3)
  })
})
