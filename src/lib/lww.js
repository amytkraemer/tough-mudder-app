// Last-write-wins sync with tombstones.
//
// The additive merge this replaced could never express a deletion: removing a
// mark/extra/hang locally was silently restored from the cloud on the next sync.
// Here every synced item carries a timestamp (`clock`), and every deletion
// leaves a tombstone (`tombstones`) with the time it happened. Merge then picks,
// per item, the most recent of {live edit, deletion}:
//   - a deletion beats an OLDER edit of that item          (delete newer  -> gone)
//   - a newer edit beats an OLDER deletion                 (edit newer    -> present)
// Tombstones are pruned after TOMBSTONE_TTL so they can't accumulate forever;
// the window is long enough that every device has converged first.
//
// This module is pure (no Firebase, no storage) so the whole merge is unit
// testable with explicit timestamps.

export const FIELDS = ['marks', 'logs', 'hangs', 'extra']
// Legacy items (created before this feature) have no clock; treat them as
// "present since the beginning of time" so any real edit or deletion beats them,
// but they still survive a merge that has nothing competing.
export const LEGACY_TS = 1
export const TOMBSTONE_TTL_MS = 90 * 24 * 60 * 60 * 1000 // 90 days

export function emptyMeta() {
  return { marks: {}, logs: {}, hangs: {}, extra: {} }
}
function fillMeta(m) {
  const out = emptyMeta()
  for (const f of FIELDS) Object.assign(out[f], (m && m[f]) || {})
  return out
}

// extra is week -> [ {id, ...} ]; flatten to a `${week}:${id}` -> item map so it
// merges with the same machinery as the other id-keyed fields, then rebuild.
export function extraToFlat(extra) {
  const flat = {}
  for (const [week, list] of Object.entries(extra || {})) {
    for (const item of list || []) if (item && item.id != null) flat[`${week}:${item.id}`] = item
  }
  return flat
}
export function flatToExtra(flat) {
  const extra = {}
  for (const [k, item] of Object.entries(flat)) {
    const week = k.slice(0, k.indexOf(':'))
    if (!extra[week]) extra[week] = []
    extra[week].push(item)
  }
  for (const w of Object.keys(extra)) extra[w].sort((a, b) => (a.n || 0) - (b.n || 0))
  return extra
}

function fieldFlat(field, data) {
  return field === 'extra' ? extraToFlat(data.extra) : (data[field] || {})
}

// Ensure clock/tombstones exist and every existing live item has a clock entry
// (legacy backfill). Prune tombstones past the TTL. Mutates and returns `d`.
export function normalizeMeta(d, now = Date.now()) {
  d.clock = fillMeta(d.clock)
  d.tombstones = fillMeta(d.tombstones)
  for (const f of FIELDS) {
    const flat = fieldFlat(f, d)
    for (const k of Object.keys(flat)) if (!(k in d.clock[f])) d.clock[f][k] = LEGACY_TS
  }
  const cutoff = now - TOMBSTONE_TTL_MS
  for (const f of FIELDS) {
    for (const [k, ts] of Object.entries(d.tombstones[f])) if (ts < cutoff) delete d.tombstones[f][k]
  }
  return d
}

// Merge one id-keyed map under LWW. Returns { value, clock, tomb }.
export function mergeMap(lMap, rMap, lClk, rClk, lTmb, rTmb) {
  lMap = lMap || {}; rMap = rMap || {}
  lClk = lClk || {}; rClk = rClk || {}
  lTmb = lTmb || {}; rTmb = rTmb || {}
  const value = {}, clock = {}, tomb = {}
  const keys = new Set([
    ...Object.keys(lMap), ...Object.keys(rMap),
    ...Object.keys(lClk), ...Object.keys(rClk),
    ...Object.keys(lTmb), ...Object.keys(rTmb),
  ])
  for (const k of keys) {
    const lc = lClk[k] || (k in lMap ? LEGACY_TS : 0)
    const rc = rClk[k] || (k in rMap ? LEGACY_TS : 0)
    const lt = lTmb[k] || 0
    const rt = rTmb[k] || 0
    const liveTs = Math.max(lc, rc)
    const deadTs = Math.max(lt, rt)
    // A tombstone only matters if one actually exists (deadTs > 0). On an exact
    // tie the tombstone wins (deletions are sticky); a strictly newer edit wins.
    if (deadTs > 0 && deadTs >= liveTs) {
      tomb[k] = deadTs
    } else if (liveTs > 0) {
      clock[k] = liveTs
      value[k] = lc >= rc
        ? (k in lMap ? lMap[k] : rMap[k])
        : (k in rMap ? rMap[k] : lMap[k])
    }
  }
  return { value, clock, tomb }
}

// Merge the four synced fields of two states under LWW. Callers add settings.
// Both inputs should already be shape-migrated (bonus->extra, hangs->object).
export function mergeStates(local, remote, now = Date.now()) {
  const l = normalizeMeta({ ...clone(local) }, now)
  const r = normalizeMeta({ ...clone(remote) }, now)
  const out = { marks: {}, logs: {}, hangs: {}, extra: {} }
  const clock = emptyMeta(), tombstones = emptyMeta()
  for (const f of FIELDS) {
    const res = mergeMap(fieldFlat(f, l), fieldFlat(f, r), l.clock[f], r.clock[f], l.tombstones[f], r.tombstones[f])
    if (f === 'extra') out.extra = flatToExtra(res.value)
    else out[f] = res.value
    clock[f] = res.clock
    tombstones[f] = res.tomb
  }
  return { marks: out.marks, logs: out.logs, hangs: out.hangs, extra: out.extra, clock, tombstones }
}

// --- mutation helpers used at the edit sites -------------------------------
function ensureMeta(d) {
  if (!d.clock) d.clock = emptyMeta()
  if (!d.tombstones) d.tombstones = emptyMeta()
  for (const f of FIELDS) { if (!d.clock[f]) d.clock[f] = {}; if (!d.tombstones[f]) d.tombstones[f] = {} }
}
// Record that a live item was created/edited now: bump its clock, clear any
// tombstone so a prior deletion can't out-rank this fresh edit.
export function stamp(d, field, key, now = Date.now()) {
  ensureMeta(d)
  d.clock[field][key] = now
  delete d.tombstones[field][key]
}
// Record a deletion now: drop the clock and leave a tombstone.
export function tomb(d, field, key, now = Date.now()) {
  ensureMeta(d)
  delete d.clock[field][key]
  d.tombstones[field][key] = now
}

// --- import ----------------------------------------------------------------
// Importing a backup replaces the CURRENT state with the backup, at import time.
// Every backup item is written with clock=now (so it wins), and every item that
// is live in `current` but absent from the backup is tombstoned at now — so the
// cloud can't silently re-add what the backup omits. `current` and `backup`
// should already be shape-migrated.
export function importInto(current, backup, now = Date.now()) {
  const cur = normalizeMeta(clone(current), now)
  const bk = normalizeMeta(clone(backup), now)
  const out = { marks: {}, logs: {}, hangs: {}, extra: {} }
  const clock = emptyMeta(), tombstones = emptyMeta()
  for (const f of FIELDS) {
    const curFlat = fieldFlat(f, cur)
    const bkFlat = fieldFlat(f, bk)
    const live = {}
    for (const k of Object.keys(bkFlat)) { live[k] = bkFlat[k]; clock[f][k] = now }
    // carry any tombstones the backup itself recorded
    for (const [k, ts] of Object.entries(bk.tombstones[f])) if (!(k in bkFlat)) tombstones[f][k] = Math.max(tombstones[f][k] || 0, ts)
    // omissions: live in current, absent from the backup -> delete now
    for (const k of Object.keys(curFlat)) if (!(k in bkFlat)) tombstones[f][k] = now
    // keep older current tombstones too (unless the backup re-adds that item)
    for (const [k, ts] of Object.entries(cur.tombstones[f])) if (!(k in bkFlat)) tombstones[f][k] = Math.max(tombstones[f][k] || 0, ts)
    if (f === 'extra') out.extra = flatToExtra(live)
    else out[f] = live
  }
  return { settings: bk.settings, marks: out.marks, logs: out.logs, hangs: out.hangs, extra: out.extra, clock, tombstones }
}

// --- tombstone GC ----------------------------------------------------------
// Field paths (under `tombstones`) for tombstones older than the TTL, so the
// caller can delete them from the cloud document (a merge-write can't).
export function staleTombstonePaths(tombstones, now = Date.now()) {
  const cutoff = now - TOMBSTONE_TTL_MS
  const paths = []
  for (const f of FIELDS) {
    for (const [k, ts] of Object.entries((tombstones && tombstones[f]) || {})) {
      if (ts < cutoff) paths.push(`tombstones.${f}.${k}`)
    }
  }
  return paths
}

function clone(x) {
  return x ? JSON.parse(JSON.stringify(x)) : {}
}
