import { prevFor } from '../lib/metrics.js'
import SessionCard from './SessionCard.jsx'

// Renders the week's optional overlay days (Grip & Pull, Easy Run 2, Mobility &
// Carry). These are structural (driven by days-per-week), so there's no remove
// button — you change them in Settings by changing days-per-week.
export default function OverlaySection({ week, data, logIndex, setMark, setLog }) {
  const overlays = week.overlays || []
  if (!overlays.length) return null
  return (
    <div className="mt-1">
      {overlays.map((o) => (
        <SessionCard
          key={o.key}
          kind={o.kind}
          week={week}
          label={o.label}
          note={o.note}
          titleOverride={o.kind === 'run' ? o.title : undefined}
          contentOverride={o.kind !== 'run' ? o.content : undefined}
          mark={data.marks[`${week.week}:${o.key}`]}
          onMark={(v) => setMark(week.week, o.key, v)}
          log={data.logs[`${week.week}:${o.key}`]}
          onLog={(patch) => setLog(week.week, o.key, patch)}
          prev={prevFor(logIndex, week.week, o.kind, o.content ? { strength: o.content } : week)}
        />
      ))}
    </div>
  )
}
