import { useState, useRef } from 'react'
import { RUNNING_BASE, buildSchedule } from '../lib/schedule.js'
import { downloadBackup, importJSON } from '../lib/storage.js'

export default function Settings({ data, update, onClose }) {
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
    update((d) => { d.settings.onboarded = false; d.marks = {}; d.hangs = []; return d })
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
