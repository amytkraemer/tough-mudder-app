// localStorage persistence. Everything lives under one key so export/import is
// a single JSON blob — that export is the only backup.

import { normalizeMeta, emptyMeta } from './lww.js'

const KEY = 'tm.data.v1'
export const CURRENT_VERSION = 2

export function defaultData() {
  return {
    version: CURRENT_VERSION,
    settings: {
      onboarded: false,
      raceDate: '2027-06-26',
      runningBase: 'none',
      daysPerWeek: 3,
      startDate: null,        // captured at onboarding, keeps the schedule stable
      hotelMode: false,
      lastExportPrompt: null, // ISO date we last nudged for a backup
      createdAt: null,
    },
    marks: {},                // "<week>:<session>" -> done|backup|partial|missed
    logs: {},                 // "<week>:<session>" -> performance details
    extra: {},                // "<week>" -> [ { id, kind, n, preset? } ] extra sessions
    hangs: {},                // id -> { id, date, seconds, grip, notes }
    clock: emptyMeta(),       // per-item last-write time (LWW sync)
    tombstones: emptyMeta(),  // per-item deletion time (LWW sync)
  }
}

// hangs was historically an array; it is now an object keyed by id so per-id
// merges never drop entries. Idempotent.
export function hangsToObject(hangs) {
  if (hangs && typeof hangs === 'object' && !Array.isArray(hangs)) return hangs
  const obj = {}
  ;(Array.isArray(hangs) ? hangs : []).forEach((h, i) => {
    const id = h?.id || `h-${h?.date || 'x'}-${h?.seconds ?? 0}-${i}`
    obj[id] = { ...h, id }
  })
  return obj
}

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultData()
    const parsed = JSON.parse(raw)
    const migrated = migrate(parsed)
    // Persist the migrated shape once, so migration doesn't re-run every load.
    if (needsWriteback(parsed)) saveData(migrated)
    return migrated
  } catch {
    return defaultData()
  }
}

function needsWriteback(parsed) {
  return parsed?.version !== CURRENT_VERSION || Array.isArray(parsed?.hangs) ||
    (parsed && 'bonus' in parsed) || !parsed?.clock || !parsed?.tombstones
}

export function migrate(data) {
  const d = defaultData()
  const { bonus, ...rest } = data || {} // drop the legacy "bonus" key
  const migrated = {
    ...d,
    ...rest,
    settings: { ...d.settings, ...(data?.settings || {}) },
    marks: data?.marks || {},
    logs: data?.logs || {},
    // migrate the former "bonus" key to "extra", and hangs array -> id-keyed
    // object, both with no data loss
    extra: data?.extra || bonus || {},
    hangs: hangsToObject(data?.hangs),
    clock: data?.clock || emptyMeta(),
    tombstones: data?.tombstones || emptyMeta(),
    version: CURRENT_VERSION,
  }
  // Backfill clocks for pre-LWW items and drop expired tombstones.
  return normalizeMeta(migrated)
}

export function saveData(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
}

export function markKey(week, session) { return `${week}:${session}` }

export function exportJSON(data) {
  return JSON.stringify(data, null, 2)
}

export function importJSON(text) {
  const parsed = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null) throw new Error('Not a valid backup file')
  return migrate(parsed) // handles pre-rename exports + legacy hangs arrays
}

export function downloadBackup(data) {
  const blob = new Blob([exportJSON(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const today = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `tough-mudder-backup-${today}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
