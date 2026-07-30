import { useState } from 'react'
import { stamp, tomb } from '../lib/lww.js'
import { hangStats, hangsArray } from '../lib/stats.js'
import { GRIP_TYPES } from '../data/plan.js'
import { fmtISO } from '../lib/schedule.js'
import LineChart from './LineChart.jsx'

const HATCH = { backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,106,19,.05) 0 2px, transparent 2px 9px)' }

export default function Grip({ data, update }) {
  const hangList = hangsArray(data.hangs) // hangs is an id-keyed object
  const stats = hangStats(hangList)
  const [date, setDate] = useState(() => fmtISO(new Date()))
  const [seconds, setSeconds] = useState('')
  const [grip, setGrip] = useState(GRIP_TYPES[0])
  const [notes, setNotes] = useState('')

  const add = () => {
    const s = Number(seconds)
    if (!s || s <= 0) return
    update((d) => {
      // unique id so per-id sync merge never collides two devices' entries
      const id = `${date}-${Math.round(s)}-${Math.round(performance.now())}-${Object.keys(d.hangs).length}`
      d.hangs[id] = { id, date, seconds: s, grip, notes: notes.trim() }
      stamp(d, 'hangs', id)
      return d
    })
    setSeconds(''); setNotes('')
  }

  const remove = (id) => update((d) => { delete d.hangs[id]; tomb(d, 'hangs', id); return d })

  const sortedDesc = hangList.slice().sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div>
      <header className="px-5 pt-8 pb-5 border-b border-line safe-top" style={HATCH}>
        <p className="eyebrow mb-2">The exercise that decides your race</p>
        <h1 className="h1">Dead hang<br /><em>log</em></h1>
        <p className="text-bone-dim text-sm mt-3 max-w-[46ch]">
          Hang until your grip gives out. Time it, log it. 60 sec by the end of Phase 1, 90 sec by the end of Phase 2.
        </p>
      </header>

      <div className="px-5 py-5">
        {/* PR + averages */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-surface border border-line rounded p-3 text-center">
            <div className="font-display text-3xl text-blaze">{stats.pr}</div>
            <div className="text-[.66rem] uppercase tracking-wide font-cond font-semibold text-bone-dim">PR (sec)</div>
          </div>
          <div className="bg-surface border border-line rounded p-3 text-center">
            <div className="font-display text-3xl">{stats.rolling}</div>
            <div className="text-[.66rem] uppercase tracking-wide font-cond font-semibold text-bone-dim">Last 5 avg</div>
          </div>
          <div className="bg-surface border border-line rounded p-3 text-center">
            <div className="font-display text-3xl">{stats.count}</div>
            <div className="text-[.66rem] uppercase tracking-wide font-cond font-semibold text-bone-dim">Hangs</div>
          </div>
        </div>

        {/* benchmarks */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {[{ n: 60, hit: stats.hit60, l: 'Phase 1 benchmark' }, { n: 90, hit: stats.hit90, l: 'Phase 2 benchmark' }].map((b) => (
            <div key={b.n} className="flex items-center gap-3 rounded border p-3"
              style={{ borderColor: b.hit ? 'var(--lichen)' : 'var(--line)', background: b.hit ? 'rgba(127,169,134,.1)' : 'transparent' }}>
              <div className="font-display text-2xl" style={{ color: b.hit ? 'var(--lichen)' : 'var(--bone-dim)' }}>{b.n}s</div>
              <div>
                <div className="font-cond font-bold uppercase text-[.68rem] tracking-wide" style={{ color: b.hit ? 'var(--lichen)' : 'var(--bone-dim)' }}>
                  {b.hit ? 'Hit ✓' : 'Not yet'}
                </div>
                <div className="text-[.68rem] text-bone-dim">{b.l}</div>
              </div>
            </div>
          ))}
        </div>

        {/* chart */}
        <div className="bg-surface border border-line rounded p-3 mb-5">
          <p className="font-cond font-bold uppercase text-[.62rem] tracking-wider text-bone-dim mb-1">Over time · all-time avg {stats.avg}s</p>
          <LineChart points={hangList.map((h) => ({ date: h.date, seconds: Number(h.seconds) }))} />
        </div>

        {/* logger */}
        <div className="bg-surface border border-line rounded p-4 mb-5">
          <p className="font-cond font-bold uppercase text-[.62rem] tracking-wider text-blaze mb-3">Log a hang</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <label className="text-[.7rem] text-bone-dim">Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full bg-bog border border-line rounded px-3 py-2.5 text-bone text-base focus:outline-none focus:border-blaze" />
            </label>
            <label className="text-[.7rem] text-bone-dim">Seconds
              <input type="number" inputMode="numeric" value={seconds} onChange={(e) => setSeconds(e.target.value)} placeholder="0"
                className="mt-1 w-full bg-bog border border-line rounded px-3 py-2.5 text-bone text-base focus:outline-none focus:border-blaze" />
            </label>
          </div>
          <label className="text-[.7rem] text-bone-dim block mb-2">Grip type
            <select value={grip} onChange={(e) => setGrip(e.target.value)}
              className="mt-1 w-full bg-bog border border-line rounded px-3 py-2.5 text-bone text-base focus:outline-none focus:border-blaze">
              {GRIP_TYPES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
          <label className="text-[.7rem] text-bone-dim block mb-3">Notes
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Where / how it felt"
              className="mt-1 w-full bg-bog border border-line rounded px-3 py-2.5 text-bone text-base focus:outline-none focus:border-blaze" />
          </label>
          <button onClick={add}
            className="w-full py-3.5 rounded bg-blaze text-bog font-cond font-bold uppercase tracking-wide disabled:opacity-40"
            disabled={!Number(seconds)}>
            Log hang
          </button>
        </div>

        {/* history */}
        {sortedDesc.length > 0 && (
          <div>
            <p className="font-cond font-bold uppercase text-[.62rem] tracking-wider text-bone-dim mb-2">History</p>
            {sortedDesc.map((h) => (
              <div key={h.id} className="flex items-center justify-between bg-surface border border-line rounded px-3 py-2.5 mb-1.5">
                <div className="flex items-center gap-3">
                  <span className="font-display text-xl w-12" style={{ color: h.seconds >= 90 ? 'var(--lichen)' : h.seconds >= 60 ? 'var(--blaze)' : 'var(--bone)' }}>
                    {h.seconds}s
                  </span>
                  <div>
                    <div className="text-[.8rem]">{h.grip}</div>
                    <div className="text-[.7rem] text-bone-dim">{h.date}{h.notes ? ` · ${h.notes}` : ''}</div>
                  </div>
                </div>
                <button onClick={() => remove(h.id)} aria-label="Delete" className="text-bone-dim px-2 no-tap-highlight">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
