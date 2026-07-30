import { useMemo } from 'react'
import { markKey } from '../lib/storage.js'
import { dayPlan } from '../lib/schedule.js'
import { buildLogIndex, prevFor } from '../lib/metrics.js'
import SessionCard from './SessionCard.jsx'
import OverlaySection from './OverlaySection.jsx'
import ExtraArea from './ExtraArea.jsx'

const PHASE_ACCENT = { 1: 'var(--mud)', 2: 'var(--blaze)', 3: 'var(--caution)', 4: 'var(--kill)' }

// mud splatter — one reused asset, low opacity, kept out from behind body text
export function MudSplatter({ className = '', style }) {
  return (
    <svg viewBox="0 0 200 60" className={className} style={style} aria-hidden="true" preserveAspectRatio="none">
      <g fill="var(--mud)">
        <path d="M0 8c14-6 26 2 40-2s22-8 38-4 24 10 40 6 26-10 44-4v-14H0z" opacity=".5" />
        <circle cx="150" cy="30" r="5" opacity=".5" /><circle cx="168" cy="20" r="3" opacity=".45" />
        <circle cx="120" cy="34" r="3.5" opacity=".4" /><circle cx="60" cy="26" r="4" opacity=".4" />
        <circle cx="30" cy="30" r="2.5" opacity=".4" /><circle cx="188" cy="34" r="4" opacity=".45" />
        <circle cx="96" cy="30" r="2" opacity=".35" />
      </g>
    </svg>
  )
}

// course mile marker: a stake-and-flag with the phase number stenciled large
export function MileMarker({ phaseId, name }) {
  const c = PHASE_ACCENT[phaseId]
  return (
    <div className="flex items-center gap-2.5">
      <svg width="30" height="40" viewBox="0 0 30 40" aria-hidden="true">
        <rect x="13" y="4" width="3" height="34" fill="var(--steel)" />
        <path d="M16 4h12l-4 5 4 5H16z" fill={c} />
        <text x="21" y="13" textAnchor="middle" fontFamily="'Big Shoulders Display'" fontWeight="800" fontSize="8" fill="var(--pitch)">{phaseId}</text>
      </svg>
      <div>
        <div className="stamped-label" style={{ color: c }}>Phase {phaseId}</div>
        <div className="font-display uppercase text-[1.05rem] leading-none">{name}</div>
      </div>
    </div>
  )
}

export default function Today({ schedule, data, setMark, setLog, addExtra, removeExtra, onOpenSettings, onGoPlan }) {
  const { weeks, currentIndex, status, daysToRace } = schedule
  const week = weeks[currentIndex]
  const marks = data.marks
  const plan = dayPlan(data.settings.daysPerWeek)
  const logIndex = useMemo(() => buildLogIndex(weeks, data.logs, data.extra), [weeks, data.logs, data.extra])

  const doneThisWeek = ['run', 'strength', 'circuit'].filter((s) => {
    const m = marks[markKey(week.week, s)]
    return m === 'done' || m === 'backup'
  }).length

  return (
    <div>
      <header className="relative px-5 pt-8 pb-5 safe-top overflow-hidden">
        <MudSplatter className="absolute top-0 right-0 w-2/3 h-16 opacity-40 pointer-events-none" />
        <div className="relative flex items-start justify-between">
          <MileMarker phaseId={week.phaseId} name={week.phase.name} />
          <button onClick={onOpenSettings} aria-label="Settings" className="p-2 -mr-2 text-ash no-tap-highlight">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        </div>

        {/* days-to-race = the biggest thing on the screen */}
        <div className="relative mt-3 flex items-end gap-3">
          <div className="font-display text-blaze leading-[.78]" style={{ fontSize: 'clamp(4.5rem,25vw,7.5rem)' }}>{daysToRace}</div>
          <div className="pb-2">
            <div className="stamped-label">Days to</div>
            <div className="font-display uppercase text-3xl leading-none">Race</div>
          </div>
        </div>
        <div className="relative mt-1.5 text-sm text-ash">
          Week <b className="text-bone font-display text-base align-baseline">{week.week}</b> of {weeks.length} · week of <b className="text-bone">{week.dateLabel}</b>
        </div>

        {status === 'not-started' && (
          <p className="relative mt-3 text-sm text-blaze">Your plan starts the week of {weeks[0].dateLabel}. Here’s week 1 to get ready.</p>
        )}
        {status === 'finished' && (
          <p className="relative mt-3 text-sm text-blaze">Race week is done. Go get muddy. 🏁</p>
        )}
      </header>
      <div className="hazard" aria-hidden="true" />

      <div className="px-5 py-5">
        {/* week progress + day plan */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className={`h-2 w-8 rounded-full ${i < doneThisWeek ? 'bg-lichen' : 'bg-line'}`} />
            ))}
            <span className="text-sm text-bone-dim ml-2">{doneThisWeek}/3 this week</span>
          </div>
          <button onClick={onGoPlan} className="text-sm text-lichen underline">Full plan →</button>
        </div>

        {/* suggested day layout */}
        <div className="chips mb-5">
          {plan.map((p, i) => {
            const isCore = p.k === 'run' || p.k === 'strength' || p.k === 'circuit'
            const label = { run: 'Run', strength: 'Strength', circuit: 'Circuit', grip: 'Grip & Pull', run2: 'Easy Run', mobility: 'Mobility' }[p.k]
            return (
              <span key={i}
                className={`flex-none font-cond font-semibold uppercase text-[.66rem] tracking-wide px-2.5 py-1.5 rounded border ${isCore ? 'border-blaze/50 text-blaze' : 'border-steel text-ash'}`}>
                {p.d} · {label}
              </span>
            )
          })}
        </div>

        {['run', 'strength', 'circuit'].map((s) => (
          <SessionCard
            key={s}
            kind={s}
            week={week}
            mark={marks[markKey(week.week, s)]}
            onMark={(v) => setMark(week.week, s, v)}
            log={data.logs[markKey(week.week, s)]}
            onLog={(patch) => setLog(week.week, s, patch)}
            prev={prevFor(logIndex, week.week, s, week)}
          />
        ))}

        <OverlaySection week={week} data={data} logIndex={logIndex} setMark={setMark} setLog={setLog} />

        <ExtraArea
          week={week}
          data={data}
          logIndex={logIndex}
          setMark={setMark}
          setLog={setLog}
          addExtra={addExtra}
          removeExtra={removeExtra}
          daysPerWeek={data.settings.daysPerWeek}
        />

        <p className="text-[.8rem] text-bone-dim mt-4 leading-relaxed">
          <b className="text-bone">Never skip Day 2.</b> If a week falls apart from travel, the strength day is the one that matters most. And dead hang every day you can.
        </p>
      </div>
    </div>
  )
}
