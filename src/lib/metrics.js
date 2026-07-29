// Decide what to log for a given exercise and pull a sensible placeholder
// (this week's target) out of its prescription string.
const SECONDS_RE = /\b(sec|hang|hold|hollow|plank|carry)\b/i
const WEIGHT_RE = /(row|press|split squat|farmer|suitcase|carry|dumbbell|weight|deadlift|kettlebell)/i

export function exerciseInput(name) {
  return {
    metric: SECONDS_RE.test(name) ? 'seconds' : 'reps',
    weight: WEIGHT_RE.test(name),
  }
}

export function parseTarget(name, metric) {
  if (metric === 'seconds') {
    const m = name.match(/(\d+)\s*sec/i)
    return m ? m[1] : ''
  }
  const m = name.match(/×\s*(\d+)/)
  return m ? m[1] : ''
}

// Short movement label for the log rows (drop reps/parentheticals).
export function shortName(name) {
  return name
    .replace(/\s*\(.*$/, '')
    .replace(/\s*×.*$/, '')
    .replace(/\s*\d+\s*sec.*$/i, '')
    .replace(/\s*→.*$/, '')
    .trim()
}

export function parseRounds(scheme) {
  const m = (scheme || '').match(/(\d+)\s*rounds/i)
  return m ? m[1] : ''
}

// Does a stored log object hold anything worth showing?
export function logHasData(log) {
  if (!log) return false
  if (log.min || log.mi || log.rounds || (log.notes && log.notes.trim())) return true
  if (log.ex) return Object.values(log.ex).some((e) => e && (e.n || e.w))
  return false
}

export function logSummary(kind, log) {
  if (!logHasData(log)) return ''
  if (kind === 'run') {
    return [log.min ? `${log.min} min` : '', log.mi ? `${log.mi} mi` : ''].filter(Boolean).join(' · ')
  }
  if (kind === 'circuit') {
    return log.rounds ? `${log.rounds} rounds` : 'logged'
  }
  const n = log.ex ? Object.values(log.ex).filter((e) => e && (e.n || e.w)).length : 0
  return n ? `${n} logged` : 'logged'
}
