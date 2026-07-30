// Optional overlay days (spec 2.1–2.4). These switch on/off with days-per-week
// and never touch Run 1 / Strength / Circuit or the phase boundaries. Content is
// verbatim from the spec; nothing invented.
import { scaleRun } from '../lib/runScaling.js'

// ---- Day 4: Grip & Pull (25 min) — same all 47 weeks, progresses by set count
export function gripAndPull(phaseId, isFinal2) {
  const sets = isFinal2 ? 2 : phaseId === 1 ? 2 : phaseId === 2 ? 3 : 4
  const exercises = [
    'Dead hang: max hold (90 sec rest between)',
    'Towel hang: max hold',
    'Rows (suspension straps or dumbbell): 10 reps',
    'Farmer carry: 40 sec',
    'Suitcase hold: 30 sec each side',
  ]
  if (phaseId >= 3 && !isFinal2) exercises.push('Negative pull-ups: 3 x 3')
  return {
    label: 'Grip & Pull',
    scheme: `${sets} set${sets > 1 ? 's' : ''} of each · ~25 min`,
    where: 'Grip is the failure point at this race — the 3.1 miles are the easy part.',
    exercises,
    grip: [
      'Hotel: towel rows over a door, suitcase carries down the hallway, hangs in the hotel gym.',
      'No bar at all? Double the rows and skip the hangs.',
    ],
  }
}

// ---- Day 6 (and beginner Day 5 substitute): Mobility & Carry (30 min, easy)
export function mobilityAndCarry() {
  return {
    label: 'Mobility & Carry',
    scheme: '30 min · easy · never to failure',
    where: 'Recovery day. Should leave no soreness.',
    exercises: [
      '10 min easy walk or bike',
      'Calf raises: 3 x 15',
      'Single-leg balance: 3 x 30 sec each side',
      'Ankle circles and controlled rotations: 2 min',
      'Deep squat hold: 3 x 30 sec',
      '90/90 hip sits: 3 x 30 sec each side',
      'Couch stretch: 2 x 45 sec each side',
      'Chest carry: 3 x 60 sec',
      'Dead hang: 2 x 20 sec, easy, not max',
    ],
    grip: ['The ankle work is the point — the course is off-trail bog and uneven glacial ground, and rolled ankles end more races here than fitness does.'],
  }
}

// ---- Day 5: Easy Run 2 (20–35 min) — always easier than Day 1
function easyRun2Text(week, prevWeek, runningBase) {
  if (week.phaseId === 1) {
    const interval = (prevWeek || week).run
    return `15-20 min at last week’s run/walk interval (${interval})` // Phase 1 is never scaled
  }
  let base
  if (week.isTaper) base = '20 min very easy'
  else if (week.phaseId === 2) base = '20-25 min easy continuous'
  else if (week.phaseId === 3) base = '25-30 min easy continuous'
  else base = '30-35 min easy, off-trail if possible'
  return scaleRun(base, runningBase, { phaseId: week.phaseId, isTaper: week.isTaper, isRaceWeek: week.isRaceWeek, isDay1: false })
}

function quality2Note(week) {
  if (/hills|broken\s*5k/i.test(week.run)) {
    return 'Day 1 is a hard run this week — never two quality runs in one week, so keep this one short and slow.'
  }
  return 'Conversational pace. Always easier than Day 1.'
}

// ---- assemble the active overlays for a week (spec 2.1 fixed order + safety gate)
export function overlaysForWeek(week, prevWeek, daysPerWeek = 3, runningBase = 'none') {
  const list = []
  const isFinal2 = !!week.isTaper

  if (daysPerWeek >= 4) {
    list.push({ key: 'overlay-grip', type: 'grip', kind: 'strength', day: 4, label: 'Day 4 · Grip & Pull', content: gripAndPull(week.phaseId, isFinal2) })
  }

  if (daysPerWeek >= 5) {
    const beginnerLock = runningBase === 'none' && week.week < 5
    if (beginnerLock) {
      // Easy Run 2 is locked until week 5 for new runners — substitute Mobility & Carry
      list.push({ key: 'overlay-mobility', type: 'mobility', kind: 'strength', day: 5, label: 'Day 5 · Mobility & Carry', note: 'Easy Run 2 unlocks at week 5 for new runners.', content: mobilityAndCarry() })
    } else {
      list.push({ key: 'overlay-run2', type: 'run2', kind: 'run', day: 5, label: 'Day 5 · Easy Run 2', title: easyRun2Text(week, prevWeek, runningBase), note: quality2Note(week) })
    }
  }

  if (daysPerWeek >= 6) {
    const already = list.some((o) => o.type === 'mobility')
    list.push({ key: already ? 'overlay-mobility2' : 'overlay-mobility', type: 'mobility', kind: 'strength', day: 6, label: 'Day 6 · Mobility & Carry', content: mobilityAndCarry() })
  }

  return list
}

// Warning shown before saving 5/6 days with no running base (spec 2.1 gate).
export const BEGINNER_VOLUME_WARNING =
  'You have no running base yet. Five and six days a week is how new runners pick up shin splints in month two. Three or four is the better call until Phase 2.'
