import { useState } from 'react'
import { RUNNING_BASE, buildSchedule } from '../lib/schedule.js'
import { RACE_INFO } from '../data/plan.js'
import { BEGINNER_VOLUME_WARNING } from '../data/overlays.js'

const HATCH = {
  backgroundImage:
    'repeating-linear-gradient(135deg, rgba(242,163,60,.06) 0 2px, transparent 2px 9px)',
}

export default function Onboarding({ onDone, sync }) {
  const [step, setStep] = useState(0)
  const [raceDate, setRaceDate] = useState(RACE_INFO.defaultDate)
  const [daysPerWeek, setDaysPerWeek] = useState(3)
  const [runningBase, setRunningBase] = useState('none')

  const finish = () => {
    // Capture the derived start date now so the schedule stays stable on reopen.
    const sched = buildSchedule({ raceDate, runningBase, daysPerWeek, today: new Date() })
    onDone({ raceDate, daysPerWeek, runningBase, startDate: sched.startDate })
  }

  const steps = [
    { key: 'race', title: 'When is race day?' },
    { key: 'days', title: 'How many days a week can you train?' },
    { key: 'base', title: 'Where is your running right now?' },
  ]

  return (
    <div className="min-h-screen bg-bog text-bone flex flex-col">
      <header className="px-5 pt-10 pb-6 border-b border-line safe-top" style={HATCH}>
        <p className="eyebrow mb-2">{RACE_INFO.title} · {RACE_INFO.place}</p>
        <h1 className="h1">Let’s build<br /><em>your plan</em></h1>
        <p className="text-bone-dim text-sm mt-3 max-w-[46ch]">
          Three questions, then never again. This sets your 47-week schedule and where the run progression starts.
        </p>
      </header>

      <div className="px-5 py-6 flex-1">
        {/* progress dots */}
        <div className="flex gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s.key} className={`h-1 flex-1 rounded ${i <= step ? 'bg-blaze' : 'bg-line'}`} />
          ))}
        </div>

        {step === 0 && sync?.enabled && !sync.user && (
          <button
            onClick={sync.signIn}
            className="w-full mb-6 py-3 rounded border border-line text-bone-dim text-sm no-tap-highlight"
          >
            Already training on another device? <span className="text-lichen underline">Sign in to restore</span>
          </button>
        )}

        <h2 className="font-display uppercase text-xl mb-1">{steps[step].title}</h2>
        <div className="h-[2px] w-9 bg-blaze mb-5" />

        {step === 0 && (
          <div>
            <input
              type="date"
              value={raceDate}
              onChange={(e) => setRaceDate(e.target.value)}
              className="w-full bg-surface border border-line rounded px-4 py-4 text-lg text-bone focus:outline-none focus:border-blaze"
            />
            <button
              onClick={() => setRaceDate(RACE_INFO.defaultDate)}
              className="mt-3 text-sm text-bone-dim underline"
            >
              Use the default (Sat June 26, 2027)
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-4 gap-2">
            {[3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => setDaysPerWeek(n)}
                className={`py-6 rounded border text-2xl font-display ${
                  daysPerWeek === n ? 'bg-blaze border-blaze text-bog' : 'bg-surface border-line text-bone'
                }`}
              >
                {n}
              </button>
            ))}
            <p className="col-span-4 text-sm text-bone-dim mt-1">
              The plan is 3 core sessions a week. Extra days become daily dead-hang and easy movement.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-2">
            {Object.entries(RUNNING_BASE).map(([k, v]) => (
              <button
                key={k}
                onClick={() => setRunningBase(k)}
                className={`text-left p-4 rounded border ${
                  runningBase === k ? 'bg-blaze/15 border-blaze' : 'bg-surface border-line'
                }`}
              >
                <div className="font-cond font-semibold uppercase tracking-wide">{v.label}</div>
                <div className="text-sm text-bone-dim">{v.desc}</div>
              </button>
            ))}
            {daysPerWeek >= 5 && runningBase === 'none' && (
              <p className="text-[.82rem] rounded px-3 py-2" style={{ background: 'rgba(255,212,0,.12)', borderLeft: '3px solid var(--caution,#FFD400)', color: 'var(--bone)' }}>
                {BEGINNER_VOLUME_WARNING}
              </p>
            )}
            <p className="text-sm text-bone-dim mt-1">
              This only moves where your <b className="text-bone">running</b> starts. Strength always starts at Strength A — running fitness doesn’t transfer to grip.
            </p>
          </div>
        )}
      </div>

      <div className="px-5 pb-8 safe-bottom flex gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="flex-1 py-4 rounded border border-line text-bone font-cond uppercase tracking-wide"
          >
            Back
          </button>
        )}
        {step < steps.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            className="flex-[2] py-4 rounded bg-blaze text-bog font-cond font-bold uppercase tracking-wide"
          >
            Next
          </button>
        ) : (
          <button
            onClick={finish}
            className="flex-[2] py-4 rounded bg-blaze text-bog font-cond font-bold uppercase tracking-wide"
          >
            Start training
          </button>
        )}
      </div>
    </div>
  )
}
