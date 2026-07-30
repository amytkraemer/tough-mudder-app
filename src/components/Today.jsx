import { useMemo } from 'react'
import { markKey } from '../lib/storage.js'
import { dayPlan } from '../lib/schedule.js'
import { buildLogIndex, prevFor } from '../lib/metrics.js'
import SessionCard from './SessionCard.jsx'
import OverlaySection from './OverlaySection.jsx'
import ExtraArea from './ExtraArea.jsx'

const HATCH = {
  backgroundImage:
    'repeating-linear-gradient(135deg, rgba(242,163,60,.05) 0 2px, transparent 2px 9px)',
}
const PHASE_ACCENT = { 1: 'var(--lichen)', 2: 'var(--blaze)', 3: 'var(--clay)', 4: 'var(--alarm)' }

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
      <header className="px-5 pt-8 pb-5 border-b border-line safe-top" style={HATCH}>
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow mb-1" style={{ color: PHASE_ACCENT[week.phaseId] }}>
              Phase {week.phaseId} · {week.phase.name}
            </p>
            <h1 className="h1">
              Week <em>{week.week}</em>
              <span className="text-bone-dim text-[.9rem] font-body normal-case tracking-normal ml-2 align-middle">
                of {weeks.length}
              </span>
            </h1>
          </div>
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="p-2 -mr-2 text-bone-dim no-tap-highlight"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-4 mt-3 text-sm">
          <div>
            <span className="font-display text-2xl text-blaze">{daysToRace}</span>
            <span className="text-bone-dim ml-1.5">days to race</span>
          </div>
          <div className="h-4 w-px bg-line" />
          <div className="text-bone-dim">
            Week of <b className="text-bone">{week.dateLabel}</b>
          </div>
        </div>

        {status === 'not-started' && (
          <p className="mt-3 text-sm text-blaze">
            Your plan starts the week of {weeks[0].dateLabel}. Here’s week 1 to get ready.
          </p>
        )}
        {status === 'finished' && (
          <p className="mt-3 text-sm text-blaze">Race week is done. Go get muddy. 🏁</p>
        )}
      </header>

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
          {plan.map((p, i) => (
            <span
              key={i}
              className={`flex-none font-cond font-semibold uppercase text-[.66rem] tracking-wide px-2.5 py-1.5 rounded border ${
                p.k === 'hang' ? 'border-line text-bone-dim' : 'border-blaze/40 text-blaze'
              }`}
            >
              {p.d} · {p.k === 'run' ? 'Run' : p.k === 'strength' ? 'Strength' : p.k === 'circuit' ? 'Circuit' : 'Dead hang'}
            </span>
          ))}
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
