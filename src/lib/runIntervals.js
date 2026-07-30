// Parse a run prescription string into guided timer phases.
// Returns { intervals:[{label,sec,kind}], totalSec } or null if the run is
// distance-based / free-form (no guided intervals — just log it).

const WARM = { label: 'Warm-up walk', sec: 300, kind: 'walk' }
const COOL = { label: 'Cool-down walk', sec: 300, kind: 'walk' }

function finalize(phases) {
  if (!phases.length) return null
  const intervals = [WARM, ...phases, COOL]
  return { intervals, totalSec: intervals.reduce((a, p) => a + p.sec, 0) }
}

export function parseRun(str) {
  const s = str || ''
  const phases = []
  const add = (label, sec, kind) => { if (sec > 0) phases.push({ label, sec: Math.round(sec), kind }) }

  // "A min run / B min walk x K" (+ optional ", then C min walk/run")
  let m = s.match(/([\d.]+)\s*min run\s*\/\s*([\d.]+)\s*min walk\s*x\s*(\d+)/i)
  if (m) {
    const a = +m[1], b = +m[2], k = +m[3]
    for (let i = 0; i < k; i++) { add('Run', a * 60, 'run'); add('Walk', b * 60, 'walk') }
    const then = s.match(/then\s*([\d.]+)\s*min\s*(walk|run)/i)
    if (then) add(then[2].toLowerCase() === 'run' ? 'Run' : 'Walk', +then[1] * 60, then[2].toLowerCase())
    return finalize(phases)
  }

  // "A min continuous, walk B, then C min continuous"
  m = s.match(/([\d.]+)\s*min continuous,\s*walk\s*([\d.]+),\s*then\s*([\d.]+)\s*min continuous/i)
  if (m) { add('Run', +m[1] * 60, 'run'); add('Walk', +m[2] * 60, 'walk'); add('Run', +m[3] * 60, 'run'); return finalize(phases) }

  // "N(-M) min easy, plus P min at X% incline mid-run" -> easy / incline / easy
  m = s.match(/([\d.]+)(?:-[\d.]+)?\s*min easy,\s*plus\s*([\d.]+)\s*min at\s*(\d+(?:-\d+)?%)\s*incline/i)
  if (m) {
    const total = +m[1], inc = +m[2], pct = m[3]
    const side = Math.max(1, (total - inc) / 2)
    add('Easy', side * 60, 'easy')
    add(`Incline ${pct}`, inc * 60, 'incline')
    add('Easy', side * 60, 'easy')
    return finalize(phases)
  }

  // "Incline intervals: A min at ... / B min flat, x K"
  m = s.match(/([\d.]+)\s*min at ([\d%-]+)[^/]*\/\s*([\d.]+)\s*min flat[^x]*x\s*(\d+)/i)
  if (m) { const a = +m[1], pct = m[2], b = +m[3], k = +m[4]; for (let i = 0; i < k; i++) { add(`Incline ${pct}`, a * 60, 'incline'); add('Easy · flat', b * 60, 'easy') } return finalize(phases) }

  // "K x N sec hard uphill, walk down"
  m = s.match(/(\d+)\s*x\s*([\d.]+)\s*sec hard uphill/i)
  if (m) { const k = +m[1], sec = +m[2]; for (let i = 0; i < k; i++) { add('Hard uphill', sec, 'hard'); add('Walk down', 90, 'walk') } return finalize(phases) }

  // Continuous single block: "N min CONTINUOUS", "N-M min easy continuous", "N min easy ..."
  m = s.match(/([\d.]+)(?:-[\d.]+)?\s*min[^,]*continuous/i) || s.match(/^\D*?([\d.]+)(?:-[\d.]+)?\s*min easy/i) || s.match(/^\D*?([\d.]+)(?:-[\d.]+)?\s*min/i)
  if (m) { add('Run', +m[1] * 60, 'run'); return finalize(phases) }

  return null // distance-based / broken 5k / property / race week — free run
}
