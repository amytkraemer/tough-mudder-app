import { useState, useEffect, useRef } from 'react'

const KIND_COLOR = {
  run: 'var(--lichen)', walk: 'var(--ash, #8E9199)', hard: 'var(--kill, #C63A26)',
  easy: 'var(--blaze)', incline: 'var(--blaze)',
}
function mmss(s) {
  const m = Math.floor(s / 60), r = Math.max(0, Math.round(s % 60))
  return `${m}:${String(r).padStart(2, '0')}`
}
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
function buzz(p) { try { navigator.vibrate?.(p) } catch {} }

// Absolute-timeline clock: everything is derived from wall-clock elapsed time
// (accumMs + skipMs + time since the current running segment began). Screen
// lock, throttled timers, and multi-phase catch-up all just work, because we
// never decrement state — we recompute position from elapsed on every tick.
export default function RunTimer({ title, intervals, onClose, onDone }) {
  const cum = [0]
  for (const p of intervals) cum.push(cum[cum.length - 1] + p.sec)
  const totalSec = cum[cum.length - 1]

  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [, tick] = useState(0)
  const accumMs = useRef(0)      // running time banked from previous segments
  const skipMs = useRef(0)       // time jumped forward via Skip
  const runStartedAt = useRef(0) // wall-clock start of the current running segment
  const lastIdx = useRef(0)
  const lastBeep = useRef(null)
  const wakeRef = useRef(null)

  const elapsedMs = () => accumMs.current + skipMs.current + (running ? Date.now() - runStartedAt.current : 0)
  const derive = () => {
    const e = elapsedMs() / 1000
    if (e >= totalSec) return { idx: intervals.length - 1, remaining: 0, done: true, e }
    let idx = 0
    while (idx < intervals.length - 1 && e >= cum[idx + 1]) idx++
    return { idx, remaining: Math.max(0, cum[idx + 1] - e), done: false, e }
  }

  // wake lock while running
  useEffect(() => {
    let released = false
    async function lock() {
      try { if (running && 'wakeLock' in navigator) wakeRef.current = await navigator.wakeLock.request('screen') } catch {}
    }
    lock()
    const onVis = () => { if (document.visibilityState === 'visible' && running) lock() }
    document.addEventListener('visibilitychange', onVis)
    return () => { document.removeEventListener('visibilitychange', onVis); if (!released) { try { wakeRef.current?.release?.() } catch {} wakeRef.current = null } }
  }, [running])

  useEffect(() => {
    if (!running || finished) return
    const id = setInterval(() => {
      const d = derive()
      if (d.done) {
        accumMs.current = totalSec * 1000; skipMs.current = 0
        setFinished(true); setRunning(false); beep(990, 400); buzz([120, 60, 120]); tick((x) => x + 1); return
      }
      if (d.idx !== lastIdx.current) {
        lastIdx.current = d.idx; lastBeep.current = null
        const k = intervals[d.idx].kind
        beep(k === 'walk' || k === 'easy' ? 440 : 880, 220); buzz(180)
      }
      const r = Math.ceil(d.remaining)
      if (r <= 3 && r >= 1 && r !== lastBeep.current) { lastBeep.current = r; beep(660, 90) }
      tick((x) => x + 1)
    }, 200)
    return () => clearInterval(id)
  }, [running, finished])

  const startResume = () => { runStartedAt.current = Date.now(); setRunning(true); beep(880, 150) }
  const pause = () => { accumMs.current += Date.now() - runStartedAt.current; setRunning(false) }
  const toggle = () => (running ? pause() : startResume())
  const skip = () => {
    const d = derive()
    const boundary = cum[d.idx + 1]
    const cur = elapsedMs() / 1000
    skipMs.current += Math.max(0, boundary - cur) * 1000
    lastIdx.current = -1 // force a phase-change beep on the next tick
    if (elapsedMs() / 1000 >= totalSec) { accumMs.current = totalSec * 1000; setFinished(true); setRunning(false) }
    tick((x) => x + 1)
  }
  const stop = () => { if (running) pause(); setFinished(true) }

  const d = derive()
  const phase = intervals[d.idx]
  const next = intervals[d.idx + 1]
  const color = KIND_COLOR[phase.kind] || 'var(--lichen)'
  const frac = phase.sec ? (phase.sec - d.remaining) / phase.sec : 0
  const totalElapsed = Math.floor(elapsedMs() / 1000)

  return (
    <div className="fixed inset-0 z-50 bg-pitch flex flex-col safe-top safe-bottom" style={{ background: 'var(--pitch, #0A0A0B)' }}>
      <div className="flex items-center justify-between px-5 pt-6 pb-3">
        <div className="min-w-0">
          <p className="eyebrow">Guided run</p>
          <p className="text-sm text-ash truncate max-w-[70vw]" style={{ color: 'var(--ash,#8E9199)' }}>{title}</p>
        </div>
        <button onClick={onClose} className="text-ash px-3 py-2 -mr-3 no-tap-highlight font-cond uppercase text-sm" style={{ color: 'var(--ash,#8E9199)' }}>Close</button>
      </div>

      {finished ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="font-display uppercase text-5xl mb-2" style={{ color: 'var(--lichen)' }}>Done</div>
          <p className="mb-1" style={{ color: 'var(--ash,#8E9199)' }}>Total time</p>
          <div className="font-display text-6xl mb-8">{mmss(totalElapsed)}</div>
          <button onClick={() => onDone(Math.max(1, Math.round(totalElapsed / 60)))}
            className="w-full max-w-xs py-4 rounded font-cond font-bold uppercase tracking-wide" style={{ background: 'var(--blaze)', color: 'var(--pitch,#0A0A0B)' }}>
            Log this run ({Math.max(1, Math.round(totalElapsed / 60))} min)
          </button>
          <button onClick={onClose} className="mt-3 underline text-sm" style={{ color: 'var(--ash,#8E9199)' }}>Close without logging</button>
        </div>
      ) : (
        <>
          <div className="flex-1 flex flex-col items-center justify-center px-6" style={{ background: `radial-gradient(120% 55% at 50% 42%, ${color}22, transparent)` }}>
            <p className="font-cond font-bold uppercase tracking-[.2em] text-sm mb-3" style={{ color }}>{phase.label}</p>
            <div className="font-display leading-none tabular-nums" style={{ fontSize: '5.5rem', color }}>{mmss(Math.ceil(d.remaining))}</div>
            <div className="mt-6 w-full max-w-sm">
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--steel,#23262C)' }}>
                <div className="h-full rounded-full" style={{ width: `${frac * 100}%`, background: color }} />
              </div>
              <div className="flex justify-between text-[.72rem] mt-2" style={{ color: 'var(--ash,#8E9199)' }}>
                <span>Phase {d.idx + 1} / {intervals.length}</span>
                <span>{mmss(totalElapsed)} / {mmss(totalSec)}</span>
              </div>
            </div>
            {next && <p className="mt-6 text-sm" style={{ color: 'var(--ash,#8E9199)' }}>Next: <b style={{ color: 'var(--bone)' }}>{next.label}</b> · {mmss(next.sec)}</p>}
          </div>

          <div className="px-6 pb-8 flex items-center justify-center gap-4">
            <button onClick={skip} className="w-16 h-16 rounded-full border flex items-center justify-center no-tap-highlight" style={{ borderColor: 'var(--steel,#23262C)', color: 'var(--ash,#8E9199)' }} aria-label="Skip phase">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5l9 7-9 7zM17 5h2v14h-2z" /></svg>
            </button>
            <button onClick={toggle} className="w-24 h-24 rounded-full flex items-center justify-center no-tap-highlight" style={{ background: 'var(--blaze)', color: 'var(--pitch,#0A0A0B)' }} aria-label={running ? 'Pause' : 'Start'}>
              {running
                ? <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
                : <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z" /></svg>}
            </button>
            <button onClick={stop} className="w-16 h-16 rounded-full border flex items-center justify-center no-tap-highlight" style={{ borderColor: 'var(--steel,#23262C)', color: 'var(--ash,#8E9199)' }} aria-label="Finish">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2" /></svg>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
