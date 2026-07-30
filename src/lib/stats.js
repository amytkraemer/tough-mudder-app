// Stat definitions ported from the xlsx Dashboard tab.
//  - Done and Backup both count toward completed. Partial and Missed do not.
//  - Sessions scheduled to date = 3 per week whose Monday has arrived.
//  - Backup share = backups / completed. Watch it: past ~30% strength has stalled.

import { markKey } from './storage.js'
import { utcYmd } from './schedule.js'

const COUNTS = new Set(['done', 'backup'])
const dayNum = (ymd) => { const [y, m, d] = ymd.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000) }

// Only the three CORE sessions per week count toward completion. "Extra"
// sessions are tracked separately and never enter this denominator, so the
// completion rate is mathematically incapable of exceeding 100%.
export function computeStats({ weeks, marks, today = new Date() }) {
  const todayNum = dayNum(utcYmd(today))
  let completedToDate = 0, completedTotal = 0, backups = 0, missed = 0, partial = 0
  let scheduledToDate = 0
  let runsDone = 0, strengthDone = 0, circuitsDone = 0

  const perPhase = {}
  for (const w of weeks) {
    const arrived = w.mondayNum <= todayNum
    if (arrived) scheduledToDate += 3
    for (const s of ['run', 'strength', 'circuit']) {
      const m = marks[markKey(w.week, s)]
      if (!m) continue
      if (m === 'missed') missed++
      if (m === 'partial') partial++
      if (COUNTS.has(m)) {
        completedTotal++
        if (arrived) completedToDate++
        if (m === 'backup') backups++
        if (m === 'done') {
          if (s === 'run') runsDone++
          else if (s === 'strength') strengthDone++
          else circuitsDone++
        }
        perPhase[w.phaseId] = (perPhase[w.phaseId] || 0) + 1
      }
    }
  }

  const totalScheduled = weeks.length * 3
  // clamp defensively; arrived-only counting already keeps this <= 1
  const completionRate = scheduledToDate > 0 ? Math.min(1, completedToDate / scheduledToDate) : 0
  const backupShare = completedTotal > 0 ? backups / completedTotal : 0

  return {
    completed: completedToDate,   // "done vs scheduled" is a to-date figure
    completedTotal,               // includes sessions logged ahead of schedule
    backups,
    missed,
    partial,
    scheduledToDate,
    totalScheduled,
    completionRate,
    backupShare,
    backupWarning: backupShare > 0.3,
    runsDone,
    strengthDone,
    circuitsDone,
    perPhase, // { phaseId: completedCount }
  }
}

export function hangStats(hangs) {
  const secs = hangs.map((h) => Number(h.seconds)).filter((n) => !isNaN(n) && n > 0)
  const pr = secs.length ? Math.max(...secs) : 0
  const avg = secs.length ? Math.round(secs.reduce((a, b) => a + b, 0) / secs.length) : 0
  // rolling average of the last 5 logged hangs
  const recent = hangs.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-5)
  const recentSecs = recent.map((h) => Number(h.seconds)).filter((n) => !isNaN(n))
  const rolling = recentSecs.length ? Math.round(recentSecs.reduce((a, b) => a + b, 0) / recentSecs.length) : 0
  return {
    pr,
    avg,
    rolling,
    count: secs.length,
    hit60: pr >= 60,
    hit90: pr >= 90,
  }
}
