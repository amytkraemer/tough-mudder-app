import { useState, useEffect, useMemo, useCallback } from 'react'
import { loadData, saveData } from './lib/storage.js'
import { stamp, tomb } from './lib/lww.js'
import { buildSchedule } from './lib/schedule.js'
import { useCloudSync } from './lib/sync.js'
import Onboarding from './components/Onboarding.jsx'
import TabBar from './components/TabBar.jsx'
import Today from './components/Today.jsx'
import Plan from './components/Plan.jsx'
import Exercises from './components/Exercises.jsx'
import Grip from './components/Grip.jsx'
import Progress from './components/Progress.jsx'
import Settings from './components/Settings.jsx'
import ExportNudge from './components/ExportNudge.jsx'

export default function App() {
  const [data, setData] = useState(() => loadData())
  const [tab, setTab] = useState('today')
  const [showSettings, setShowSettings] = useState(false)
  const today = useMemo(() => new Date(), [])
  const sync = useCloudSync(data, setData)

  // Latch: once cloud has bootstrapped (auth resolved + signed-in user's doc
  // fetched) the app renders and stays rendered. A later sign-in merges in the
  // background without flashing the loading screen again.
  const [booted, setBooted] = useState(!sync.enabled)
  useEffect(() => { if (sync.ready) setBooted(true) }, [sync.ready])

  // Persist on every change.
  useEffect(() => { saveData(data) }, [data])

  // Keep hotel-mode body class in sync (exercise guide behavior).
  useEffect(() => {
    document.body.classList.toggle('hotel', !!data.settings.hotelMode)
  }, [data.settings.hotelMode])

  const update = useCallback((fn) => {
    setData((prev) => {
      const next = typeof fn === 'function' ? fn(structuredClone(prev)) : fn
      return next
    })
  }, [])

  const schedule = useMemo(() => {
    const s = data.settings
    return buildSchedule({
      raceDate: s.raceDate,
      runningBase: s.runningBase,
      daysPerWeek: s.daysPerWeek,
      startDate: s.startDate,
      today,
    })
  }, [data.settings.raceDate, data.settings.runningBase, data.settings.daysPerWeek, data.settings.startDate, today])

  const setMark = useCallback((week, session, value) => {
    update((d) => {
      const key = `${week}:${session}`
      if (d.marks[key] === value) { delete d.marks[key]; tomb(d, 'marks', key) } // un-check = deletion
      else { d.marks[key] = value; stamp(d, 'marks', key) }
      return d
    })
  }, [update])

  // Add an extra session. kind is run|strength|circuit (reuses the week's
  // prescription); an optional preset id points at the supplemental library.
  const addExtra = useCallback((week, kind, preset = null) => {
    update((d) => {
      const list = d.extra[week] || []
      const n = list.reduce((m, b) => Math.max(m, b.n || 0), 0) + 1
      const id = `extra-${preset || kind}-${n}`
      d.extra[week] = [...list, { id, kind, n, preset }]
      stamp(d, 'extra', `${week}:${id}`)
      return d
    })
  }, [update])

  const removeExtra = useCallback((week, id) => {
    update((d) => {
      d.extra[week] = (d.extra[week] || []).filter((b) => b.id !== id)
      if (!d.extra[week].length) delete d.extra[week]
      delete d.marks[`${week}:${id}`]
      delete d.logs[`${week}:${id}`]
      // tombstone the extra AND its cascaded mark/log so none is re-added on sync
      tomb(d, 'extra', `${week}:${id}`)
      tomb(d, 'marks', `${week}:${id}`)
      tomb(d, 'logs', `${week}:${id}`)
      return d
    })
  }, [update])

  const setLog = useCallback((week, session, patch) => {
    update((d) => {
      const key = `${week}:${session}`
      const cur = d.logs[key] || {}
      const next = { ...cur, ...patch }
      if (patch.ex) {
        next.ex = { ...(cur.ex || {}) }
        for (const i in patch.ex) next.ex[i] = { ...(cur.ex?.[i] || {}), ...patch.ex[i] }
      }
      d.logs[key] = next
      stamp(d, 'logs', key)
      return d
    })
  }, [update])

  // Never decide onboarding from local storage before cloud has loaded — a
  // returning user's plan and progress live in Firestore, not in a fresh
  // browser's empty localStorage. Show a loading state, never onboarding.
  // Also cover the moment right AFTER sign-in (e.g. "Sign in to restore" from
  // onboarding): a user is present but their cloud doc hasn't merged yet, so
  // hold the loader instead of flashing onboarding back at them.
  if (!booted || (sync.user && !sync.ready)) {
    return (
      <div className="min-h-screen bg-bog text-bone flex flex-col items-center justify-center gap-4">
        <div className="grain" aria-hidden="true" />
        <div className="h-8 w-8 rounded-full border-2 border-line border-t-blaze animate-spin" />
        <p className="font-cond uppercase tracking-wider text-[.7rem] text-bone-dim">Restoring your training…</p>
      </div>
    )
  }

  if (!data.settings.onboarded) {
    return (
      <Onboarding
        sync={sync}
        onDone={(settings) => update((d) => {
          d.settings = { ...d.settings, ...settings, onboarded: true, createdAt: new Date().toISOString() }
          return d
        })}
      />
    )
  }

  return (
    <div className="min-h-screen bg-pitch text-bone">
      <div className="grain" aria-hidden="true" />
      <div className="mx-auto max-w-[760px]" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
        {tab === 'today' && (
          <Today
            schedule={schedule}
            data={data}
            setMark={setMark}
            setLog={setLog}
            addExtra={addExtra}
            removeExtra={removeExtra}
            onOpenSettings={() => setShowSettings(true)}
            onGoPlan={() => setTab('plan')}
          />
        )}
        {tab === 'plan' && <Plan schedule={schedule} data={data} setMark={setMark} setLog={setLog} addExtra={addExtra} removeExtra={removeExtra} />}
        {tab === 'exercises' && <Exercises data={data} update={update} />}
        {tab === 'grip' && <Grip data={data} update={update} />}
        {tab === 'progress' && <Progress schedule={schedule} data={data} />}
      </div>

      <ExportNudge data={data} update={update} />

      {showSettings && (
        <Settings
          data={data}
          update={update}
          schedule={schedule}
          sync={sync}
          onClose={() => setShowSettings(false)}
        />
      )}

      <TabBar tab={tab} setTab={setTab} />
    </div>
  )
}
