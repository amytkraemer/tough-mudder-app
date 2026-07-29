// Generic dependency-free line chart. points: [{ label, value }].
export default function Chart({ points, unit = '', color = 'var(--blaze)', height = 170, benchmarks = [] }) {
  const W = 320, H = height, padL = 34, padR = 12, padT = 14, padB = 26
  if (!points || points.length === 0) {
    return <div className="text-bone-dim text-sm py-8 text-center">Log a couple and your trend shows up here.</div>
  }
  const ys = points.map((p) => p.value)
  const maxY = Math.max(...ys, ...benchmarks) * 1.12 || 1
  const nx = (i) => padL + (points.length === 1 ? 0.5 : i / (points.length - 1)) * (W - padL - padR)
  const ny = (v) => padT + (1 - v / maxY) * (H - padT - padB)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${nx(i).toFixed(1)},${ny(p.value).toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  const best = Math.max(...ys)

  // sparse x labels (first, last, and a middle one)
  const labelIdx = points.length <= 4
    ? points.map((_, i) => i)
    : [0, Math.floor((points.length - 1) / 2), points.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Trend in ${unit}`}>
      {benchmarks.map((b) => b <= maxY && (
        <g key={b}>
          <line x1={padL} x2={W - padR} y1={ny(b)} y2={ny(b)} stroke="var(--line)" strokeDasharray="3 3" />
          <text x={W - padR} y={ny(b) - 3} textAnchor="end" fontSize="9" fill="var(--bone-dim)">{b}</text>
        </g>
      ))}
      <line x1={padL} x2={W - padR} y1={ny(0)} y2={ny(0)} stroke="var(--line)" />
      <path d={`${path} L${nx(points.length - 1)},${ny(0)} L${nx(0)},${ny(0)} Z`} fill={color} opacity="0.12" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={nx(i)} cy={ny(p.value)} r="2.6" fill={p.value >= best ? 'var(--lichen)' : color} />
      ))}
      {/* value label on last point */}
      <text x={nx(points.length - 1)} y={ny(last.value) - 7} textAnchor="end" fontSize="10" fontWeight="700" fill={color}>{last.value}{unit ? ` ${unit}` : ''}</text>
      <text x={padL - 5} y={ny(0) + 3} textAnchor="end" fontSize="9" fill="var(--bone-dim)">0</text>
      <text x={padL - 5} y={ny(maxY / 1.12) + 3} textAnchor="end" fontSize="9" fill="var(--bone-dim)">{Math.round(maxY / 1.12)}</text>
      {labelIdx.map((i) => (
        <text key={i} x={nx(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--bone-dim)">{points[i].label}</text>
      ))}
    </svg>
  )
}
