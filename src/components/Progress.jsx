import { useMemo, useState } from 'react'
import { computeStats, hangStats, hangsArray } from '../lib/stats.js'
import {
  buildLogIndex, loggedMovements, movementSeries, runSeries,
  stillModifying, currentStreak,
} from '../lib/metrics.js'
import Chart from './Chart.jsx'

const HATCH = { backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,106,19,.05) 0 2px, transparent 2px 9px)' }

function Card({ title, right, children }) {
  return (
    <section className="bg-surface border border-line rounded p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="font-cond font-bold uppercase text-[.62rem] tracking-wider text-bone-dim">{title}</p>
        {right}
      </div>
      {children}
    </section>
  )
}

export default function Progress({ schedule, data }) {
  const { weeks, currentIndex, daysToRace } = schedule
  const stats = computeStats({ weeks, marks: data.marks, extra: data.extra })
  const hs = hangStats(data.hangs)
  const hangList = hangsArray(data.hangs)
  const logIndex = useMemo(() => buildLogIndex(weeks, data.logs, data.extra), [weeks, data.logs, data.extra])
  const movements = useMemo(() => loggedMovements(logIndex), [logIndex])
  const streak = currentStreak(weeks, data.marks, currentIndex)
  const scaling = useMemo(() => stillModifying(weeks, data.logs), [weeks, data.logs])

  const [runField, setRunField] = useState('mi')
  const runPts = runSeries(logIndex, runField)

  const [movKey, setMovKey] = useState(movements[0]?.key || '')
  const activeKey = movements.find((m) => m.key === movKey) ? movKey : movements[0]?.key
  const mov = activeKey ? movementSeries(logIndex, activeKey) : null

  const hangPts = hangList.map((h) => ({ label: h.date.slice(5), value: Number(h.seconds) })).filter((p) => p.value > 0)

  return (
    <div>
      <header className="px-5 pt-8 pb-5 border-b border-line safe-top" style={HATCH}>
        <p className="eyebrow mb-2">How it’s trending</p>
        <h1 className="h1">Your <em>progress</em></h1>
      </header>

      <div className="px-5 py-5">
        {/* headline numbers */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-surface border border-line rounded p-3 text-center">
            <div className="font-display text-2xl text-blaze">{daysToRace}</div>
            <div className="text-[.62rem] uppercase tracking-wide font-cond font-semibold text-bone-dim">Days to race</div>
          </div>
          <div className="bg-surface border border-line rounded p-3 text-center">
            <div className="font-display text-2xl text-blaze">{Math.round(stats.plan.rate * 100)}%</div>
            <div className="text-[.62rem] uppercase tracking-wide font-cond font-semibold text-bone-dim">Plan done</div>
          </div>
          <div className="bg-surface border border-line rounded p-3 text-center">
            <div className="font-display text-2xl">{streak}</div>
            <div className="text-[.62rem] uppercase tracking-wide font-cond font-semibold text-bone-dim">Week streak</div>
          </div>
        </div>

        {/* running */}
        <Card
          title="Running"
          right={
            <div className="flex gap-1">
              {[['mi', 'Distance'], ['min', 'Time']].map(([f, l]) => (
                <button key={f} onClick={() => setRunField(f)}
                  className={`font-cond font-semibold uppercase text-[.6rem] tracking-wide px-2 py-1 rounded border ${runField === f ? 'bg-blaze border-blaze text-bog' : 'border-line text-bone-dim'}`}>
                  {l}
                </button>
              ))}
            </div>
          }
        >
          <Chart points={runPts} unit={runField === 'mi' ? 'mi' : 'min'} color="var(--lichen)" />
        </Card>

        {/* strength lift */}
        <Card
          title="Strength"
          right={movements.length > 1 && (
            <select value={activeKey} onChange={(e) => setMovKey(e.target.value)}
              className="bg-bog border border-line rounded px-2 py-1 text-[.72rem] text-bone focus:outline-none focus:border-blaze max-w-[52vw]">
              {movements.map((m) => <option key={m.key} value={m.key}>{m.name}</option>)}
            </select>
          )}
        >
          {mov
            ? <>
                {movements.length === 1 && <p className="text-[.78rem] text-bone mb-1">{movements[0].name}</p>}
                <Chart points={mov.points} unit={mov.unit} color="var(--blaze)" />
              </>
            : <div className="text-bone-dim text-sm py-8 text-center">Log reps or weight on a strength exercise (at least twice) to see it here.</div>}
        </Card>

        {/* grip */}
        <Card title="Dead hang" right={<span className="text-[.72rem] text-bone-dim">PR {hs.pr}s</span>}>
          <Chart points={hangPts} unit="s" color="var(--blaze)" benchmarks={[60, 90]} />
        </Card>

        {/* still scaling */}
        <Card title="Still scaling">
          {scaling.length
            ? <>
                <p className="text-[.78rem] text-bone-dim mb-2">Movements you last did modified. When these feel easy, do the full version and uncheck “Modified”.</p>
                <div className="flex flex-wrap gap-1.5">
                  {scaling.map((s) => (
                    <span key={s.name} className="font-cond font-semibold uppercase text-[.66rem] tracking-wide px-2 py-1 rounded" style={{ background: 'rgba(255,106,19,.16)', color: 'var(--blaze)' }}>
                      {s.name}
                    </span>
                  ))}
                </div>
              </>
            : <p className="text-[.8rem] text-bone-dim">Nothing flagged as modified. Mark “Modified” on a movement when you scale it and it’ll show here.</p>}
        </Card>

        {/* consistency detail */}
        <Card title="Consistency">
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-bone-dim">Core completion</span><span className="text-right">{Math.round(stats.core.rate * 100)}% · {stats.core.doneToDate}/{stats.core.schedToDate}</span>
            <span className="text-bone-dim">Plan completion</span><span className="text-right">{Math.round(stats.plan.rate * 100)}% · {stats.plan.doneToDate}/{stats.plan.schedToDate}</span>
            {stats.overlay.total > 0 && (<>
              <span className="text-bone-dim">Overlay days done</span><span className="text-right">{stats.overlay.doneToDate}/{stats.overlay.schedToDate}</span>
            </>)}
            <span className="text-bone-dim">Extra sessions</span><span className="text-right">{stats.extras.done} done{stats.extras.total ? ` / ${stats.extras.total} added` : ''}</span>
            <span className="text-bone-dim">Backup share</span><span className={`text-right ${stats.backupWarning ? 'text-alarm' : ''}`}>{Math.round(stats.backupShare * 100)}%</span>
            <span className="text-bone-dim">Missed</span><span className="text-right">{stats.missed}</span>
          </div>
        </Card>
      </div>
    </div>
  )
}
