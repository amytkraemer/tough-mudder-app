// Completion accounting.
//
// Three buckets, so multi-day users can't hide skipped overlay days:
//   CORE     = the fixed 3-day spine (Run 1 / Strength / Circuit). Always 3 per
//              week; the full-plan denominator is 3 * weeks (141 for the standard
//              47-week plan).
//   OVERLAY  = Grip & Pull / Easy Run 2 / Mobility & Carry. Part of the plan the
//              user chose via days-per-week, so they belong in PLAN completion.
//   EXTRA    = supplemental-library / ad-hoc "Add a session" workouts. Genuinely
//              optional; counted on their own, never in either completion rate.
//
// Rates are "to date" (only weeks whose Monday has arrived) and clamped, so
// neither Core nor Plan completion can exceed 100%.

import { markKey } from './storage.js'
import { utcYmd } from './schedule.js'

const COUNTS = new Set(['done', 'backup'])
const dayNum = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000) }
const rate = (done, sched) => (sched > 0 ? Math.min(1, done / sched) : 0)

export function computeStats({ weeks, marks, extra = {}, today = new Date() }) {
  const todayNum = dayNum(utcYmd(today))

  let coreDoneToDate = 0, coreSchedToDate = 0, coreDoneTotal = 0
  let overlayDoneToDate = 0, overlaySchedToDate = 0, overlayDoneTotal = 0, overlayTotal = 0
  let backups = 0, missed = 0, partial = 0
  let runsDone = 0, strengthDone = 0, circuitsDone = 0
  let extrasDone = 0, extrasTotal = 0
  const perPhase = {} // core+overlay completed per phase, for the course map

  for (const w of weeks) {
    const arrived = w.mondayNum <= todayNum

    // CORE
    if (arrived) coreSchedToDate += 3
    for (const s of ['run', 'strength', 'circuit']) {
      const m = marks[markKey(w.week, s)]
      if (!m) continue
      if (m === 'missed') missed++
      if (m === 'partial') partial++
      if (COUNTS.has(m)) {
        coreDoneTotal++
        if (arrived) coreDoneToDate++
        if (m === 'backup') backups++
        else if (s === 'run') runsDone++
        else if (s === 'strength') strengthDone++
        else circuitsDone++
        perPhase[w.phaseId] = (perPhase[w.phaseId] || 0) + 1
      }
    }

    // OVERLAY (part of the plan for 4/5/6-day users)
    const overlays = w.overlays || []
    overlayTotal += overlays.length
    if (arrived) overlaySchedToDate += overlays.length
    for (const o of overlays) {
      const m = marks[markKey(w.week, o.key)]
      if (!m) continue
      if (m === 'missed') missed++
      if (m === 'partial') partial++
      if (COUNTS.has(m)) {
        overlayDoneTotal++
        if (arrived) overlayDoneToDate++
        if (m === 'backup') backups++
        perPhase[w.phaseId] = (perPhase[w.phaseId] || 0) + 1
      }
    }

    // EXTRA (supplemental / ad-hoc — separate count only)
    for (const e of extra[w.week] || []) {
      extrasTotal++
      const m = marks[markKey(w.week, e.id)]
      if (COUNTS.has(m)) extrasDone++
    }
  }

  const coreTotal = weeks.length * 3                 // 141 for the standard plan
  const planSchedToDate = coreSchedToDate + overlaySchedToDate
  const planDoneToDate = coreDoneToDate + overlayDoneToDate
  const planTotal = coreTotal + overlayTotal
  const planDoneTotal = coreDoneTotal + overlayDoneTotal

  const coreCompletionRate = rate(coreDoneToDate, coreSchedToDate)
  const planCompletionRate = rate(planDoneToDate, planSchedToDate)
  const completedForBackup = coreDoneTotal + overlayDoneTotal
  const backupShare = completedForBackup > 0 ? backups / completedForBackup : 0

  return {
    // structured buckets
    core: { doneToDate: coreDoneToDate, schedToDate: coreSchedToDate, doneTotal: coreDoneTotal, total: coreTotal, rate: coreCompletionRate },
    plan: { doneToDate: planDoneToDate, schedToDate: planSchedToDate, doneTotal: planDoneTotal, total: planTotal, rate: planCompletionRate },
    overlay: { doneToDate: overlayDoneToDate, schedToDate: overlaySchedToDate, doneTotal: overlayDoneTotal, total: overlayTotal },
    extras: { done: extrasDone, total: extrasTotal },

    // convenience / back-compat (all CORE-based unless noted)
    completed: coreDoneToDate,
    scheduledToDate: coreSchedToDate,
    totalScheduled: coreTotal,
    completionRate: coreCompletionRate,
    coreCompletionRate,
    planCompletionRate,
    backups, missed, partial,
    backupShare,
    backupWarning: backupShare > 0.3,
    runsDone, strengthDone, circuitsDone,
    perPhase,
  }
}

export function hangStats(hangs) {
  const list = hangsArray(hangs)
  const secs = list.map((h) => Number(h.seconds)).filter((n) => !isNaN(n) && n > 0)
  const pr = secs.length ? Math.max(...secs) : 0
  const avg = secs.length ? Math.round(secs.reduce((a, b) => a + b, 0) / secs.length) : 0
  const recent = list.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-5)
  const recentSecs = recent.map((h) => Number(h.seconds)).filter((n) => !isNaN(n))
  const rolling = recentSecs.length ? Math.round(recentSecs.reduce((a, b) => a + b, 0) / recentSecs.length) : 0
  return { pr, avg, rolling, count: secs.length, hit60: pr >= 60, hit90: pr >= 90 }
}

// hangs may be an object keyed by id (new) or a legacy array
export function hangsArray(hangs) {
  if (Array.isArray(hangs)) return hangs
  if (hangs && typeof hangs === 'object') return Object.values(hangs)
  return []
}
