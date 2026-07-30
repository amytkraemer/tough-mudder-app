import { useState, useEffect, useMemo, useCallback } from 'react'
import { loadData, saveData } from './lib/storage.js'
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
      if (d.marks[key] === value) delete d.marks[key]
      else d.marks[key] = value
      return d
    })
  }, [update])

  // Add an extra session. kind is run|strength|circuit (reuses the week's
  // prescription); an optional preset id points at the supplemental library.
  const addExtra = useCallback((week, kind, preset = null) => {
    update((d) => {
      const list = d.extra[week] || []
      const n = list.reduce((m, b) => Math.max(m, b.n || 0), 0) + 1
      d.extra[week] = [...list, { id: `extra-${preset || kind}-${n}`, kind, n, preset }]
      return d
    })
  }, [update])

  const removeExtra = useCallback((week, id) => {
    update((d) => {
      d.extra[week] = (d.extra[week] || []).filter((b) => b.id !== id)
      if (!d.extra[week].length) delete d.extra[week]
      delete d.marks[`${week}:${id}`]
      delete d.logs[`${week}:${id}`]
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
      return d
    })
  }, [update])

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
