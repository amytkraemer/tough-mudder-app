// Scale a run prescription by running experience (spec 2.6).
//  none / jog12 : as written
//  run3         : distance & duration x1.25 (round dist to 0.25 mi, dur to 5 min), hill reps +2
//  regular      : distance & duration x1.5  (same rounding),              hill reps +4,
//                 plus a 10-15 lb pack on one run/week from Phase 2 onward (Day 1)
// NEVER scale: Phase 1 sessions, the Broken 5K, taper weeks, race week.

const FACTOR = { none: 1, jog12: 1, run3: 1.25, regular: 1.5 }
const HILL_BONUS = { none: 0, jog12: 0, run3: 2, regular: 4 }

// The scalable tokens. These are the SAME patterns scaleRun() rewrites, exported
// so a test can assert every run prescription either matches one of them or is
// explicitly do-not-scale — an unmatched string then fails loudly instead of
// silently shipping beginner distances to an experienced runner.
export const SCALE_PATTERNS = {
  miles: /([\d.]+)(\s*miles?\b)/i,
  leadDuration: /^(\D*?)([\d.]+)(?:-([\d.]+))?(\s*min\b)/i,
  hills: /(\d+)(\s*x\s*[\d.]+\s*sec\s+hard\s+uphill)/i,
}
export function matchesScalingPattern(runText) {
  return SCALE_PATTERNS.miles.test(runText)
    || SCALE_PATTERNS.leadDuration.test(runText)
    || SCALE_PATTERNS.hills.test(runText)
}

// round to nearest step, ties resolve DOWN (so 35 x1.5 = 52.5 -> 50, per spec)
function roundStep(x, step) {
  const q = x / step
  const f = Math.floor(q)
  const r = q - f
  const n = r > 0.5 ? f + 1 : f
  return Math.round(n * step * 100) / 100
}

export function isScalable(runText, ctx = {}) {
  if (ctx.phaseId === 1) return false
  if (ctx.isTaper || ctx.isRaceWeek) return false
  if (/broken\s*5k/i.test(runText)) return false
  return true
}

export function scaleRun(runText, runningBase = 'none', ctx = {}) {
  const factor = FACTOR[runningBase] ?? 1
  const hillBonus = HILL_BONUS[runningBase] ?? 0
  if (factor === 1 && hillBonus === 0) return runText
  if (!isScalable(runText, ctx)) return runText

  let out = runText

  // hill reps: "K x <sec> sec hard uphill"
  out = out.replace(SCALE_PATTERNS.hills, (_, k, rest) => `${Number(k) + hillBonus}${rest}`)

  if (factor !== 1) {
    // mileage: "N miles" / "N mi"
    out = out.replace(SCALE_PATTERNS.miles, (_, d, rest) => `${roundStep(Number(d) * factor, 0.25)}${rest}`)

    // leading duration: "N min" or "N-M min" at (or near) the start of the line
    out = out.replace(SCALE_PATTERNS.leadDuration, (m, pre, a, b, unit) => {
      const sa = roundStep(Number(a) * factor, 5)
      const sb = b !== undefined ? roundStep(Number(b) * factor, 5) : undefined
      return `${pre}${sb !== undefined ? `${sa}-${sb}` : sa}${unit}`
    })
  }

  // running-regularly weekly pack note on the Day 1 run, Phase 2 onward
  if (runningBase === 'regular' && ctx.isDay1 && ctx.phaseId >= 2 && !ctx.isTaper && !ctx.isRaceWeek) {
    out += ' · carry a 10-15 lb pack'
  }

  return out
}
