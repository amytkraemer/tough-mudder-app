import { useState, useMemo } from 'react'
import { computeStats } from '../lib/stats.js'
import { buildLogIndex, prevFor } from '../lib/metrics.js'
import { markKey } from '../lib/storage.js'
import ExtraArea from './ExtraArea.jsx'
import OverlaySection from './OverlaySection.jsx'
import { PHASES } from '../data/plan.js'
import SessionCard, { StatusPill } from './SessionCard.jsx'

const PHASE_ACCENT = { 1: 'var(--mud)', 2: 'var(--blaze)', 3: 'var(--caution)', 4: 'var(--kill)' }
const pct = (n) => `${Math.round(n * 100)}%`

function Marker({ num, state }) {
  const filled = state !== 'ahead'
  return (
    <div
      className={`w-[30px] h-[30px] rounded-full flex items-center justify-center font-display text-sm ${state === 'current' ? 'pulse' : ''}`}
      style={{ background: filled ? 'var(--blaze)' : 'var(--char)', border: `2px solid ${filled ? 'var(--blaze)' : 'var(--steel)'}`, color: filled ? 'var(--pitch)' : 'var(--ash)' }}
    >
      {num}
    </div>
  )
}

function CourseMap({ phases, perPhase, phaseTotals, currentPhaseId }) {
  return (
    <div className="relative mb-5">
      <div className="absolute left-[16px] top-4 bottom-4 w-[3px]" aria-hidden="true"
        style={{ backgroundImage: 'repeating-linear-gradient(var(--steel) 0 6px, transparent 6px 13px)' }} />
      {phases.map((p) => {
        const done = perPhase[p.id] || 0
        const total = phaseTotals[p.id] || 0
        const frac = total ? done / total : 0
        const state = p.id < currentPhaseId ? 'past' : p.id === currentPhaseId ? 'current' : 'ahead'
        return (
          <div key={p.id} className="relative flex gap-3 mb-3">
            <div className="relative z-10 flex-none w-[34px] flex justify-center"><Marker num={p.id} state={state} /></div>
            <div className="flex-1 pt-0.5">
              <div className="flex items-baseline justify-between">
                <span className="font-display uppercase text-[1.05rem] leading-none" style={{ color: state === 'ahead' ? 'var(--ash)' : 'var(--bone)' }}>{p.name}</span>
                <span className="text-[.72rem] text-ash">{done}/{total}{state === 'current' ? ' · here' : ''}</span>
              </div>
              <div className="h-1.5 rounded-full bg-steel overflow-hidden mt-1.5">
                <div className="h-full rounded-full" style={{ width: `${Math.round(frac * 100)}%`, background: PHASE_ACCENT[p.id] }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

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

export default function Plan({ schedule, data, setMark, setLog, addExtra, removeExtra }) {
  const { weeks, currentIndex, daysToRace } = schedule
  const current = weeks[currentIndex]
  const stats = computeStats({ weeks, marks: data.marks })
  const logIndex = useMemo(() => buildLogIndex(weeks, data.logs, data.extra), [weeks, data.logs, data.extra])

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
      <header className="px-5 pt-8 pb-4 border-b border-steel safe-top sticky top-0 z-20 bg-pitch/95 backdrop-blur">
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
        {/* the course: a trail down the screen, one marker per phase */}
        <p className="font-cond font-bold uppercase text-[.62rem] tracking-wider text-ash mb-3">The course</p>
        <CourseMap phases={PHASES.filter((p) => byPhase[p.id]?.length)} perPhase={stats.perPhase} phaseTotals={phaseTotals} currentPhaseId={current.phaseId} />
        <div className="hazard-thin mb-5" aria-hidden="true" />

        {/* phase groups */}
        {PHASES.filter((p) => byPhase[p.id]?.length).map((p) => {
          const open = !!openPhases[p.id]
          const list = byPhase[p.id]
          return (
            <section key={p.id} className="mb-4">
              <button
                onClick={() => setOpenPhases((s) => ({ ...s, [p.id]: !s[p.id] }))}
                className="w-full flex items-center justify-between py-2.5 border-b-2"
                style={{ borderColor: PHASE_ACCENT[p.id] }}
              >
                <div className="flex items-center gap-2.5">
                  <svg width="26" height="34" viewBox="0 0 30 40" aria-hidden="true" className="flex-none">
                    <rect x="13" y="4" width="3" height="34" fill="var(--steel)" />
                    <path d="M16 4h12l-4 5 4 5H16z" fill={PHASE_ACCENT[p.id]} />
                    <text x="21" y="13" textAnchor="middle" fontFamily="'Big Shoulders Display'" fontWeight="800" fontSize="8" fill="var(--pitch)">{p.id}</text>
                  </svg>
                  <span className="font-display uppercase text-lg leading-none">{p.name}</span>
                  <span className="text-[.72rem] text-ash">{list.length} wk</span>
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
                            {['run', 'strength', 'circuit'].map((s) => (
                              <SessionCard
                                key={s}
                                kind={s}
                                week={w}
                                mark={data.marks[markKey(w.week, s)]}
                                onMark={(v) => setMark(w.week, s, v)}
                                log={data.logs[markKey(w.week, s)]}
                                onLog={(patch) => setLog(w.week, s, patch)}
                                prev={prevFor(logIndex, w.week, s, w)}
                              />
                            ))}
                            <OverlaySection week={w} data={data} logIndex={logIndex} setMark={setMark} setLog={setLog} />
                            <ExtraArea
                              week={w}
                              data={data}
                              logIndex={logIndex}
                              setMark={setMark}
                              setLog={setLog}
                              addExtra={addExtra}
                              removeExtra={removeExtra}
                              daysPerWeek={data.settings.daysPerWeek}
                            />
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
