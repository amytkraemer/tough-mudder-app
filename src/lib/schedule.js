// Scheduling engine.
//
// Rules (from the brief):
//  - Running base sets the STARTING WEEK of the run progression only:
//      none -> week 1, jog12 -> week 5, run3 -> week 10, regular -> week 11.
//  - Strength never skips: everyone starts at Strength A and does it >= 4 weeks.
//  - Skipping ahead shrinks Phase 1; the freed weeks extend Phase 2, never Phase 1.
//  - Too little time before the race: compress Phase 2 first, then Phase 3, then
//    the terrain weeks, never Phase 1 and never the final 2 taper weeks.

import {
  PHASES, PHASE1_RUNS, PHASE2_RUNS, PHASE2_MAINTENANCE, PHASE3_RUNS,
  PHASE3_ROTATION, PHASE4_TERRAIN_RUN, TAPER_RUN, RACE_WEEK_RUN,
  STRENGTH, CIRCUIT, TAPER, strengthAForWeek,
} from '../data/plan.js'

const DAY = 86400000

export const RUNNING_BASE = {
  none:    { label: 'Not running', desc: 'Starting from zero', skip: 0 },
  jog12:   { label: 'Can jog 1–2 miles', desc: 'Some base', skip: 4 },
  run3:    { label: 'Can run 3+ miles', desc: 'Solid base', skip: 9 },
  regular: { label: 'Running regularly', desc: 'Running is a habit', skip: 10 },
}

// ---- date helpers (timezone-safe, date-only) ----
// Everything works in whole UTC "day numbers" derived from Y-M-D strings, so no
// local-midnight arithmetic can shift which training week you're in when you fly
// across timezones. The only place we read a Date is to turn "now" into a
// calendar date, and we read it in UTC so the same instant maps to the same day
// regardless of the device's timezone.
const pad = (n) => String(n).padStart(2, '0')
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Date | 'YYYY-MM-DD' -> 'YYYY-MM-DD' (UTC calendar day for a Date).
export function utcYmd(v) {
  if (typeof v === 'string') return v.slice(0, 10)
  return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())}`
}
function ymdToNum(ymd) {
  const [y, m, d] = String(ymd).slice(0, 10).split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / DAY)
}
function numToYmd(n) {
  const dt = new Date(n * DAY)
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}
function mondayNum(n) {
  const dow = (new Date(n * DAY).getUTCDay() + 6) % 7 // 0 = Monday
  return n - dow
}
function weeksInclusive(startMonNum, endMonNum) { return Math.round((endMonNum - startMonNum) / 7) + 1 }
function labelFromNum(n) { const dt = new Date(n * DAY); return `${MONTHS[dt.getUTCMonth()]} ${dt.getUTCDate()}` }

// kept for callers that format a local calendar date (e.g. default log date)
export function parseDate(s) {
  if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate())
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function fmtISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export function fmtMonthDay(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ---- phase layout ----
function baseLayout(runningBase) {
  const skip = (RUNNING_BASE[runningBase] || RUNNING_BASE.none).skip
  const P1 = Math.max(4, 10 - skip)     // Phase 1 shrinks but stays >= 4 weeks
  const runSpare = 10 - P1              // weeks freed from Phase 1
  return {
    skip,
    P1,
    P2: 14 + runSpare,                  // spare weeks extend Phase 2
    P3: 14,
    terrain: 7,                         // Phase 4 terrain weeks (39-45)
    taper: 2,                           // protected final 2 weeks (46, 47)
  }
}

function fitLayout(base, L, warnings) {
  const P1 = base.P1
  const taper = 2
  const flexTarget = L - P1 - taper
  const desiredFlex = base.P2 + base.P3 + base.terrain
  let P2 = base.P2, P3 = base.P3, terrain = base.terrain

  if (flexTarget >= desiredFlex) {
    P2 += flexTarget - desiredFlex     // extra runway -> extend Phase 2
    if (flexTarget - desiredFlex > 0) warnings.push('extended')
  } else {
    let cut = desiredFlex - flexTarget
    warnings.push('compressed')
    let c = Math.min(cut, Math.max(0, P2 - 2)); P2 -= c; cut -= c   // Phase 2 first
    c = Math.min(cut, Math.max(0, P3 - 2)); P3 -= c; cut -= c       // then Phase 3
    c = Math.min(cut, terrain); terrain -= c; cut -= c              // then terrain
    if (cut > 0) {                     // still too tight: eat into floors, never taper/P1
      c = Math.min(cut, P2); P2 -= c; cut -= c
      c = Math.min(cut, P3); P3 -= c; cut -= c
      if (cut > 0) warnings.push('too-tight')
    }
  }
  return { P1, P2: Math.max(0, P2), P3: Math.max(0, P3), terrain: Math.max(0, terrain), taper }
}

// ---- run selection ----
function runForPhase1(j, skip) {
  const combined = PHASE1_RUNS.concat(PHASE2_RUNS)
  return combined[Math.min(skip + j, combined.length - 1)]
}
function runForPhase2(j) {
  if (j < PHASE2_RUNS.length) return PHASE2_RUNS[j]
  return PHASE2_MAINTENANCE[(j - PHASE2_RUNS.length) % PHASE2_MAINTENANCE.length]
}
function runForPhase3(j) {
  if (j < PHASE3_RUNS.length) return PHASE3_RUNS[j]
  return PHASE3_ROTATION[(j - PHASE3_RUNS.length) % PHASE3_ROTATION.length]
}

// ---- main builder ----
export function buildSchedule({ raceDate, runningBase = 'none', daysPerWeek = 3, startDate = null, today = new Date() }) {
  const warnings = []
  const raceNum = ymdToNum(raceDate)
  const raceMonNum = mondayNum(raceNum)
  const todayNum = ymdToNum(utcYmd(today))
  const todayMonNum = mondayNum(todayNum)
  const base = baseLayout(runningBase)
  const desiredTotal = base.P1 + base.P2 + base.P3 + base.terrain + base.taper

  // Determine start Monday + total length (all in day-numbers).
  let startMonNum, L
  if (startDate) {
    startMonNum = mondayNum(ymdToNum(startDate))
    L = Math.max(base.P1 + base.taper, weeksInclusive(startMonNum, raceMonNum))
  } else {
    const naturalStartNum = raceMonNum - (desiredTotal - 1) * 7
    if (naturalStartNum >= todayMonNum) {
      startMonNum = naturalStartNum; L = desiredTotal      // plenty of runway: keep full plan
    } else {
      startMonNum = todayMonNum                            // race is close: start now + compress
      L = Math.max(base.P1 + base.taper, weeksInclusive(startMonNum, raceMonNum))
    }
  }

  const lay = fitLayout(base, L, warnings)
  const total = lay.P1 + lay.P2 + lay.P3 + lay.terrain + lay.taper

  // Segment boundaries.
  const b1 = lay.P1
  const b2 = b1 + lay.P2
  const b3 = b2 + lay.P3
  const b4t = b3 + lay.terrain            // terrain weeks end here; taper follows

  const weeks = []
  for (let i = 0; i < total; i++) {
    const mNum = startMonNum + i * 7
    const monday = new Date(mNum * DAY)   // UTC-midnight Date, for display only
    let phaseId, phaseIdx, run, strength, circuit, isTaper = false, isRaceWeek = false

    if (i < b1) {                          // Phase 1 — Base
      phaseId = 1; phaseIdx = i
      run = runForPhase1(i, base.skip)
      strength = strengthAForWeek(i + 1); circuit = CIRCUIT.A
    } else if (i < b2) {                    // Phase 2 — Strength Build
      phaseId = 2; phaseIdx = i - b1
      run = runForPhase2(phaseIdx)
      strength = STRENGTH.B; circuit = CIRCUIT.B
    } else if (i < b3) {                    // Phase 3 — Race Specific
      phaseId = 3; phaseIdx = i - b2
      run = runForPhase3(phaseIdx)
      strength = STRENGTH.C; circuit = CIRCUIT.C
    } else if (i < b4t) {                   // Phase 4 — terrain
      phaseId = 4; phaseIdx = i - b3
      run = PHASE4_TERRAIN_RUN
      strength = STRENGTH.C; circuit = CIRCUIT.C_OUTDOOR
    } else {                                // Phase 4 — taper (final 2)
      phaseId = 4; isTaper = true
      const t = i - b4t
      if (t === 0 && total - i === 2) {     // 60% week
        run = TAPER_RUN
        strength = TAPER.strength; circuit = TAPER.circuit
      } else {                              // race week
        isRaceWeek = true
        run = RACE_WEEK_RUN
        strength = { label: 'Race week', filter: 'sC', scheme: 'Rest, hydrate, eat normally',
          where: 'Thursday & Friday: rest', exercises: ['Mon: 20 min easy walk or jog', 'Wed: 15 min easy + a few strides', 'Thu & Fri: rest'], grip: [] }
        circuit = { label: 'RACE DAY', filter: 'cA', scheme: 'Saturday', where: '',
          exercises: ['Race in old, double-knotted shoes', 'Compression socks or calf sleeves', 'Have fun out there'] }
      }
    }

    weeks.push({
      week: i + 1,
      phaseId,
      phase: PHASES[phaseId - 1],
      monday,
      mondayNum: mNum,
      mondayYmd: numToYmd(mNum),
      dateLabel: labelFromNum(mNum),
      run,
      strength,
      circuit,
      isTaper,
      isRaceWeek,
    })
  }

  // Current week from today (day-number comparison, timezone-independent).
  const firstMonNum = startMonNum
  const lastMonNum = startMonNum + (total - 1) * 7
  let currentIndex, status = 'active'
  if (todayMonNum < firstMonNum) { currentIndex = 0; status = 'not-started' }
  else if (todayMonNum > lastMonNum) { currentIndex = total - 1; status = 'finished' }
  else { currentIndex = Math.round((todayMonNum - firstMonNum) / 7); status = 'active' }
  currentIndex = Math.max(0, Math.min(total - 1, currentIndex))

  const daysToRace = Math.max(0, raceNum - todayNum)

  return {
    weeks,
    currentIndex,
    status,
    daysToRace,
    startDate: numToYmd(startMonNum),
    raceDate: numToYmd(raceNum),
    totalWeeks: total,
    totalSessions: total * 3,
    layout: lay,
    warnings,
    daysPerWeek,
    runningBase,
    todayYmd: numToYmd(todayNum),
  }
}

// Suggested weekday layout for the three sessions (spaced out, never stacked).
const DAY_PLANS = {
  3: [{ d: 'Mon', k: 'run' }, { d: 'Wed', k: 'strength' }, { d: 'Fri', k: 'circuit' }],
  4: [{ d: 'Mon', k: 'run' }, { d: 'Wed', k: 'strength' }, { d: 'Fri', k: 'circuit' }, { d: 'Sat', k: 'hang' }],
  5: [{ d: 'Mon', k: 'run' }, { d: 'Tue', k: 'hang' }, { d: 'Wed', k: 'strength' }, { d: 'Fri', k: 'circuit' }, { d: 'Sat', k: 'hang' }],
  6: [{ d: 'Mon', k: 'run' }, { d: 'Tue', k: 'hang' }, { d: 'Wed', k: 'strength' }, { d: 'Thu', k: 'hang' }, { d: 'Fri', k: 'circuit' }, { d: 'Sat', k: 'hang' }],
}
export function dayPlan(daysPerWeek) {
  return DAY_PLANS[daysPerWeek] || DAY_PLANS[3]
}
