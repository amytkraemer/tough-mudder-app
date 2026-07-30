import { useState } from 'react'
import { BACKUP } from '../data/plan.js'
import { logHasData, logSummary, anyModified, shortName } from '../lib/metrics.js'
import { modificationFor } from '../data/modifications.js'
import { parseRun } from '../lib/runIntervals.js'
import SessionLog from './SessionLog.jsx'
import RunTimer from './RunTimer.jsx'

const SPINE = { run: 'var(--lichen)', strength: 'var(--blaze)', circuit: 'var(--clay)' }
const DAYMETA = {
  run: { day: 'Day 1', type: 'Run', where: 'Outside, treadmill, or hotel stairwell' },
  strength: { day: 'Day 2', type: 'Strength', where: 'Hotel room, straps, or gym' },
  circuit: { day: 'Day 3', type: 'Circuit', where: 'Hotel room, zero equipment' },
}

const MARKS = [
  { v: 'done', label: 'Done', hint: 'Full session' },
  { v: 'backup', label: 'Backup', hint: '15-min travel' },
  { v: 'partial', label: 'Partial', hint: 'Some of it' },
  { v: 'missed', label: 'Missed', hint: 'Skipped' },
]
const MARK_STYLE = {
  done: 'bg-lichen border-lichen text-bog',
  backup: 'bg-blaze border-blaze text-bog',
  partial: 'bg-clay border-clay text-bog',
  missed: 'bg-alarm border-alarm text-bog',
}

export function StatusPill({ mark }) {
  if (!mark) return null
  const m = MARKS.find((x) => x.v === mark)
  return (
    <span className={`font-cond font-bold uppercase text-[.6rem] tracking-wider px-2 py-1 rounded ${MARK_STYLE[mark]}`}>
      {m.label}
    </span>
  )
}

export default function SessionCard({ kind, week, mark, onMark, log, onLog, prev, label, titleOverride, onRemove }) {
  const [showBackup, setShowBackup] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [showMods, setShowMods] = useState(false)
  const [timer, setTimer] = useState(false)
  const meta = DAYMETA[kind]
  const isRun = kind === 'run'
  const content = isRun ? null : week[kind]
  const hasLog = logHasData(log)
  const runText = isRun ? (titleOverride || week.run) : ''
  const guided = isRun ? parseRun(runText) : null
  const modList = isRun ? [] : content.exercises
    .map((ex, i) => ({ i, ex, tip: modificationFor(ex) }))
    .filter((x) => x.tip)

  return (
    <article
      className="bg-surface border border-line rounded p-4 mb-3"
      style={{ borderLeft: `3px solid ${SPINE[kind]}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-cond font-bold uppercase tracking-[.12em] text-[.62rem] text-bone-dim">
            {label || `${meta.day} · ${meta.type}`}
          </p>
          <h3 className="font-bold text-[1.12rem] leading-tight mt-0.5">
            {isRun ? (titleOverride || week.run) : content.label}
          </h3>
          {!isRun && <p className="text-sm text-bone-dim mt-0.5">{content.scheme}</p>}
        </div>
        <div className="flex items-center gap-2 flex-none">
          <StatusPill mark={mark} />
          {onRemove && (
            <button onClick={onRemove} aria-label="Remove session" className="text-bone-dim px-1 no-tap-highlight text-lg leading-none">✕</button>
          )}
        </div>
      </div>

      {isRun ? (
        <div className="mt-3 text-sm text-bone-dim">
          <p>{meta.where}</p>
          <p className="mt-1">5 min brisk walk to warm up and cool down. Pace: able to talk in full sentences.</p>
          {guided ? (
            <button
              onClick={() => setTimer(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded border border-lichen text-lichen font-cond font-bold uppercase text-[.72rem] tracking-wide py-2.5 no-tap-highlight"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z" /></svg>
              Guided intervals
            </button>
          ) : (
            <p className="mt-2 text-[.78rem] text-bone-dim italic">Free run — go by feel, then log your time and distance.</p>
          )}
        </div>
      ) : (
        <>
          <ul className="cues mt-3">
            {content.exercises.map((e, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: e }} />
            ))}
          </ul>
          {content.progression && (
            <p className="mt-2 text-[.82rem] text-lichen">{content.progression}</p>
          )}
          {content.grip && content.grip.length > 0 && (
            <div className="mt-3 rounded p-2.5" style={{ background: 'rgba(242,163,60,.08)', borderLeft: '2px solid var(--blaze)' }}>
              <p className="font-cond font-bold uppercase text-[.62rem] tracking-wider text-blaze mb-1">Grip work</p>
              <ul className="cues">
                {content.grip.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          )}
        </>
      )}

      {/* easier options + "did modified" tracking */}
      {modList.length > 0 && (
        <>
          <button
            onClick={() => setShowMods((s) => !s)}
            className="mt-3 mr-4 text-[.8rem] text-lichen underline"
          >
            {showMods ? 'Hide easier options' : 'Easier options'}
            {!showMods && anyModified(log) && <span className="text-blaze"> · modified</span>}
          </button>
          {showMods && (
            <div className="mt-2 rounded border border-line bg-bog p-3">
              <p className="text-[.72rem] text-bone-dim mb-2">Can’t do the full version yet? Do the easier one and check it off — it still counts.</p>
              {modList.map(({ i, ex, tip }) => {
                const on = !!log?.ex?.[i]?.mod
                return (
                  <div key={i} className="py-2 border-t border-line first:border-t-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="text-[.86rem] font-semibold">{shortName(ex)}</div>
                        <div className="text-[.78rem] text-bone-dim mt-0.5">{tip}</div>
                      </div>
                      <button
                        onClick={() => onLog({ ex: { [i]: { mod: !on } } })}
                        aria-pressed={on}
                        className={`flex-none flex items-center gap-1.5 rounded border px-2.5 py-1.5 no-tap-highlight ${
                          on ? 'bg-blaze border-blaze text-bog' : 'border-line text-bone-dim'
                        }`}
                      >
                        <span className="text-sm leading-none">{on ? '☑' : '☐'}</span>
                        <span className="font-cond font-bold uppercase text-[.62rem] tracking-wide">Modified</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* backup helper */}
      <button
        onClick={() => setShowBackup((s) => !s)}
        className="mt-3 text-[.8rem] text-bone-dim underline"
      >
        {showBackup ? 'Hide' : 'What counts as a'} Backup{showBackup ? '' : '?'}
      </button>
      {showBackup && (
        <div className="mt-2 rounded p-3 bg-surface-2 border border-line">
          <p className="font-cond font-bold uppercase text-[.62rem] tracking-wider text-blaze">{BACKUP.label}</p>
          <p className="text-[.8rem] text-bone-dim mb-1">{BACKUP.scheme}</p>
          <ul className="cues">
            {BACKUP.exercises.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
          <p className="text-[.8rem] text-bone-dim mt-2">Marking Backup logs the 15-min travel workout. It counts toward your totals.</p>
        </div>
      )}

      {/* log what you actually did */}
      <button
        onClick={() => setShowLog((s) => !s)}
        className="mt-3 w-full flex items-center justify-between rounded border border-line px-3 py-2.5 no-tap-highlight"
      >
        <span className="font-cond font-bold uppercase text-[.7rem] tracking-wider text-bone">
          {showLog ? 'Hide log' : 'Log what you did'}
        </span>
        {hasLog && !showLog && (
          <span className="font-cond font-semibold uppercase text-[.64rem] tracking-wide text-blaze">{logSummary(kind, log)} ›</span>
        )}
        {!hasLog && !showLog && <span className="text-bone-dim text-lg leading-none">＋</span>}
        {showLog && <span className="text-bone-dim text-sm">▲</span>}
      </button>
      {showLog && (
        <div className="mt-2 rounded border border-line bg-bog p-3">
          <SessionLog kind={kind} week={week} log={log} onLog={onLog} prev={prev} />
        </div>
      )}

      {/* mark buttons — big, sweaty-hands targets */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {MARKS.map((m) => {
          const active = mark === m.v
          return (
            <button
              key={m.v}
              onClick={() => onMark(m.v)}
              className={`flex flex-col items-center justify-center min-h-[64px] rounded border-2 no-tap-highlight transition-colors ${
                active ? MARK_STYLE[m.v] : 'bg-bog border-line text-bone active:bg-surface-2'
              }`}
            >
              <span className="font-cond font-bold uppercase tracking-wide text-base">{m.label}</span>
              <span className={`text-[.66rem] ${active ? 'opacity-80' : 'text-bone-dim'}`}>{m.hint}</span>
            </button>
          )
        })}
      </div>

      {timer && guided && (
        <RunTimer
          title={runText}
          intervals={guided.intervals}
          onClose={() => setTimer(false)}
          onDone={(min) => { onLog({ min: String(min) }); if (!mark) onMark('done'); setTimer(false) }}
        />
      )}
    </article>
  )
}
