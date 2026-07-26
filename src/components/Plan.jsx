import { useState } from 'react'
import { computeStats } from '../lib/stats.js'
import { markKey } from '../lib/storage.js'
import { PHASES } from '../data/plan.js'
import SessionCard, { StatusPill } from './SessionCard.jsx'

const PHASE_ACCENT = { 1: 'var(--lichen)', 2: 'var(--blaze)', 3: 'var(--clay)', 4: 'var(--alarm)' }
const pct = (n) => `${Math.round(n * 100)}%`

function Stat({ big, label, accent, sub }) {
  return (
    <div className="bg-surface border border-line rounded p-3">
      <div className="font-display text-2xl" style={{ color: accent || 'var(--bone)' }}>{big}</div>
      <div className="text-[.7rem] uppercase tracking-wide font-cond font-semibold text-bone-dim mt-0.5">{label}</div>
      {sub && <div className="text-[.7rem] text-bone-dim mt-0.5">{sub}</div>}
    </div>
  )
}

function SessionMini({ kind, mark }) {
  const label = kind === 'run' ? 'Run' : kind === 'strength' ? 'Str' : 'Cir'
  const color = mark === 'done' ? 'var(--lichen)' : mark === 'backup' ? 'var(--blaze)'
    : mark === 'partial' ? 'var(--clay)' : mark === 'missed' ? 'var(--alarm)' : 'var(--line)'
  return (
    <span className="flex items-center gap-1 text-[.66rem] font-cond font-semibold uppercase text-bone-dim">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

export default function Plan({ schedule, data, setMark }) {
  const { weeks, currentIndex, daysToRace } = schedule
  const current = weeks[currentIndex]
  const stats = computeStats({ weeks, marks: data.marks })

  const [openPhases, setOpenPhases] = useState(() => ({ [current.phaseId]: true }))
  const [openWeek, setOpenWeek] = useState(current.week)

  // group weeks by phase
  const byPhase = {}
  for (const w of weeks) (byPhase[w.phaseId] ||= []).push(w)

  const phaseTotals = {}
  for (const w of weeks) phaseTotals[w.phaseId] = (phaseTotals[w.phaseId] || 0) + 3

  return (
    <div>
      {/* pinned stats */}
      <header className="px-5 pt-8 pb-4 border-b border-line safe-top sticky top-0 z-20 bg-bog/95 backdrop-blur">
        <p className="eyebrow mb-1">The Plan</p>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Stat big={daysToRace} label="Days to race" accent="var(--blaze)" />
          <Stat big={`${stats.completed}/${stats.scheduledToDate}`} label="Done vs scheduled" sub={`${stats.totalScheduled} total`} />
          <Stat big={pct(stats.completionRate)} label="Completion rate" accent="var(--lichen)" />
          <Stat
            big={pct(stats.backupShare)}
            label="Backup share"
            accent={stats.backupWarning ? 'var(--alarm)' : 'var(--bone)'}
            sub={stats.backupWarning ? 'Over 30% — strength stalling' : 'of completed'}
          />
        </div>
      </header>

      <div className="px-5 py-4">
        {/* per-phase progress bars */}
        <div className="mb-5">
          <p className="font-cond font-bold uppercase text-[.62rem] tracking-wider text-bone-dim mb-2">Progress by phase</p>
          {PHASES.map((p) => {
            const done = stats.perPhase[p.id] || 0
            const total = phaseTotals[p.id] || 0
            const frac = total ? done / total : 0
            return (
              <div key={p.id} className="mb-2">
                <div className="flex justify-between text-[.75rem] mb-1">
                  <span className="text-bone">{p.name}</span>
                  <span className="text-bone-dim">{done}/{total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-line overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: pct(frac), background: PHASE_ACCENT[p.id] }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* phase groups */}
        {PHASES.filter((p) => byPhase[p.id]?.length).map((p) => {
          const open = !!openPhases[p.id]
          const list = byPhase[p.id]
          return (
            <section key={p.id} className="mb-4">
              <button
                onClick={() => setOpenPhases((s) => ({ ...s, [p.id]: !s[p.id] }))}
                className="w-full flex items-center justify-between py-2 border-b border-line"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-display uppercase text-base" style={{ color: PHASE_ACCENT[p.id] }}>
                    {p.id}. {p.name}
                  </span>
                  <span className="text-[.72rem] text-bone-dim">{list.length} wk</span>
                </div>
                <Chevron open={open} />
              </button>
              {open && (
                <>
                  <p className="text-[.78rem] text-bone-dim mt-2 mb-3">{p.goal}</p>
                  {list.map((w) => {
                    const weekOpen = openWeek === w.week
                    const isCurrent = w.week === current.week
                    return (
                      <div key={w.week} className={`mb-2 rounded border ${isCurrent ? 'border-blaze' : 'border-line'} overflow-hidden`}>
                        <button
                          onClick={() => setOpenWeek(weekOpen ? -1 : w.week)}
                          className="w-full flex items-center justify-between px-3 py-3 bg-surface no-tap-highlight"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-display text-lg w-8 text-left" style={{ color: isCurrent ? 'var(--blaze)' : 'var(--bone)' }}>
                              {w.week}
                            </span>
                            <div className="text-left">
                              <div className="text-[.72rem] text-bone-dim">Week of {w.dateLabel}{isCurrent ? ' · now' : ''}{w.isRaceWeek ? ' · race' : ''}</div>
                              <div className="flex gap-3 mt-1">
                                <SessionMini kind="run" mark={data.marks[markKey(w.week, 'run')]} />
                                <SessionMini kind="strength" mark={data.marks[markKey(w.week, 'strength')]} />
                                <SessionMini kind="circuit" mark={data.marks[markKey(w.week, 'circuit')]} />
                              </div>
                            </div>
                          </div>
                          <Chevron open={weekOpen} />
                        </button>
                        {weekOpen && (
                          <div className="px-3 pt-1 pb-3 bg-bog">
                            <SessionCard kind="run" week={w} mark={data.marks[markKey(w.week, 'run')]} onMark={(v) => setMark(w.week, 'run', v)} />
                            <SessionCard kind="strength" week={w} mark={data.marks[markKey(w.week, 'strength')]} onMark={(v) => setMark(w.week, 'strength', v)} />
                            <SessionCard kind="circuit" week={w} mark={data.marks[markKey(w.week, 'circuit')]} onMark={(v) => setMark(w.week, 'circuit', v)} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Chevron({ open }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9DAA9F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}
