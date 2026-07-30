import { describe, it, expect } from 'vitest'
import { scaleRun } from '../src/lib/runScaling.js'

describe('run scaling by experience (2.6 verification cases)', () => {
  it('Phase 3 "Long: 4 miles easy" at running regularly -> 6 miles easy', () => {
    expect(scaleRun('Long: 4 miles easy', 'regular', { phaseId: 3 })).toBe('Long: 6 miles easy')
  })

  it('Phase 3 "Hills: 8 x 45 sec" at can run 3+ miles -> 10 x 45 sec', () => {
    expect(scaleRun('Hills: 8 x 45 sec hard uphill, walk down', 'run3', { phaseId: 3 }))
      .toBe('Hills: 10 x 45 sec hard uphill, walk down')
  })

  it('Phase 2 "35 min easy continuous" at running regularly -> 50 min', () => {
    expect(scaleRun('35 min easy continuous', 'regular', { phaseId: 2 })).toBe('50 min easy continuous')
  })

  it('hill reps +4 at regular', () => {
    expect(scaleRun('Hills: 8 x 45 sec hard uphill, walk down', 'regular', { phaseId: 3 }))
      .toBe('Hills: 12 x 45 sec hard uphill, walk down')
  })

  it('running regularly adds a pack note on the Day 1 run from Phase 2 on', () => {
    const out = scaleRun('35 min easy continuous', 'regular', { phaseId: 2, isDay1: true })
    expect(out).toMatch(/10-15 lb pack/)
  })

  it('no pack note on Easy Run 2 (not Day 1)', () => {
    const out = scaleRun('25-30 min easy continuous', 'regular', { phaseId: 3, isDay1: false })
    expect(out).not.toMatch(/pack/)
  })
})

describe('never scale protected sessions', () => {
  it('Phase 1 unchanged', () => {
    const s = '2 min run / 2 min walk x 7'
    expect(scaleRun(s, 'regular', { phaseId: 1 })).toBe(s)
    expect(scaleRun(s, 'run3', { phaseId: 1 })).toBe(s)
  })
  it('Broken 5K unchanged (mile and burpee counts fixed)', () => {
    const s = 'Broken 5K: 1 mi, 20 burpees, 1 mi, 20 burpees, 1 mi'
    expect(scaleRun(s, 'regular', { phaseId: 3 })).toBe(s)
  })
  it('taper and race week unchanged', () => {
    const s = '35 min easy continuous'
    expect(scaleRun(s, 'regular', { phaseId: 4, isTaper: true })).toBe(s)
    expect(scaleRun('RACE WEEK: Mon 20 min easy', 'regular', { phaseId: 4, isRaceWeek: true }))
      .toBe('RACE WEEK: Mon 20 min easy')
  })
  it('none / jog12 leave everything as written', () => {
    const s = 'Long: 4 miles easy'
    expect(scaleRun(s, 'none', { phaseId: 3 })).toBe(s)
    expect(scaleRun(s, 'jog12', { phaseId: 3 })).toBe(s)
  })
})
