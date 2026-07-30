import { describe, it, expect } from 'vitest'
import { buildSchedule, RUNNING_BASE, utcYmd } from '../src/lib/schedule.js'

const DEFAULT = { raceDate: '2027-06-26', runningBase: 'none', daysPerWeek: 3 }

function phaseCounts(weeks) {
  const c = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const w of weeks) c[w.phaseId]++
  return c
}

describe('default schedule', () => {
  const s = buildSchedule({ ...DEFAULT, today: new Date('2026-07-01T12:00:00Z') })

  it('is 47 weeks, starts Aug 3 2026, week 47 is race week', () => {
    expect(s.totalWeeks).toBe(47)
    expect(s.startDate).toBe('2026-08-03')
    expect(s.weeks[0].mondayYmd).toBe('2026-08-03')
    expect(s.weeks[46].isRaceWeek).toBe(true)
    // race week Monday is the Monday of the week containing June 26 2027
    expect(s.weeks[46].mondayYmd).toBe('2027-06-21')
  })

  it('has phases 10 / 14 / 14 / 9', () => {
    expect(phaseCounts(s.weeks)).toEqual({ 1: 10, 2: 14, 3: 14, 4: 9 })
    expect(s.layout).toMatchObject({ P1: 10, P2: 14, P3: 14, terrain: 7, taper: 2 })
  })

  it('week dates match the source tracker', () => {
    expect(s.weeks[10].mondayYmd).toBe('2026-10-12') // week 11 -> Strength Build
    expect(s.weeks[10].phaseId).toBe(2)
    expect(s.weeks[24].mondayYmd).toBe('2027-01-18') // week 25 -> Race Specific
    expect(s.weeks[24].phaseId).toBe(3)
  })
})

describe('running-base skips', () => {
  for (const [key, { skip }] of Object.entries(RUNNING_BASE)) {
    it(`${key} (skip ${skip}) yields a valid 47-week plan landing on race week`, () => {
      const s = buildSchedule({ ...DEFAULT, runningBase: key, today: new Date('2026-07-01T12:00:00Z') })
      // still ends on the same race week
      expect(s.weeks[s.weeks.length - 1].mondayYmd).toBe('2027-06-21')
      expect(s.weeks[s.weeks.length - 1].isRaceWeek).toBe(true)
      // every phase present and positive
      const c = phaseCounts(s.weeks)
      expect(c[1]).toBeGreaterThan(0)
      expect(c[2]).toBeGreaterThan(0)
      expect(c[3]).toBeGreaterThan(0)
      expect(c[4]).toBeGreaterThan(0)
      // freed weeks from skipping go to Phase 2, total stays 47
      expect(s.totalWeeks).toBe(47)
    })
  }

  it('week 1 run matches the skip start; strength always starts at Strength A', () => {
    const wk1run = (rb) => buildSchedule({ ...DEFAULT, runningBase: rb, today: new Date('2026-07-01T12:00:00Z') }).weeks[0].run
    expect(wk1run('none')).toMatch(/1 min run/)
    expect(wk1run('jog12')).toMatch(/4 min run/)
    expect(wk1run('run3')).toMatch(/30 min/)
    expect(wk1run('regular')).toMatch(/30-35 min easy/)
    for (const rb of Object.keys(RUNNING_BASE)) {
      const s = buildSchedule({ ...DEFAULT, runningBase: rb, today: new Date('2026-07-01T12:00:00Z') })
      expect(s.weeks[0].strength.label).toBe('Strength A')
    }
  })
})

describe('Strength Phase 1 is never shorter than 4 weeks', () => {
  for (const key of Object.keys(RUNNING_BASE)) {
    it(`${key}`, () => {
      const s = buildSchedule({ ...DEFAULT, runningBase: key, today: new Date('2026-07-01T12:00:00Z') })
      expect(s.layout.P1).toBeGreaterThanOrEqual(4)
      // and everyone gets Strength A for those weeks
      const p1 = s.weeks.filter((w) => w.phaseId === 1)
      expect(p1.length).toBeGreaterThanOrEqual(4)
      expect(p1.every((w) => w.strength.label === 'Strength A')).toBe(true)
    })
  }
})

describe('compression when the race is close', () => {
  const validLayout = (s) => {
    // no phase zero/negative, Phase 1 survives, final 2 taper weeks survive
    expect(s.layout.P1).toBeGreaterThanOrEqual(4)
    expect(s.layout.taper).toBe(2)
    expect(s.layout.P2).toBeGreaterThanOrEqual(0)
    expect(s.layout.P3).toBeGreaterThanOrEqual(0)
    expect(s.layout.terrain).toBeGreaterThanOrEqual(0)
    expect(s.totalWeeks).toBe(s.layout.P1 + s.layout.P2 + s.layout.P3 + s.layout.terrain + s.layout.taper)
    // last two weeks are the taper + race week
    const last2 = s.weeks.slice(-2)
    expect(last2[0].isTaper).toBe(true)
    expect(last2[1].isRaceWeek).toBe(true)
  }

  it('race ~6 weeks out', () => {
    // today 6 weeks before race
    const s = buildSchedule({ raceDate: '2026-08-15', runningBase: 'none', today: new Date('2026-07-06T12:00:00Z') })
    validLayout(s)
    expect(s.warnings).toContain('compressed')
  })

  it('race ~3 weeks out', () => {
    const s = buildSchedule({ raceDate: '2026-07-25', runningBase: 'none', today: new Date('2026-07-06T12:00:00Z') })
    validLayout(s)
  })

  it('race extremely close still protects Phase 1 and the 2 taper weeks', () => {
    const s = buildSchedule({ raceDate: '2026-07-13', runningBase: 'none', today: new Date('2026-07-06T12:00:00Z') })
    validLayout(s)
    expect(s.layout.P1).toBeGreaterThanOrEqual(4)
    expect(s.layout.taper).toBe(2)
  })
})

describe('extra runway extends Phase 2', () => {
  it('very early start pushes weeks into Phase 2, not Phase 1', () => {
    const s = buildSchedule({ raceDate: '2027-06-26', runningBase: 'none', startDate: '2026-07-06' })
    // more than 47 weeks of runway -> Phase 2 grows, Phase 1 stays 10
    expect(s.layout.P1).toBe(10)
    expect(s.layout.P2).toBeGreaterThan(14)
    expect(s.weeks[s.weeks.length - 1].isRaceWeek).toBe(true)
  })
})

describe('timezone: week is derived from UTC calendar date, immune to device zone', () => {
  it('utcYmd maps an instant to its UTC day regardless of host TZ', () => {
    // test process runs under America/Los_Angeles (UTC-8) via the test script
    // 2027-02-01T04:00Z is Jan 31 20:00 local, but must resolve to Feb 1 (UTC)
    expect(utcYmd(new Date('2027-02-01T04:00:00Z'))).toBe('2027-02-01')
  })

  it('same instant near a day boundary lands in the same week no matter the zone', () => {
    const opts = { raceDate: '2027-06-26', runningBase: 'none', startDate: '2026-08-03' }
    // An instant that is Feb 1 in UTC but Jan 31 in UTC-8 and Feb 1 in UTC+2.
    const instant = new Date('2027-02-01T04:00:00Z')
    const s = buildSchedule({ ...opts, today: instant })
    // Feb 1 2027 is the Monday of training week 27 (Race Specific)
    expect(s.weeks[s.currentIndex].week).toBe(27)
    expect(s.weeks[s.currentIndex].phaseId).toBe(3)

    // Passing the same instant as its UTC date string yields the identical week.
    const s2 = buildSchedule({ ...opts, today: '2027-02-01' })
    expect(s2.currentIndex).toBe(s.currentIndex)
  })

  it('two Date objects for the same epoch instant give the same week', () => {
    const opts = { raceDate: '2027-06-26', runningBase: 'none', startDate: '2026-08-03' }
    const ms = Date.parse('2027-03-10T15:30:00Z')
    const a = buildSchedule({ ...opts, today: new Date(ms) })
    const b = buildSchedule({ ...opts, today: new Date(ms) })
    expect(a.currentIndex).toBe(b.currentIndex)
  })
})
