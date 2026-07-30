import { describe, it, expect } from 'vitest'
import {
  PHASE1_RUNS, PHASE2_RUNS, PHASE2_MAINTENANCE, PHASE3_RUNS, PHASE3_ROTATION,
  PHASE4_TERRAIN_RUN, TAPER_RUN, RACE_WEEK_RUN,
} from '../src/data/plan.js'
import { matchesScalingPattern, scaleRun } from '../src/lib/runScaling.js'

const isBroken = (s) => /broken\s*5k/i.test(s)

// Every run prescription string in data/plan.js, split into "must scale" and
// "explicitly protected". If a run string that should scale doesn't match any
// pattern, the first test fails loudly instead of shipping beginner distances.
const SCALABLE = [
  ...PHASE2_RUNS,
  ...PHASE2_MAINTENANCE,
  ...PHASE3_RUNS.filter((s) => !isBroken(s)),
  ...PHASE3_ROTATION.filter((s) => !isBroken(s)),
  PHASE4_TERRAIN_RUN,
  // Easy Run 2 base strings that scaleRun also drives (from data/overlays.js)
  '20-25 min easy continuous',
  '25-30 min easy continuous',
  '30-35 min easy, off-trail if possible',
]
const PROTECTED = [
  ...PHASE1_RUNS,
  ...PHASE3_RUNS.filter(isBroken),
  ...PHASE3_ROTATION.filter(isBroken),
  TAPER_RUN,
  RACE_WEEK_RUN,
]

describe('run-scaling coverage (item 3): no silent no-ops', () => {
  it('every scalable run string matches a scaling pattern AND actually changes', () => {
    for (const s of new Set(SCALABLE)) {
      expect(matchesScalingPattern(s), `unmatched scalable run: "${s}"`).toBe(true)
      const scaled = scaleRun(s, 'regular', { phaseId: 3 })
      expect(scaled, `scaleRun silently no-op'd on: "${s}"`).not.toBe(s)
    }
  })

  it('every protected run string is left exactly as written', () => {
    for (const s of new Set(PROTECTED)) {
      const phaseId = /min run|continuous, walk|CONTINUOUS/i.test(s) ? 1 : 3
      const ctx = { phaseId, isTaper: /TAPER/.test(s), isRaceWeek: /RACE WEEK/.test(s) }
      expect(scaleRun(s, 'regular', ctx), `protected run was scaled: "${s}"`).toBe(s)
      expect(scaleRun(s, 'run3', ctx)).toBe(s)
    }
  })

  it('a run string with no scalable token is flagged (guards the guard)', () => {
    expect(matchesScalingPattern('jog around the block, no pace goal')).toBe(false)
  })
})
