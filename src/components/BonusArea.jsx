import { useState } from 'react'
import { prevFor } from '../lib/metrics.js'
import SessionCard from './SessionCard.jsx'

const KIND_LABEL = { run: 'Extra run', strength: 'Extra strength', circuit: 'Extra circuit' }
const RUN_TITLE = 'Easy extra run — your pace & distance'

export default function BonusArea({ week, data, logIndex, setMark, setLog, addBonus, removeBonus, daysPerWeek }) {
  const [adding, setAdding] = useState(false)
  const wk = week.week
  const list = data.bonus[wk] || []
  const extraDays = Math.max(0, (daysPerWeek || 3) - 3)
  const suggestMore = extraDays > 0 && list.length < extraDays

  return (
    <div className="mt-1">
      {list.map((b) => (
        <SessionCard
          key={b.id}
          kind={b.kind}
          week={week}
          label={`Bonus · ${KIND_LABEL[b.kind]}`}
          titleOverride={b.kind === 'run' ? RUN_TITLE : undefined}
          mark={data.marks[`${wk}:${b.id}`]}
          onMark={(v) => setMark(wk, b.id, v)}
          log={data.logs[`${wk}:${b.id}`]}
          onLog={(patch) => setLog(wk, b.id, patch)}
          prev={prevFor(logIndex, wk, b.kind, week)}
          onRemove={() => removeBonus(wk, b.id)}
        />
      ))}

      {suggestMore && !adding && (
        <p className="text-[.78rem] text-bone-dim mb-2">
          You’re set up for <b className="text-bone">{daysPerWeek} days</b> — that’s {extraDays} beyond the 3 core sessions. Add bonus work below.
        </p>
      )}

      {adding ? (
        <div className="rounded border border-line bg-surface p-3">
          <p className="font-cond font-bold uppercase text-[.62rem] tracking-wider text-bone-dim mb-2">Add a session this week</p>
          <div className="grid grid-cols-3 gap-2">
            {['run', 'strength', 'circuit'].map((k) => (
              <button
                key={k}
                onClick={() => { addBonus(wk, k); setAdding(false) }}
                className="py-3 rounded border border-line bg-bog text-bone font-cond font-bold uppercase text-[.7rem] tracking-wide no-tap-highlight active:bg-surface-2"
              >
                {KIND_LABEL[k].replace('Extra ', '')}
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
