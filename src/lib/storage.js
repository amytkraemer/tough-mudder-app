// localStorage persistence. Everything lives under one key so export/import is
// a single JSON blob — that export is the only backup.

const KEY = 'tm.data.v1'
export const CURRENT_VERSION = 1

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
    marks: {},                // "<week>:<run|strength|circuit>" -> done|backup|partial|missed
    hangs: [],                // { id, date, seconds, grip, notes }
  }
}

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultData()
    const parsed = JSON.parse(raw)
    return migrate(parsed)
  } catch {
    return defaultData()
  }
}

function migrate(data) {
  const d = defaultData()
  return {
    ...d,
    ...data,
    settings: { ...d.settings, ...(data.settings || {}) },
    marks: data.marks || {},
    hangs: Array.isArray(data.hangs) ? data.hangs : [],
    version: CURRENT_VERSION,
  }
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
  return migrate(parsed)
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
