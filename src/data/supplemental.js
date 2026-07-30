// Supplemental workout library (spec 2.5). Named presets any user can add to
// any day via "Add a session". They plug into the Extra system: logged
// separately, excluded from the completion denominator. Content is verbatim.

export const SUPPLEMENTAL = {
  'grip-ladder': {
    id: 'grip-ladder', name: 'Grip Ladder', kind: 'strength', dur: '15 min',
    scheme: '3 rounds · stop when grip fails, not when time is up',
    where: 'The failure point at this race. Train it fresh.',
    exercises: [
      'Dead hang: max hold (rest 60)',
      'Towel hang: max hold (rest 60)',
      'Farmer carry: 45 sec (rest 60)',
    ],
    note: 'Repeat 3 times. Stop when grip fails, not when the clock runs out.',
  },
  'hotel-room-15': {
    id: 'hotel-room-15', name: 'Hotel Room 15', kind: 'circuit', dur: '15 min',
    scheme: '5 rounds · 60 sec rest',
    where: 'Same session as the travel Backup. Logs as Extra when you add it voluntarily.',
    exercises: [
      '10 bodyweight squats',
      '10 push-ups',
      '10 reverse lunges (5 each leg)',
      '20 mountain climbers',
      '5 step-back burpees',
      'Finish with a dead hang if there is anything to hang from',
    ],
  },
  'obstacle-skills': {
    id: 'obstacle-skills', name: 'Obstacle Skills', kind: 'strength', dur: '30 min',
    scheme: 'Outdoors · skill quality over conditioning · rest as needed',
    where: 'Outside, on a waist-high surface and open ground.',
    exercises: [
      'Wall get-overs: 10 total on a waist-high surface',
      'Low crawl: 6 x 30 ft',
      'Bear crawl: 6 x 30 ft',
      'Chest carry: 4 x 60 sec with something awkward',
      'Monkey bar traverse or hangs: 5 attempts',
    ],
  },
  'recovery-run': {
    id: 'recovery-run', name: 'Recovery Run', kind: 'run', dur: '20-30 min',
    scheme: 'Flat, easy, conversational',
    where: 'Use the day after a hard session.',
    exercises: [],
  },
  'ankle-terrain-prep': {
    id: 'ankle-terrain-prep', name: 'Ankle & Terrain Prep', kind: 'strength', dur: '15 min',
    scheme: 'Soft landings, quality over speed',
    where: 'Preps the ankles for off-trail bog and uneven ground.',
    exercises: [
      'Calf raises: 3 x 20',
      'Single-leg balance: 3 x 45 sec each side (eyes closed if steady)',
      'Lateral bounds: 3 x 10 each side (soft landings)',
      'Barefoot walk on grass or carpet: 3 min',
      'Toe and heel walks: 2 x 30 sec',
    ],
  },
  'stairwell-intervals': {
    id: 'stairwell-intervals', name: 'Stairwell Intervals', kind: 'run', dur: '20 min',
    scheme: 'Up 4 flights, walk down to recover, repeat 10-15 times',
    where: 'Best hotel cardio there is — no treadmill or gym needed.',
    exercises: [],
  },
}

export const SUPPLEMENTAL_LIST = Object.values(SUPPLEMENTAL)
