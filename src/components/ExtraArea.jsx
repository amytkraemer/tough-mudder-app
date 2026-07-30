import { useState } from 'react'
import { prevFor } from '../lib/metrics.js'
import { SUPPLEMENTAL, SUPPLEMENTAL_LIST } from '../data/supplemental.js'
import SessionCard from './SessionCard.jsx'

const KIND_LABEL = { run: 'Run', strength: 'Strength', circuit: 'Circuit' }
const RUN_TITLE = 'Easy extra run — your pace & distance'

// Resolve an extra descriptor into everything SessionCard needs.
function resolve(b) {
  if (b.preset && SUPPLEMENTAL[b.preset]) {
    const P = SUPPLEMENTAL[b.preset]
    const isRun = P.kind === 'run'
    return {
      kind: P.kind,
      label: `Extra · ${P.name}`,
      titleOverride: isRun ? `${P.name} · ${P.scheme}` : undefined,
      contentOverride: isRun ? undefined : { label: P.name, scheme: `${P.scheme} · ${P.dur}`, where: P.where || '', exercises: P.exercises, grip: P.note ? [P.note] : [] },
      exercises: P.exercises,
    }
  }
  return {
    kind: b.kind,
    label: `Extra · ${KIND_LABEL[b.kind] || 'Session'}`,
    titleOverride: b.kind === 'run' ? RUN_TITLE : undefined,
    contentOverride: undefined,
    exercises: null,
  }
}

export default function ExtraArea({ week, data, logIndex, setMark, setLog, addExtra, removeExtra, daysPerWeek }) {
  const [adding, setAdding] = useState(false)
  const wk = week.week
  const list = data.extra[wk] || []
  const overlayDays = Math.max(0, (daysPerWeek || 3) - 3)
  const suggestMore = overlayDays > 0 && list.length < overlayDays

  return (
    <div className="mt-1">
      {list.map((b) => {
        const r = resolve(b)
        const holder = r.contentOverride ? { strength: r.contentOverride } : week
        return (
          <SessionCard
            key={b.id}
            kind={r.kind}
            week={week}
            label={r.label}
            titleOverride={r.titleOverride}
            contentOverride={r.contentOverride}
            mark={data.marks[`${wk}:${b.id}`]}
            onMark={(v) => setMark(wk, b.id, v)}
            log={data.logs[`${wk}:${b.id}`]}
            onLog={(patch) => setLog(wk, b.id, patch)}
            prev={prevFor(logIndex, wk, r.kind, holder)}
            onRemove={() => removeExtra(wk, b.id)}
          />
        )
      })}

      {suggestMore && !adding && (
        <p className="text-[.78rem] text-bone-dim mb-2">
          You’re set up for <b className="text-bone">{daysPerWeek} days</b> — the overlay days above cover that. Add anything else below.
        </p>
      )}

      {adding ? (
        <div className="rounded border border-line bg-surface p-3">
          <p className="font-cond font-bold uppercase text-[.62rem] tracking-wider text-bone-dim mb-2">Repeat this week’s session</p>
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

          <p className="font-cond font-bold uppercase text-[.62rem] tracking-wider text-bone-dim mt-3 mb-2">Or a supplemental workout</p>
          <div className="flex flex-col gap-1.5">
            {SUPPLEMENTAL_LIST.map((P) => (
              <button
                key={P.id}
                onClick={() => { addExtra(wk, P.kind, P.id); setAdding(false) }}
                className="text-left px-3 py-2.5 rounded border border-line bg-bog no-tap-highlight active:bg-surface-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-cond font-bold uppercase text-[.72rem] tracking-wide text-bone">{P.name}</span>
                  <span className="text-[.66rem] text-bone-dim">{P.dur}</span>
                </div>
                <div className="text-[.72rem] text-bone-dim">{P.scheme}</div>
              </button>
            ))}
          </div>
          <button onClick={() => setAdding(false)} className="mt-3 text-bone-dim underline text-[.78rem]">Cancel</button>
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
