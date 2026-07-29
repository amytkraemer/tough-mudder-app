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
  if (log.ex) return Object.values(log.ex).some((e) => e && (e.n || e.w || e.mod))
  return false
}

export function anyModified(log) {
  return !!(log && log.ex && Object.values(log.ex).some((e) => e && e.mod))
}

// ---- previous-value lookup (for placeholders) + progress series ----
// Index every logged value by movement/kind so we can find "last time".
export function buildLogIndex(weeks, logs) {
  const map = { run: [], circuit: [] } // map['str|<movement>'] = [{week,n,w}]
  const push = (k, v) => { (map[k] ||= []).push(v) }
  for (const w of weeks) {
    const rl = logs[`${w.week}:run`]
    if (rl && (rl.min || rl.mi)) push('run', { week: w.week, min: rl.min, mi: rl.mi })
    const cl = logs[`${w.week}:circuit`]
    if (cl && cl.rounds) push('circuit', { week: w.week, rounds: cl.rounds })
    const sl = logs[`${w.week}:strength`]
    if (sl && sl.ex && w.strength?.exercises) {
      w.strength.exercises.forEach((ex, i) => {
        const e = sl.ex[i]
        if (e && (e.n || e.w)) push('str|' + shortName(ex).toLowerCase(), { week: w.week, n: e.n, w: e.w })
      })
    }
  }
  return map
}

const latestBefore = (arr, week) => (arr || []).filter((x) => x.week < week).sort((a, b) => b.week - a.week)[0]

// Placeholders for a card: the most recent prior logged values.
export function prevFor(map, weekNumber, kind, week) {
  if (kind === 'run') { const p = latestBefore(map.run, weekNumber); return p ? { min: p.min, mi: p.mi, week: p.week } : null }
  if (kind === 'circuit') { const p = latestBefore(map.circuit, weekNumber); return p ? { rounds: p.rounds, week: p.week } : null }
  const ex = {}
  ;(week.strength?.exercises || []).forEach((e, i) => {
    const p = latestBefore(map['str|' + shortName(e).toLowerCase()], weekNumber)
    if (p) ex[i] = { n: p.n, w: p.w, week: p.week }
  })
  return { ex }
}

// Movements with at least 2 logged points (for the strength progress picker).
export function loggedMovements(map) {
  return Object.keys(map)
    .filter((k) => k.startsWith('str|') && map[k].length >= 2)
    .map((k) => ({ key: k, name: map[k].__name || titleize(k.slice(4)) }))
}
function titleize(s) { return s.charAt(0).toUpperCase() + s.slice(1) }

export function movementSeries(map, key) {
  const arr = (map[key] || []).slice().sort((a, b) => a.week - b.week)
  const weighted = arr.some((x) => x.w)
  return {
    weighted,
    unit: weighted ? 'lb' : 'reps',
    points: arr.map((x) => ({ label: `W${x.week}`, value: Number(weighted ? x.w : x.n) })).filter((p) => !isNaN(p.value) && p.value > 0),
  }
}

export function runSeries(map, field) {
  return (map.run || []).slice().sort((a, b) => a.week - b.week)
    .map((x) => ({ label: `W${x.week}`, value: Number(x[field]) }))
    .filter((p) => !isNaN(p.value) && p.value > 0)
}

// Movements you're still scaling: latest mod flag per movement across weeks.
export function stillModifying(weeks, logs) {
  const latest = {} // movement -> { week, on }
  for (const w of weeks) {
    const sl = logs[`${w.week}:strength`]
    const cl = logs[`${w.week}:circuit`]
    const scan = (sessionKind, exArr, log) => {
      if (!log?.ex || !exArr) return
      exArr.forEach((ex, i) => {
        const e = log.ex[i]
        if (!e || e.mod === undefined) return
        const name = shortName(ex)
        if (!latest[name] || latest[name].week < w.week) latest[name] = { week: w.week, on: !!e.mod }
      })
    }
    scan('strength', w.strength?.exercises, sl)
    scan('circuit', w.circuit?.exercises, cl)
  }
  return Object.entries(latest).filter(([, v]) => v.on).map(([name, v]) => ({ name, week: v.week }))
}

// Consecutive most-recent weeks (up to current) with >=1 completed session.
export function currentStreak(weeks, marks, currentIndex) {
  let streak = 0
  for (let i = currentIndex; i >= 0; i--) {
    const w = weeks[i]
    const done = ['run', 'strength', 'circuit'].some((s) => {
      const m = marks[`${w.week}:${s}`]
      return m === 'done' || m === 'backup'
    })
    if (done) streak++
    else if (i < currentIndex) break // allow the current in-progress week to not break it
  }
  return streak
}

export function logSummary(kind, log) {
  if (!logHasData(log)) return ''
  if (kind === 'run') {
    return [log.min ? `${log.min} min` : '', log.mi ? `${log.mi} mi` : ''].filter(Boolean).join(' · ')
  }
  const mod = anyModified(log) ? ' · modified' : ''
  if (kind === 'circuit') {
    return (log.rounds ? `${log.rounds} rounds` : 'logged') + mod
  }
  const n = log.ex ? Object.values(log.ex).filter((e) => e && (e.n || e.w)).length : 0
  return (n ? `${n} logged` : 'logged') + mod
}
