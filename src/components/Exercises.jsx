import { useState } from 'react'
import { EX_GROUPS, EX_FILTERS } from '../data/exercises.js'

const SPINE = { lichen: 'var(--lichen)', clay: 'var(--clay)', blaze: 'var(--blaze)' }
const HATCH = { backgroundImage: 'repeating-linear-gradient(135deg, rgba(242,163,60,.045) 0 2px, transparent 2px 9px)' }

export default function Exercises({ data, update }) {
  const [filter, setFilter] = useState('all')
  const hotel = !!data.settings.hotelMode
  const setHotel = (v) => update((d) => { d.settings.hotelMode = v; return d })

  const match = (card) => filter === 'all' || (' ' + card.s + ' ').includes(' ' + filter + ' ')

  return (
    <div>
      <header className="px-5 pt-8 pb-5 border-b border-line safe-top" style={HATCH}>
        <p className="eyebrow mb-2">Tough Mudder 5K · Hugo MN · June 26, 2027</p>
        <h1 className="h1">How to do<br /><em>every movement</em></h1>
        <p className="text-bone-dim text-sm mt-3 max-w-[46ch]">
          Tap a session to see only what you need. Flip on hotel mode and every exercise swaps to the version that works in a room with no equipment.
        </p>
      </header>

      {/* sticky controls */}
      <div className="sticky top-0 z-20 bg-bog/95 backdrop-blur border-b border-line px-5 py-3">
        <p className="font-cond font-semibold uppercase tracking-[.14em] text-[.62rem] text-bone-dim mb-2">Show session</p>
        <div className="chips">
          {EX_FILTERS.map((f) => (
            <button
              key={f.f}
              onClick={() => { setFilter(f.f); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              aria-pressed={filter === f.f}
              className={`flex-none font-cond font-semibold uppercase text-[.78rem] tracking-wide px-3 py-2 rounded border no-tap-highlight ${
                filter === f.f ? 'bg-blaze border-blaze text-bog' : 'bg-transparent border-line text-bone-dim'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2.5 mt-3">
          <button
            onClick={() => setHotel(!hotel)}
            aria-pressed={hotel}
            aria-label="Hotel room mode"
            className="relative w-[46px] h-[25px] rounded-full border flex-none transition-colors"
            style={{ background: hotel ? 'var(--lichen)' : 'transparent', borderColor: hotel ? 'var(--lichen)' : 'var(--line)' }}
          >
            <span
              className="absolute top-[3px] w-[17px] h-[17px] rounded-full transition-transform"
              style={{ left: 3, transform: hotel ? 'translateX(21px)' : 'none', background: hotel ? '#0E1712' : 'var(--bone-dim)' }}
            />
          </button>
          <span className="text-sm text-bone-dim"><b className="text-bone font-semibold">Hotel room mode</b> · no equipment versions</span>
        </div>
      </div>

      <div className="px-5 pb-8">
        {EX_GROUPS.map((g) => {
          const cards = g.cards.filter(match)
          if (!cards.length) return null
          return (
            <section key={g.title} className="mt-8">
              <h2 className="font-display uppercase text-lg">{g.title}</h2>
              <div className="h-[2px] w-9 bg-blaze my-2" />
              {g.note && <p className="text-bone-dim text-[.85rem] mb-3" dangerouslySetInnerHTML={{ __html: g.note }} />}
              {cards.map((c) => (
                <article key={c.h} className="bg-surface border border-line rounded p-4 mb-3" style={{ borderLeft: `3px solid ${SPINE[c.spine]}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold text-[1.06rem]">{c.h}</h3>
                    {c.watch && (
                      <a href={c.watch} target="_blank" rel="noopener noreferrer"
                        className="flex-none font-cond font-bold uppercase text-[.68rem] tracking-wide text-blaze border border-blaze/40 px-2 py-1 rounded no-tap-highlight">
                        Watch
                      </a>
                    )}
                  </div>
                  {c.tags && (
                    <div className="flex flex-wrap gap-1.5 my-2">
                      {c.tags.map((t, i) => (
                        <span key={i}
                          className="font-cond font-semibold uppercase text-[.62rem] tracking-wider px-1.5 py-0.5 rounded"
                          style={t.c === 'grip' ? { background: 'rgba(242,163,60,.16)', color: 'var(--blaze)' }
                            : t.c === 'pull' ? { background: 'rgba(127,169,134,.16)', color: 'var(--lichen)' }
                            : { background: 'var(--surface-2)', color: 'var(--bone-dim)' }}>
                          {t.t}
                        </span>
                      ))}
                    </div>
                  )}
                  <ul className="cues">
                    {c.cues.map((cue, i) => <li key={i} dangerouslySetInnerHTML={{ __html: cue }} />)}
                  </ul>
                  {c.mod && (
                    <p className="mod"><b>Hotel version</b>{c.mod}</p>
                  )}
                  {c.miss && (
                    <p className="miss"><b>{c.missTitle || 'Most common mistake'}</b>{c.miss}</p>
                  )}
                </article>
              ))}
            </section>
          )
        })}

        <footer className="mt-10 pt-5 border-t border-line text-bone-dim text-[.82rem]">
          <p>Every <b>Watch</b> link opens a YouTube search for that movement so you get current results, not one video that might disappear. For a browsable reference, <a href="https://www.muscleandstrength.com/exercises" target="_blank" rel="noopener noreferrer">muscleandstrength.com/exercises</a> and <a href="https://www.precisionnutrition.com/video-exercise-library" target="_blank" rel="noopener noreferrer">Precision Nutrition’s free library</a> both cover nearly everything here.</p>
          <p className="mt-2">Form cues written for a beginner with no running base, training three days a week. When something hurts in a joint rather than burning in a muscle, stop that exercise and swap it.</p>
        </footer>
      </div>
    </div>
  )
}
