// Dependency-free SVG line chart for dead-hang seconds over time.
export default function LineChart({ points, benchmarks = [60, 90], height = 180 }) {
  const W = 320, H = height, padL = 30, padR = 10, padT = 14, padB = 22
  if (!points.length) {
    return <div className="text-bone-dim text-sm py-8 text-center">Log a hang to see your progress here.</div>
  }
  const sorted = points.slice().sort((a, b) => (a.date < b.date ? -1 : 1))
  const xs = sorted.map((_, i) => i)
  const ys = sorted.map((p) => p.seconds)
  const maxY = Math.max(90, ...ys) * 1.1
  const minY = 0
  const nx = (i) => padL + (xs.length === 1 ? 0.5 : i / (xs.length - 1)) * (W - padL - padR)
  const ny = (v) => padT + (1 - (v - minY) / (maxY - minY)) * (H - padT - padB)

  const path = sorted.map((p, i) => `${i === 0 ? 'M' : 'L'}${nx(i).toFixed(1)},${ny(p.seconds).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Dead hang seconds over time">
      {/* benchmark lines */}
      {benchmarks.map((b) => b <= maxY && (
        <g key={b}>
          <line x1={padL} x2={W - padR} y1={ny(b)} y2={ny(b)} stroke="var(--line)" strokeDasharray="3 3" />
          <text x={W - padR} y={ny(b) - 3} textAnchor="end" fontSize="9" fill="var(--bone-dim)">{b}s</text>
        </g>
      ))}
      {/* axis baseline */}
      <line x1={padL} x2={W - padR} y1={ny(0)} y2={ny(0)} stroke="var(--line)" />
      {/* area + line */}
      <path d={`${path} L${nx(xs.length - 1)},${ny(0)} L${nx(0)},${ny(0)} Z`} fill="rgba(255,106,19,.10)" />
      <path d={path} fill="none" stroke="var(--blaze)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {/* points */}
      {sorted.map((p, i) => (
        <circle key={i} cx={nx(i)} cy={ny(p.seconds)} r="2.6" fill={p.seconds >= 90 ? 'var(--lichen)' : 'var(--blaze)'} />
      ))}
      {/* y labels */}
      <text x={padL - 4} y={ny(0) + 3} textAnchor="end" fontSize="9" fill="var(--bone-dim)">0</text>
    </svg>
  )
}
