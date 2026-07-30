import { useState, useEffect, useRef } from 'react'

const KIND_COLOR = {
  run: 'var(--lichen)', walk: 'var(--bone-dim)', hard: 'var(--alarm)', easy: 'var(--blaze)',
}
function mmss(s) {
  const m = Math.floor(s / 60), r = Math.max(0, s % 60)
  return `${m}:${String(r).padStart(2, '0')}`
}

// short beep via Web Audio
function beep(freq = 880, ms = 160) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    const ctx = beep._ctx || (beep._ctx = new AC())
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.frequency.value = freq; o.type = 'sine'
    o.connect(g); g.connect(ctx.destination)
    g.gain.setValueAtTime(0.001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000)
    o.start(); o.stop(ctx.currentTime + ms / 1000)
  } catch {}
}
function buzz(ms) { try { navigator.vibrate?.(ms) } catch {} }

export default function RunTimer({ title, intervals, onClose, onDone }) {
  const [idx, setIdx] = useState(0)
  const [left, setLeft] = useState(intervals[0].sec)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [finished, setFinished] = useState(false)
  const wakeRef = useRef(null)
  const tick = useRef()

  const total = intervals.reduce((a, p) => a + p.sec, 0)
  const phase = intervals[idx]
  const next = intervals[idx + 1]

  // keep the screen awake while running
  useEffect(() => {
    async function lock() {
      try { if (running && 'wakeLock' in navigator) wakeRef.current = await navigator.wakeLock.request('screen') } catch {}
    }
    lock()
    return () => { try { wakeRef.current?.release?.(); wakeRef.current = null } catch {} }
  }, [running])

  useEffect(() => {
    if (!running || finished) return
    tick.current = setInterval(() => {
      setElapsed((e) => e + 1)
      setLeft((l) => {
        if (l > 1) {
          if (l <= 4) beep(660, 90) // 3-2-1 countdown ticks
          return l - 1
        }
        // phase change
        setIdx((i) => {
          const ni = i + 1
          if (ni >= intervals.length) {
            setFinished(true); setRunning(false)
            beep(990, 400); buzz([120, 60, 120])
            return i
          }
          beep(intervals[ni].kind === 'walk' ? 440 : 880, 220); buzz(180)
          setLeft(intervals[ni].sec)
          return ni
        })
        return intervals[Math.min(idx + 1, intervals.length - 1)].sec
      })
    }, 1000)
    return () => clearInterval(tick.current)
  }, [running, finished, idx, intervals])

  const skip = () => {
    if (idx + 1 >= intervals.length) { setFinished(true); setRunning(false); return }
    setElapsed((e) => e + left)
    const ni = idx + 1
    setIdx(ni); setLeft(intervals[ni].sec)
  }
  const start = () => { setRunning(true); beep(880, 150) }

  const color = KIND_COLOR[phase.kind] || 'var(--lichen)'
  const phaseElapsedFrac = (phase.sec - left) / phase.sec

  return (
    <div className="fixed inset-0 z-50 bg-bog flex flex-col safe-top safe-bottom">
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <div className="min-w-0">
          <p className="eyebrow">Guided run</p>
          <p className="text-sm text-bone-dim truncate max-w-[70vw]">{title}</p>
        </div>
        <button onClick={() => onClose()} className="text-bone-dim px-3 py-2 -mr-3 no-tap-highlight font-cond uppercase text-sm">Close</button>
      </div>

      {finished ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="font-display uppercase text-4xl text-lichen mb-2">Done</div>
          <p className="text-bone-dim mb-1">Total time</p>
          <div className="font-display text-5xl mb-8">{mmss(elapsed)}</div>
          <button onClick={() => onDone(Math.round(elapsed / 60))}
            className="w-full max-w-xs py-4 rounded bg-blaze text-bog font-cond font-bold uppercase tracking-wide">
            Log this run ({Math.max(1, Math.round(elapsed / 60))} min)
          </button>
          <button onClick={() => onClose()} className="mt-3 text-bone-dim underline text-sm">Close without logging</button>
        </div>
      ) : (
        <>
          <div className="flex-1 flex flex-col items-center justify-center px-6" style={{ background: `radial-gradient(120% 60% at 50% 40%, ${color}22, transparent)` }}>
            <p className="font-cond font-bold uppercase tracking-[.2em] text-sm mb-3" style={{ color }}>
              {phase.label}
            </p>
            <div className="font-display leading-none" style={{ fontSize: '5.5rem', color }}>{mmss(left)}</div>
            <div className="mt-6 w-full max-w-sm">
              <div className="h-2 rounded-full bg-line overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${phaseElapsedFrac * 100}%`, background: color }} />
              </div>
              <div className="flex justify-between text-[.72rem] text-bone-dim mt-2">
                <span>Phase {idx + 1} / {intervals.length}</span>
                <span>{mmss(elapsed)} / {mmss(total)}</span>
              </div>
            </div>
            {next && <p className="mt-6 text-sm text-bone-dim">Next: <b className="text-bone">{next.label}</b> · {mmss(next.sec)}</p>}
          </div>

          <div className="px-6 pb-8 flex items-center justify-center gap-4">
            <button onClick={skip} className="w-16 h-16 rounded-full border border-line flex items-center justify-center text-bone-dim no-tap-highlight" aria-label="Skip phase">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5l9 7-9 7zM17 5h2v14h-2z" /></svg>
            </button>
            <button onClick={() => (running ? setRunning(false) : start())}
              className="w-24 h-24 rounded-full bg-blaze text-bog flex items-center justify-center no-tap-highlight" aria-label={running ? 'Pause' : 'Start'}>
              {running
                ? <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                : <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z" /></svg>}
            </button>
            <button onClick={() => { setFinished(true); setRunning(false) }} className="w-16 h-16 rounded-full border border-line flex items-center justify-center text-bone-dim no-tap-highlight" aria-label="Finish">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
