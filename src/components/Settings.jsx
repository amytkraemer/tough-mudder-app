import { useState, useRef } from 'react'
import { RUNNING_BASE, buildSchedule } from '../lib/schedule.js'
import { downloadBackup, importJSON } from '../lib/storage.js'
import { BEGINNER_VOLUME_WARNING } from '../data/overlays.js'

const STATUS_LABEL = {
  init: { t: 'Connecting…', c: 'var(--blaze)' },
  syncing: { t: 'Syncing…', c: 'var(--blaze)' },
  synced: { t: 'Synced to cloud', c: 'var(--lichen)' },
  error: { t: 'Sync error — will retry', c: 'var(--alarm)' },
  'signed-out': { t: 'Not signed in', c: 'var(--bone-dim)' },
  disabled: { t: '', c: 'var(--bone-dim)' },
}

function fmtSynced(ts) {
  if (!ts) return null
  try {
    return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch { return null }
}

function SyncSection({ sync }) {
  if (!sync || !sync.enabled) return null
  const st = STATUS_LABEL[sync.status] || STATUS_LABEL['signed-out']
  const syncedAt = fmtSynced(sync.lastSyncedAt)
  return (
    <section className="mb-6">
      <p className="font-cond font-bold uppercase text-[.62rem] tracking-wider text-bone-dim mb-3">Cloud sync</p>
      {sync.user ? (
        <div className="rounded border border-line bg-surface p-3">
          <div className="flex items-center gap-3">
            {sync.user.photoURL
              ? <img src={sync.user.photoURL} alt="" className="w-9 h-9 rounded-full" referrerPolicy="no-referrer" />
              : <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center font-display text-blaze">{(sync.user.displayName || sync.user.email || '?')[0]}</div>}
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{sync.user.displayName || sync.user.email}</div>
              <div className="text-[.72rem]" style={{ color: st.c }}>● {st.t}</div>
              {syncedAt && <div className="text-[.68rem] text-bone-dim mt-0.5">Last synced {syncedAt}</div>}
            </div>
          </div>
          <button onClick={sync.signOut} className="w-full mt-3 py-2.5 rounded border border-line text-bone font-cond font-bold uppercase text-sm tracking-wide">
            Sign out
          </button>
          <p className="text-[.72rem] text-bone-dim mt-2">Your data auto-syncs across every device you sign in on. Each account is private — friends who sign in get their own separate data.</p>
        </div>
      ) : (
        <div className="rounded border border-line bg-surface p-3">
          <p className="text-[.8rem] text-bone-dim mb-3">Sign in to automatically back up and sync your plan, session marks, and grip log across all your devices. Free, and your data stays private to your account.</p>
          <button onClick={sync.signIn} className="w-full py-3 rounded bg-bone text-bog font-cond font-bold uppercase tracking-wide flex items-center justify-center gap-2">
            <GoogleG /> Sign in with Google
          </button>
          {sync.status === 'error' && <p className="text-alarm text-sm mt-2">Sign-in failed. Try again.</p>}
        </div>
      )}
    </section>
  )
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

export default function Settings({ data, update, sync, onClose }) {
  const s = data.settings
  const [raceDate, setRaceDate] = useState(s.raceDate)
  const [daysPerWeek, setDaysPerWeek] = useState(s.daysPerWeek)
  const [runningBase, setRunningBase] = useState(s.runningBase)
  const [importMsg, setImportMsg] = useState(null)
  const fileRef = useRef(null)

  // Preserve the athlete's existing start anchor so tweaking settings mid-plan
  // re-lays the phases in place instead of restarting from today.
  const preview = buildSchedule({ raceDate, runningBase, daysPerWeek, startDate: s.startDate, today: new Date() })

  const save = () => {
    update((d) => {
      d.settings.raceDate = raceDate
      d.settings.daysPerWeek = daysPerWeek
      d.settings.runningBase = runningBase
      d.settings.startDate = buildSchedule({ raceDate, runningBase, daysPerWeek, startDate: s.startDate, today: new Date() }).startDate
      return d
    })
    onClose()
  }

  const onImportFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const next = importJSON(text)
      update(() => next)
      setImportMsg({ ok: true, text: 'Backup imported.' })
      setTimeout(onClose, 700)
    } catch (err) {
      setImportMsg({ ok: false, text: 'Could not read that file. Is it a Tough Mudder backup?' })
    }
  }

  const recordExport = () => {
    downloadBackup(data)
    update((d) => { d.settings.lastExportPrompt = new Date().toISOString(); return d })
  }

  const resetAll = () => {
    if (!confirm('Erase all your data on this device and start over? This cannot be undone. Export a backup first if you want to keep it.')) return
    update((d) => { d.settings.onboarded = false; d.marks = {}; d.hangs = {}; return d })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 bg-bog overflow-y-auto">
      <div className="mx-auto max-w-[760px]">
        <header className="px-5 pt-8 pb-4 border-b border-line safe-top flex items-center justify-between sticky top-0 bg-bog z-10">
          <h1 className="font-display uppercase text-xl">Settings</h1>
          <button onClick={onClose} className="text-bone-dim px-3 py-2 -mr-3 no-tap-highlight font-cond uppercase text-sm">Done</button>
        </header>

        <div className="px-5 py-5">
          <SyncSection sync={sync} />

          {/* schedule inputs */}
          <section className="mb-6">
            <p className="font-cond font-bold uppercase text-[.62rem] tracking-wider text-bone-dim mb-3">Schedule</p>

            <label className="block mb-4">
              <span className="text-sm">Race date</span>
              <input type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)}
                className="mt-1 w-full bg-surface border border-line rounded px-3 py-3 text-bone text-base focus:outline-none focus:border-blaze" />
            </label>

            <div className="mb-4">
              <span className="text-sm">Days per week</span>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {[3, 4, 5, 6].map((n) => (
                  <button key={n} onClick={() => setDaysPerWeek(n)}
                    className={`py-3 rounded border font-display text-lg ${daysPerWeek === n ? 'bg-blaze border-blaze text-bog' : 'bg-surface border-line text-bone'}`}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[.72rem] text-bone-dim mt-1.5">
                Core 3 stay fixed (Run 1 · Strength · Circuit). Extra days add overlays in order:
                <b className="text-bone"> 4</b> Grip &amp; Pull · <b className="text-bone">5</b> Easy Run 2 · <b className="text-bone">6</b> Mobility &amp; Carry.
              </p>
              {daysPerWeek >= 5 && runningBase === 'none' && (
                <p className="mt-2 text-[.8rem] rounded px-3 py-2" style={{ background: 'rgba(255,212,0,.12)', borderLeft: '3px solid var(--caution,#FFD400)', color: 'var(--bone)' }}>
                  {BEGINNER_VOLUME_WARNING}
                </p>
              )}
            </div>

            <div className="mb-4">
              <span className="text-sm">Running base</span>
              <div className="flex flex-col gap-2 mt-1">
                {Object.entries(RUNNING_BASE).map(([k, v]) => (
                  <button key={k} onClick={() => setRunningBase(k)}
                    className={`text-left px-3 py-2.5 rounded border ${runningBase === k ? 'bg-blaze/15 border-blaze' : 'bg-surface border-line'}`}>
                    <span className="font-cond font-semibold uppercase tracking-wide text-sm">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded border border-line bg-surface p-3 text-[.8rem] text-bone-dim">
              New plan: <b className="text-bone">{preview.totalWeeks} weeks</b>, starting the week of{' '}
              <b className="text-bone">{new Date(preview.startDate + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</b>.
              Phase 1 runs {preview.layout.P1} wk · Phase 2 {preview.layout.P2} wk · Phase 3 {preview.layout.P3} wk · Phase 4 {preview.layout.terrain + preview.layout.taper} wk.
              {preview.warnings.includes('compressed') && <span className="block mt-1 text-alarm">Time is tight — Phase 2 then Phase 3 compressed. The final 2 taper weeks are protected.</span>}
              {preview.warnings.includes('too-tight') && <span className="block mt-1 text-alarm">The race is very close. The plan can’t fit fully — do what you can.</span>}
              {preview.warnings.includes('extended') && <span className="block mt-1 text-lichen">Spare weeks added to Phase 2 (Strength Build).</span>}
            </div>

            <button onClick={save} className="w-full mt-4 py-3.5 rounded bg-blaze text-bog font-cond font-bold uppercase tracking-wide">
              Save & recalculate schedule
            </button>
          </section>

          {/* backup */}
          <section className="mb-6">
            <p className="font-cond font-bold uppercase text-[.62rem] tracking-wider text-bone-dim mb-3">Backup</p>
            <p className="text-[.8rem] text-bone-dim mb-3">
              Your data lives only in this browser. Export a JSON backup regularly — it is the only copy. Import it to move to a new phone or restore after clearing data.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={recordExport} className="py-3.5 rounded border border-lichen text-lichen font-cond font-bold uppercase tracking-wide">
                Export JSON
              </button>
              <button onClick={() => fileRef.current?.click()} className="py-3.5 rounded border border-line text-bone font-cond font-bold uppercase tracking-wide">
                Import JSON
              </button>
            </div>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />
            {importMsg && <p className={`mt-2 text-sm ${importMsg.ok ? 'text-lichen' : 'text-alarm'}`}>{importMsg.text}</p>}
          </section>

          {/* danger */}
          <section className="mb-10">
            <p className="font-cond font-bold uppercase text-[.62rem] tracking-wider text-bone-dim mb-3">Start over</p>
            <button onClick={resetAll} className="w-full py-3 rounded border border-alarm text-alarm font-cond font-bold uppercase tracking-wide">
              Erase data & re-run onboarding
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
