import { exerciseInput, parseTarget, shortName, parseRounds } from '../lib/metrics.js'

// Compact numeric field.
function Num({ value, onChange, placeholder, suffix, w = 'w-full' }) {
  return (
    <div className={`relative ${w}`}>
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bog border border-line rounded px-2.5 py-2.5 text-bone text-base focus:outline-none focus:border-blaze text-center"
      />
      {suffix && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[.66rem] text-bone-dim">{suffix}</span>}
    </div>
  )
}

export default function SessionLog({ kind, content, log, onLog, prev }) {
  const notes = log?.notes || ''
  const prevWeek = prev?.week || (prev?.ex && Object.values(prev.ex)[0]?.week)
  const hint = prevWeek ? <p className="text-[.68rem] text-bone-dim mb-2">Greyed numbers are what you did last time (week {prevWeek}). Beat them.</p> : null

  if (kind === 'run') {
    return (
      <div>
        {hint}
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[.68rem] text-bone-dim">Time
            <Num value={log?.min} onChange={(v) => onLog({ min: v })} placeholder={prev?.min || '0'} suffix="min" />
          </label>
          <label className="text-[.68rem] text-bone-dim">Distance
            <Num value={log?.mi} onChange={(v) => onLog({ mi: v })} placeholder={prev?.mi || '0'} suffix="mi" />
          </label>
        </div>
        <NotesField value={notes} onChange={(v) => onLog({ notes: v })} />
      </div>
    )
  }

  if (kind === 'circuit') {
    return (
      <div>
        {hint}
        <label className="text-[.68rem] text-bone-dim block">Rounds completed
          <Num value={log?.rounds} onChange={(v) => onLog({ rounds: v })} placeholder={prev?.rounds || parseRounds(content?.scheme) || '0'} suffix="rounds" w="w-32" />
        </label>
        <NotesField value={notes} onChange={(v) => onLog({ notes: v })} />
      </div>
    )
  }

  // strength — one row per exercise, input type adapts to the movement
  const exercises = content?.exercises || []
  return (
    <div>
      {hint}
      <div className="flex flex-col gap-1.5">
        {exercises.map((ex, i) => {
          const { metric, weight } = exerciseInput(ex)
          const target = parseTarget(ex, metric)
          const cur = log?.ex?.[i] || {}
          const p = prev?.ex?.[i]
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-[.82rem] text-bone truncate">{shortName(ex)}</span>
              <div className="w-[68px]">
                <Num
                  value={cur.n}
                  onChange={(v) => onLog({ ex: { [i]: { n: v } } })}
                  placeholder={p?.n || target || '0'}
                  suffix={metric === 'seconds' ? 'sec' : 'reps'}
                />
              </div>
              {weight && (
                <div className="w-[62px]">
                  <Num value={cur.w} onChange={(v) => onLog({ ex: { [i]: { w: v } } })} placeholder={p?.w || 'wt'} suffix="lb" />
                </div>
              )}
            </div>
          )
        })}
      </div>
      <NotesField value={notes} onChange={(v) => onLog({ notes: v })} />
    </div>
  )
}

function NotesField({ value, onChange }) {
  return (
    <label className="text-[.68rem] text-bone-dim block mt-2">Notes
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="How it felt, anything to remember"
        className="mt-1 w-full bg-bog border border-line rounded px-3 py-2.5 text-bone text-base focus:outline-none focus:border-blaze"
      />
    </label>
  )
}
