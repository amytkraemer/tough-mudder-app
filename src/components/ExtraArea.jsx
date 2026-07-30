import { useState } from 'react'
import { prevFor } from '../lib/metrics.js'
import SessionCard from './SessionCard.jsx'

const KIND_LABEL = { run: 'Run', strength: 'Strength', circuit: 'Circuit' }
const RUN_TITLE = 'Easy extra run — your pace & distance'

// Extra sessions: logged and charted like any session, but never counted in the
// completion denominator. `kind` reuses the week's prescription; a `preset` (from
// the supplemental library) will supply its own content in Part 2.
export default function ExtraArea({ week, data, logIndex, setMark, setLog, addExtra, removeExtra, daysPerWeek }) {
  const [adding, setAdding] = useState(false)
  const wk = week.week
  const list = data.extra[wk] || []
  const overlayDays = Math.max(0, (daysPerWeek || 3) - 3)
  const suggestMore = overlayDays > 0 && list.length < overlayDays

  return (
    <div className="mt-1">
      {list.map((b) => (
        <SessionCard
          key={b.id}
          kind={b.kind}
          week={week}
          label={`Extra · ${KIND_LABEL[b.kind] || 'Session'}`}
          titleOverride={b.kind === 'run' ? RUN_TITLE : undefined}
          mark={data.marks[`${wk}:${b.id}`]}
          onMark={(v) => setMark(wk, b.id, v)}
          log={data.logs[`${wk}:${b.id}`]}
          onLog={(patch) => setLog(wk, b.id, patch)}
          prev={prevFor(logIndex, wk, b.kind, week)}
          onRemove={() => removeExtra(wk, b.id)}
        />
      ))}

      {suggestMore && !adding && (
        <p className="text-[.78rem] text-bone-dim mb-2">
          You’re set up for <b className="text-bone">{daysPerWeek} days</b> — that’s {overlayDays} beyond the 3 core sessions. Add extra work below.
        </p>
      )}

      {adding ? (
        <div className="rounded border border-line bg-surface p-3">
          <p className="font-cond font-bold uppercase text-[.62rem] tracking-wider text-bone-dim mb-2">Add an extra session this week</p>
          <div className="grid grid-cols-3 gap-2">
            {['run', 'strength', 'circuit'].map((k) => (
              <button
                key={k}
                onClick={() => { addExtra(wk, k); setAdding(false) }}
                className="py-3 rounded border border-line bg-bog text-bone font-cond font-bold uppercase text-[.7rem] tracking-wide no-tap-highlight active:bg-surface-2"
              >
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <p className="text-[.72rem] text-bone-dim mt-2">Uses this week’s prescription — an extra strength repeats this week’s strength workout, etc.</p>
          <button onClick={() => setAdding(false)} className="mt-2 text-bone-dim underline text-[.78rem]">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-3 rounded border border-dashed border-line text-bone-dim font-cond font-bold uppercase text-[.72rem] tracking-wide no-tap-highlight"
        >
          ＋ Add a session
        </button>
      )}
    </div>
  )
}
