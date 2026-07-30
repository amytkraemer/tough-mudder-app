// All training content, extracted verbatim from the source PDF + xlsx.
// Nothing here is invented. Run prescriptions come from the Training Log tab;
// strength/circuit detail comes from the PDF phase pages.

// ---- Phases (default lengths, weeks 1-47) ----
export const PHASES = [
  { id: 1, key: '1. Base', name: 'Base', short: 'Base',
    range: 'Weeks 1-10 · Aug 3 – Oct 11, 2026',
    goal: 'Run 30 minutes continuously. Build tendon and joint tolerance. No heroics.',
    sessions: 30, weeks: 10 },
  { id: 2, key: '2. Strength Build', name: 'Strength Build', short: 'Strength',
    range: 'Weeks 11-24 · Oct 12, 2026 – Jan 17, 2027',
    goal: 'Minnesota winter. Treadmill and hotel season. Lean into strength while running maintains. This is the phase that wins the race.',
    sessions: 42, weeks: 14 },
  { id: 3, key: '3. Race Specific', name: 'Race Specific', short: 'Race',
    range: 'Weeks 25-38 · Jan 18 – Apr 25, 2027',
    goal: 'Run 4 miles comfortably, plus obstacle-specific capacity.',
    sessions: 42, weeks: 14 },
  { id: 4, key: '4. Terrain & Taper', name: 'Terrain & Taper', short: 'Taper',
    range: 'Weeks 39-47 · Apr 26 – June 26, 2027',
    goal: 'Off-trail terrain work on real ground, then taper into race day.',
    sessions: 27, weeks: 9 },
]

// ---- RUN progression ----
// Phase 1 run progression (weeks 1-10), verbatim from the Training Log.
export const PHASE1_RUNS = [
  '1 min run / 2 min walk x 8',
  '1.5 min run / 2 min walk x 7',
  '2 min run / 2 min walk x 7',
  '3 min run / 2 min walk x 6',
  '4 min run / 2 min walk x 5',
  '5 min run / 2 min walk x 4, then 5 min walk',
  '8 min run / 2 min walk x 3',
  '12 min run / 2 min walk x 2, then 6 min run',
  '20 min continuous, walk 5, then 8 min continuous',
  '30 min CONTINUOUS (Phase 1 goal)',
]

// Phase 2 run block (weeks 11-24). First 6 weeks incline-easy, then alternating.
const P2_EASY_INCLINE = '30-35 min easy, plus 5 min at 4% incline mid-run'
const P2_EASY = '35 min easy continuous'
const P2_INCLINE = 'Incline intervals: 3 min at 6-8% / 3 min flat, x 6'
export const PHASE2_RUNS = [
  P2_EASY_INCLINE, P2_EASY_INCLINE, P2_EASY_INCLINE,
  P2_EASY_INCLINE, P2_EASY_INCLINE, P2_EASY_INCLINE,
  P2_EASY, P2_INCLINE, P2_EASY, P2_INCLINE,
  P2_EASY, P2_INCLINE, P2_EASY, P2_INCLINE,
]
// The maintenance pattern used when Phase 2 is extended by spare weeks.
export const PHASE2_MAINTENANCE = [P2_EASY, P2_INCLINE]

// Phase 3 run block (weeks 25-38). Build then rotate three sessions.
const P3_LONG = 'Long: 4 miles easy'
const P3_HILLS = 'Hills: 8 x 45 sec hard uphill, walk down'
const P3_BROKEN = 'Broken 5K: 1 mi, 20 burpees, 1 mi, 20 burpees, 1 mi'
export const PHASE3_RUNS = [
  '3.5 miles easy', '3.5 miles easy', '3.75 miles easy', '3.75 miles easy',
  '4 miles easy', '4 miles easy (Phase 3 goal)',
  P3_LONG, P3_HILLS, P3_BROKEN, P3_LONG, P3_HILLS, P3_BROKEN, P3_LONG, P3_HILLS,
]
export const PHASE3_ROTATION = [P3_LONG, P3_HILLS, P3_BROKEN]

// Phase 4 run.
export const PHASE4_TERRAIN_RUN = 'Off-trail on the property, 35-45 min. Uneven ground, no pace goal.'
export const TAPER_RUN = 'TAPER: 25 min easy, flat'
export const RACE_WEEK_RUN = 'RACE WEEK: Mon 20 min easy, Wed 15 min easy + strides. Sat June 26: RACE'

// ---- STRENGTH sessions ----
export const STRENGTH = {
  A: {
    label: 'Strength A',
    filter: 'sA',
    scheme: '3 rounds · 60 sec rest between rounds',
    progression: 'Add 1 rep per exercise every week. When you hit 20 reps, add a fourth round and reset to 15.',
    where: 'Hotel room, no equipment',
    exercises: [
      'Bodyweight squat × 15',
      'Push-up × 8-12 (hands on desk or bed edge if floor push-ups aren’t there yet)',
      'Reverse lunge × 10 each leg',
      'Glute bridge × 15',
      'Bent-over row × 12 (dumbbells or weights; a backpack of books on the road)',
      'Plank 30 sec',
      'Dead bug × 10 each side',
    ],
    grip: ['Dead hang, once a day: hang until you can’t, log the seconds. Get to 60 sec by the end of Phase 1.'],
  },
  B: {
    label: 'Strength B',
    filter: 'sB',
    scheme: '4 rounds',
    progression: 'Go heavy enough that the last rep of each set is hard.',
    where: 'Hotel room, straps, or gym — this is the phase that wins the race',
    exercises: [
      'Rows × 10 (suspension straps or dumbbell rows, heavy enough that 10 is hard)',
      'Split squat × 10 each leg (dumbbells or a loaded backpack)',
      'Push-up × 12, or dumbbell floor press',
      'Farmer carry 40 sec (heaviest dumbbells, or a loaded suitcase in each hand)',
      'Hollow hold 30 sec',
      'Dead hang to failure',
    ],
    grip: [
      'Dead hang: build 60 sec toward 90 sec',
      'Towel hang: drape a hotel towel over the bar, grip the ends. Start at 10 sec.',
      'Suitcase hold: heaviest dumbbell, one hand, 30 sec each side',
    ],
  },
  C: {
    label: 'Strength C',
    filter: 'sC',
    scheme: '4 rounds — everything in Strength B, plus the race-specific work below',
    progression: 'Even negatives count: jump up, lower for 5 sec.',
    where: 'Hotel room, straps, or gym',
    exercises: [
      'Rows × 10 (suspension straps or dumbbell rows)',
      'Split squat × 10 each leg',
      'Push-up × 12, or dumbbell floor press',
      'Farmer carry 40 sec',
      'Hollow hold 30 sec',
      'Dead hang to failure',
      'Pull-ups or assisted pull-ups × max, 3 sets (bands or a foot on a chair; negatives count)',
      'Sandbag / suitcase carry 60 sec, held at chest, walking (the Hero Carry)',
      'Wall get-over drill × 10 (hotel version: 10 burpee-to-standing-jump instead)',
    ],
    grip: [
      'Dead hang: build 60 sec toward 90 sec',
      'Towel hang: 10+ sec',
      'Suitcase hold: 30 sec each side',
    ],
  },
}

// Strength A progresses week to week. Rather than make you remember the rule
// ("add 1 rep/week; at ~20 add a round and reset"), we compute this week's exact
// reps and round count from where you are in the Base phase.
const STRENGTH_A_BASE = [
  { name: 'Bodyweight squat', base: 15 },
  { name: 'Push-up', range: [8, 12], note: 'hands on desk or bed edge if floor push-ups aren’t there yet' },
  { name: 'Reverse lunge', base: 10, unit: ' each leg' },
  { name: 'Glute bridge', base: 15 },
  { name: 'Bent-over row', base: 12, note: 'dumbbells or weights; a backpack of books on the road' },
  { name: 'Plank', base: 30, time: true },
  { name: 'Dead bug', base: 10, unit: ' each side' },
]

export function strengthAForWeek(weekInPhase) {
  const w = Math.max(1, weekInPhase || 1)
  const cycle = 5                              // add 1 rep/week; after 5 weeks, add a round + reset
  const step = (w - 1) % cycle                 // 0..4 reps added this cycle
  const rounds = 3 + Math.floor((w - 1) / cycle)
  const exercises = STRENGTH_A_BASE.map((e) => {
    if (e.range) {
      return `${e.name} × ${e.range[0] + step}-${e.range[1] + step}${e.note ? ` (${e.note})` : ''}`
    }
    if (e.time) {
      return `${e.name} ${e.base + step * 5} sec`
    }
    return `${e.name} × ${e.base + step}${e.unit || ''}${e.note ? ` (${e.note})` : ''}`
  })
  return {
    ...STRENGTH.A,
    scheme: `Week ${w} of Base · ${rounds} rounds · 60 sec rest between rounds`,
    exercises,
    progression: step === 4
      ? 'Top of the cycle — next week add a round and drop the reps back down.'
      : 'These are this week’s exact reps. They step up 1 each week automatically.',
  }
}

// ---- CIRCUIT sessions ----
export const CIRCUIT = {
  A: {
    label: 'Circuit A',
    filter: 'cA',
    scheme: '5 rounds · 40 sec work / 20 sec rest · 60 sec between rounds',
    where: 'Hotel room, zero equipment',
    exercises: [
      'Bear crawl (in place if the room is small: hands and toes, knees hovering, alternate shoulder taps)',
      'Squat to stand, fast',
      'Push-up to shoulder tap',
      'Mountain climbers',
      'Step-back burpee (no jump)',
    ],
  },
  B: {
    label: 'Circuit B',
    filter: 'cB',
    scheme: '6 rounds · 40 sec work / 20 sec rest',
    where: 'Hotel room, zero equipment',
    exercises: [
      'Bear crawl forward and back',
      'Jump squat',
      'Push-up',
      'Reverse lunge, alternating',
      'Low crawl (belly on floor, army crawl, 10 ft and back)',
      'Burpee',
    ],
  },
  C: {
    label: 'Circuit C',
    filter: 'cB',
    scheme: '8 rounds · 40 sec work / 20 sec rest · add a 30 sec dead hang between rounds 4 and 5',
    where: 'Hotel room, zero equipment',
    exercises: [
      'Bear crawl forward and back',
      'Jump squat',
      'Push-up',
      'Reverse lunge, alternating',
      'Low crawl (belly on floor, army crawl, 10 ft and back)',
      'Burpee',
      '→ 30 sec dead hang between rounds 4 and 5',
    ],
  },
  C_OUTDOOR: {
    label: 'Circuit C (outdoors)',
    filter: 'cB',
    scheme: '8 rounds · outdoors, on real terrain',
    where: 'Outside: real crawls, real carries, grass and dirt',
    exercises: [
      'Bear crawl forward and back on grass',
      'Jump squat',
      'Push-up',
      'Reverse lunge, alternating',
      'Low crawl in the grass',
      'Burpee',
      'Carry with a real object',
      '→ 30 sec dead hang between rounds 4 and 5',
    ],
  },
}

// ---- The 15-minute travel backup ----
export const BACKUP = {
  label: 'The 15 minute travel backup',
  scheme: '5 rounds · 60 sec rest between rounds',
  note: 'Long flight, bad hotel, no time. Do this and log it as Backup. It counts.',
  exercises: [
    '10 bodyweight squats',
    '10 push-ups (hands on the desk if needed)',
    '10 reverse lunges, 5 each leg',
    '20 mountain climbers',
    '5 burpees, step-back version',
    'Finish with a dead hang if there is anything to hang from',
  ],
}

// Taper-week specific (protected final 2 weeks).
export const TAPER = {
  strength: {
    label: 'Strength C at 60%',
    filter: 'sC',
    scheme: '2 rounds only, easy effort',
    where: 'Cut everything to 60% this week',
    exercises: STRENGTH.C.exercises.slice(0, 6),
    grip: ['Light dead hangs only. Do not chase a PR this week.'],
  },
  circuit: {
    label: 'Circuit A, easy',
    filter: 'cA',
    scheme: 'Easy effort',
    where: 'Keep it light',
    exercises: CIRCUIT.A.exercises,
  },
}

export const GRIP_TYPES = ['Bar', 'Towel', 'Suitcase / one-hand', 'Pull-up bar (home)', 'Playground', 'Door frame']

export const THREE_RULES = [
  { t: 'Never skip Day 2.', d: 'If a week falls apart from travel, the strength day is the one that matters most.' },
  { t: 'Dead hang every day you can.', d: '60 seconds is the benchmark. It’s the difference between finishing obstacles and walking around them.' },
  { t: 'Slow is fine.', d: 'You’re building a long base with zero running background. Injury is the only thing that can actually stop you, and it comes from doing too much too early.' },
]

export const RACE_INFO = {
  title: 'Twin Cities Tough Mudder 5K',
  place: 'Hugo MN · Wild Wings of Oneka',
  defaultDate: '2027-06-26',
}
