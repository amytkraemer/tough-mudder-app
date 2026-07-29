// Easier / regression options per movement, drawn from the exercise guide's
// own cues and hotel-version notes. Matched loosely against the exercise name.
const MODS = [
  { m: /push-?up to shoulder tap/, t: 'Hands on the bed or desk — same rules, easier. Keep hips from twisting.' },
  { m: /push-?up|floor press/, t: 'Elevate your hands: desk, then bed, then a chair, then the floor. Higher is easier. Keep the plank — don’t drop to your knees.' },
  { m: /split squat/, t: 'Bodyweight only, hold a wall or chair for balance, and shorten the depth.' },
  { m: /jump squat/, t: 'Skip the jump. Do fast bodyweight squats with a hard heel drive instead.' },
  { m: /squat to stand|bodyweight squat|^squat/, t: 'Squat to a chair or box, or shorten the range. Hold a chair for balance if you need it.' },
  { m: /reverse lunge|lunge/, t: 'Hold a wall or chair for balance and take a shorter step.' },
  { m: /glute bridge/, t: 'Smaller range is fine. Pause and squeeze at the top rather than lifting higher.' },
  { m: /bent-over row|suspension row|^rows?\b|dumbbell row/, t: 'Go lighter or do fewer reps. On straps, stand more upright (less lean-back). If your back rounds, hinge less.' },
  { m: /farmer carry/, t: 'Lighter weight and a shorter walk. Set it down and reset whenever your grip slips.' },
  { m: /suitcase hold/, t: 'Lighter weight, shorter hold. Keep standing tall.' },
  { m: /chest carry|sandbag/, t: 'Lighter object, shorter walk.' },
  { m: /\bplank\b/, t: 'Put your forearms on a bed or desk, or hold a hard 20 seconds instead of a soft long one.' },
  { m: /hollow/, t: 'Bend your knees or raise your legs higher — both make it easier while keeping your back flat.' },
  { m: /dead hang|towel hang|\bhang\b/, t: 'Keep your toes lightly on the floor to take some weight, or just hang for shorter sets.' },
  { m: /pull-?up|negative/, t: 'Assisted: a band under one foot, or a foot on a chair. Or do negatives — jump up, lower for 5 seconds.' },
  { m: /wall get-over/, t: 'Use a lower surface, or swap in 10 burpee-to-standing-jumps.' },
  { m: /dead bug/, t: 'Use a smaller range — only reach as far as your lower back stays flat on the floor.' },
  { m: /bear crawl/, t: 'Do it in place: hold the hover and tap alternate shoulders instead of traveling.' },
  { m: /burpee/, t: 'Step back instead of jumping, and skip the push-up and the jump (Phase 1 default).' },
  { m: /low crawl|army crawl/, t: 'Shorten the distance and rest between lengths.' },
  { m: /mountain climber/, t: 'Slow the pace, or drive one knee at a time with control.' },
  { m: /superman/, t: 'Lift just your arms, or just your legs, instead of both at once.' },
]

export function modificationFor(name) {
  const s = (name || '').toLowerCase()
  for (const x of MODS) if (x.m.test(s)) return x.t
  return null
}
