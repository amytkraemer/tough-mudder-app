// Ported verbatim from exercise-guide.html. Content is not rewritten.
// Cue/miss/mod strings keep their original <b>/<em> emphasis (rendered as HTML,
// trusted static content). `s` holds the same session filter tokens as the source.

export const EX_FILTERS = [
  { f: 'all', label: 'All' },
  { f: 'sA', label: 'Strength A' },
  { f: 'cA', label: 'Circuit A' },
  { f: 'sB', label: 'Strength B' },
  { f: 'cB', label: 'Circuit B' },
  { f: 'sC', label: 'Strength C' },
  { f: 'grip', label: 'Grip' },
  { f: 'backup', label: 'Travel backup' },
]

const yt = (q) => `https://www.youtube.com/results?search_query=${q}`

export const EX_GROUPS = [
  {
    title: 'Lower body',
    note: 'The bog at Hugo is deep suction mud. Your legs pull out of it a few hundred times.',
    cards: [
      {
        h: 'Bodyweight squat', spine: 'lichen', s: 'sA cA sB cB sC backup',
        watch: yt('bodyweight+squat+proper+form+beginner'),
        tags: [{ t: 'Legs' }],
        cues: [
          'Feet shoulder width, toes turned out slightly.',
          'Push your hips back first, like sitting into a chair behind you.',
          'Go as deep as you can keep your heels flat. Thighs parallel is plenty.',
          'Drive through the middle of your foot to stand.',
        ],
        miss: 'Heels lifting off the floor. If they lift, you went too deep or you are leaning forward. Shorten the range.',
      },
      {
        h: 'Reverse lunge', spine: 'lichen', s: 'sA cA cB backup',
        watch: yt('reverse+lunge+proper+form'),
        tags: [{ t: 'Legs' }, { t: 'Balance' }],
        cues: [
          'Stand tall. Step one foot straight back, about two feet.',
          'Lower until your back knee nearly touches the floor.',
          'Weight stays mostly on the <em>front</em> leg. Push through the front heel to stand.',
          'Alternate legs, or do all reps on one side then switch.',
        ],
        miss: 'Stepping back at an angle instead of straight back, which makes you wobble. Step straight.',
      },
      {
        h: 'Split squat', spine: 'lichen', s: 'sB sC',
        watch: yt('dumbbell+split+squat+form'),
        tags: [{ t: 'Legs' }, { t: 'Strength' }],
        cues: [
          'A reverse lunge that stays put. Set your feet in the split stance and leave them there for all reps.',
          'Straight up and down. Back knee to the floor, then press back up.',
          'Hold dumbbells at your sides, or a backpack on your chest.',
        ],
        mod: 'Loaded backpack held against your chest, or a suitcase in each hand. Back foot on the floor, not elevated.',
        miss: 'Drifting forward over the front foot each rep. Pick a spot on the wall and keep your torso vertical.',
      },
      {
        h: 'Squat to stand (fast)', spine: 'clay', s: 'cA cB backup',
        watch: yt('air+squat+for+conditioning+fast+reps'),
        tags: [{ t: 'Legs' }, { t: 'Engine' }],
        cues: [
          'Same as a bodyweight squat, done for speed instead of depth.',
          'Full stand at the top, hips all the way open, every rep.',
          'Breathe out on the way up. Do not hold your breath.',
        ],
      },
      {
        h: 'Jump squat', spine: 'clay', s: 'cB',
        watch: yt('jump+squat+proper+landing+form'),
        tags: [{ t: 'Legs' }, { t: 'Power' }],
        cues: [
          'Squat to about half depth, then jump.',
          'Land quiet and soft, absorbing straight into the next squat.',
          'Quality over count. Stop the set when landings get loud.',
        ],
        mod: 'If you are above a sleeping guest, skip the jump. Do fast squats with a hard heel drive instead.',
      },
      {
        h: 'Glute bridge', spine: 'lichen', s: 'sA',
        watch: yt('glute+bridge+exercise+form'),
        tags: [{ t: 'Glutes' }, { t: 'Hips' }],
        cues: [
          'Lie on your back, knees bent, feet flat and close to your butt.',
          'Drive through your heels and lift your hips until your body is a straight line from knee to shoulder.',
          'Squeeze hard at the top for one full second. Lower slowly.',
        ],
        miss: 'Arching your lower back to get higher. Ribs stay down. The height comes from your glutes, not your spine.',
      },
    ],
  },
  {
    title: 'Push',
    note: 'Getting yourself up off the ground, over and over, covered in mud.',
    cards: [
      {
        h: 'Push-up', spine: 'clay', s: 'sA cA cB backup',
        watch: yt('push+up+proper+form+beginner+progression'),
        tags: [{ t: 'Push' }, { t: 'Core' }],
        cues: [
          'Hands slightly wider than shoulders, directly under your chest, not your face.',
          'Body is one rigid plank from head to heels. Squeeze your glutes.',
          'Elbows track back at about 45 degrees, not flared straight out.',
          'Chest to within a fist of the floor, then press up.',
        ],
        mod: 'Too hard on the floor? Put your hands on the desk, then the bed, then a chair, then the floor. Elevating your hands is the progression. Do not drop to your knees, elevate instead. It keeps the plank position honest.',
        miss: 'Hips sagging or piking up. If your low back aches, your glutes are off.',
      },
      {
        h: 'Push-up to shoulder tap', spine: 'clay', s: 'cA cB backup',
        watch: yt('push+up+with+shoulder+tap+exercise'),
        tags: [{ t: 'Push' }, { t: 'Core' }, { t: 'Anti-rotation' }],
        cues: [
          'Do one push-up. At the top, lift one hand and tap the opposite shoulder.',
          'Put it down, push-up, tap with the other hand.',
          'The goal is that your hips do <em>not</em> twist when you lift a hand.',
        ],
        mod: 'Hands on the bed or desk. Same rules, easier.',
      },
      {
        h: 'Dumbbell floor press', spine: 'clay', s: 'sB',
        watch: yt('dumbbell+floor+press+form'),
        tags: [{ t: 'Push' }],
        cues: [
          'Lie on your back on the floor, knees bent, a dumbbell in each hand.',
          'Press straight up over your chest, then lower until your upper arms touch the floor.',
          'Brief pause on the floor, then press again.',
        ],
        mod: 'No dumbbells? Skip it and add a set of push-ups instead.',
      },
    ],
  },
  {
    title: 'Pull and grip',
    note: 'The section that decides your race. Monkey bars and wall climbs are where people stop.',
    cards: [
      {
        h: 'Dead hang', spine: 'blaze', s: 'sA sB sC grip',
        watch: yt('dead+hang+bar+how+to+grip+strength'),
        tags: [{ t: 'Grip', c: 'grip' }, { t: 'Shoulders', c: 'pull' }],
        cues: [
          'Grab a bar overhead, hands shoulder width, palms facing away. Thumbs wrapped around.',
          'Hang with your arms straight. Feet off the floor or knees bent if the bar is low.',
          'Shoulders active, not shrugged into your ears. Pull them slightly down and back.',
          'Hold until your grip gives out. Time it. Log it.',
        ],
        mod: 'Hotel gym: the pull-up bar, or the frame of a cable machine. On the road with nothing: a sturdy door frame ledge, or skip it that day.',
        miss: 'Hanging fully limp with dead shoulders. Keep tension in the shoulder blades.',
      },
      {
        h: 'Towel hang', spine: 'blaze', s: 'grip',
        watch: yt('towel+hang+grip+strength+training'),
        tags: [{ t: 'Grip', c: 'grip' }, { t: 'Race specific', c: 'grip' }],
        cues: [
          'Drape a towel over the bar. Grip one end in each hand.',
          'Hang the same as a dead hang. It will be far harder and much shorter.',
          'Start at 10 seconds. This is the closest indoor match to a wet muddy rope.',
        ],
        miss: 'Doing it first. Towel hang <em>after</em> your regular hang, or your grip is already gone.',
      },
      {
        h: 'Backpack bent-over row', spine: 'lichen', s: 'sA backup',
        watch: yt('bent+over+row+form+beginner'),
        tags: [{ t: 'Pull', c: 'pull' }, { t: 'Back' }],
        cues: [
          'Load a backpack with books, water bottles, whatever is heavy.',
          'Hinge forward at the hips until your torso is about 45 degrees. Flat back, knees soft.',
          'Hold a strap in each hand, pull the pack to your belly button. Elbows go back, not out.',
          'Squeeze your shoulder blades together at the top. Lower slowly.',
        ],
        miss: 'Rounding your back. If you cannot keep it flat, hinge less.',
      },
      {
        h: 'Suspension row (or dumbbell row)', spine: 'lichen', s: 'sB sC',
        watch: yt('TRX+inverted+row+form'),
        tags: [{ t: 'Pull', c: 'pull' }, { t: 'Back' }],
        cues: [
          'Anchor the straps over the top of a door and close it. Handle in each hand.',
          'Walk your feet forward and lean back so your arms are straight and you are at an angle.',
          'Body stays a straight rigid line. Pull your chest to your hands.',
          'More lean back equals harder. Walk your feet forward to increase difficulty.',
        ],
        mod: 'No straps: single-arm dumbbell row with one knee on the bed. Or a towel looped around a sturdy door handle, feet forward, lean back and pull.',
        miss: 'Leading with your chin and letting your hips sag. Chest arrives first, hips stay in line.',
      },
      {
        h: 'Pull-up and negative pull-up', spine: 'blaze', s: 'sC',
        watch: yt('negative+pull+up+progression+beginner'),
        tags: [{ t: 'Pull', c: 'pull' }, { t: 'Grip', c: 'grip' }],
        cues: [
          '<b>Full pull-up:</b> hang, pull until your chin clears the bar, lower under control.',
          '<b>Negative:</b> jump or step up so your chin starts above the bar, then lower yourself as slowly as you can. Aim for 5 seconds down. This is how you build the full version.',
          'Assisted: a resistance band under one foot, or one foot resting on a chair taking some weight.',
        ],
        mod: 'Negatives on the hotel gym bar. No bar at all: swap in extra suspension rows or towel rows.',
      },
      {
        h: 'Farmer carry', spine: 'blaze', s: 'sB sC grip',
        watch: yt('farmers+carry+dumbbell+form'),
        tags: [{ t: 'Grip', c: 'grip' }, { t: 'Core' }, { t: 'Traps' }],
        cues: [
          'A heavy weight in each hand, hanging at your sides. Just walk.',
          'Stand tall, shoulders back, ribs down. Do not lean.',
          'Walk until your grip starts to slip, not until you are out of breath.',
        ],
        mod: 'A packed suitcase in each hand, up and down the hallway. Genuinely effective and nobody will think twice about it.',
      },
      {
        h: 'Suitcase hold', spine: 'blaze', s: 'grip',
        watch: yt('suitcase+hold+carry+grip+core+exercise'),
        tags: [{ t: 'Grip', c: 'grip' }, { t: 'Anti-lean' }],
        cues: [
          'One heavy weight, one hand, held at your side. Stand still.',
          'Resist leaning toward the weight. Stay perfectly upright.',
          '30 seconds each side.',
        ],
      },
      {
        h: 'Chest carry', spine: 'blaze', s: 'sC',
        watch: yt('sandbag+bear+hug+carry+form'),
        tags: [{ t: 'Full body' }, { t: 'Race specific' }],
        cues: [
          'Hug a heavy awkward object to your chest and walk. Sandbag, loaded duffel, suitcase.',
          'Elbows tucked under the object, chest up, short steps.',
          'Trains the Hero Carry obstacle and general mud slogging under load.',
        ],
      },
    ],
  },
  {
    title: 'Core and ground work',
    note: 'Crawls, mud pits, barbed wire. A lot of this race happens on your belly.',
    cards: [
      {
        h: 'Bear crawl', spine: 'clay', s: 'sA cA cB backup',
        watch: yt('bear+crawl+exercise+proper+form'),
        tags: [{ t: 'Core' }, { t: 'Full body' }, { t: 'Race specific' }],
        cues: [
          'Hands and toes on the floor, knees bent and hovering about an inch off the ground.',
          'Back flat like a table. Move opposite hand and opposite foot together.',
          'Small steps. Hips stay low and level, they should not rock side to side.',
        ],
        mod: 'No room to travel? Hold the hover position and slowly tap one shoulder with the opposite hand, alternating. Same brutal effect, zero square footage.',
        miss: 'Butt in the air. Keep hips at shoulder height or lower.',
      },
      {
        h: 'Low crawl (army crawl)', spine: 'clay', s: 'cB',
        watch: yt('army+low+crawl+technique'),
        tags: [{ t: 'Full body' }, { t: 'Race specific' }],
        cues: [
          'Flat on your stomach, as low as you can get. Head turned to one side.',
          'Pull with your forearms, push with the inside of the opposite knee.',
          'Stay flat. This trains the barbed wire crawls directly.',
        ],
        mod: '10 feet forward, 10 feet back, repeat. A hotel room is exactly long enough.',
      },
      {
        h: 'Plank', spine: 'clay', s: 'sA backup',
        watch: yt('forearm+plank+proper+form'),
        tags: [{ t: 'Core' }],
        cues: [
          'Forearms on the floor, elbows under shoulders, toes on the ground.',
          'Straight line from head to heels. Squeeze glutes, tuck ribs down.',
          'Actively push the floor away so your upper back is not sagging between the shoulder blades.',
        ],
        miss: 'Holding a sagging plank for 90 seconds. A hard, correct 30 seconds beats a soft 2 minutes.',
      },
      {
        h: 'Hollow hold', spine: 'clay', s: 'sB sC',
        watch: yt('hollow+body+hold+progression'),
        tags: [{ t: 'Core' }],
        cues: [
          'Lie on your back. Press your lower back flat into the floor and keep it there the whole time.',
          'Lift your shoulders and legs a few inches off the floor. Arms overhead or by your sides.',
          'You should look like a shallow banana.',
        ],
        miss: 'Lower back lifting off the floor. The second it lifts, bend your knees or raise your legs higher to make it easier.',
      },
      {
        h: 'Dead bug', spine: 'clay', s: 'sA',
        watch: yt('dead+bug+exercise+form'),
        tags: [{ t: 'Core' }],
        cues: [
          'On your back, arms straight up at the ceiling, knees bent at 90 degrees over your hips.',
          'Slowly lower one arm overhead and the <em>opposite</em> leg toward the floor.',
          'Return, then switch sides. Lower back stays glued to the floor throughout.',
        ],
        miss: 'Going too far and letting the back arch. Only extend as far as you can hold the floor contact.',
      },
      {
        h: 'Superman', spine: 'clay', s: 'sA',
        watch: yt('superman+exercise+back+form'),
        tags: [{ t: 'Back' }, { t: 'Glutes' }],
        cues: [
          'Face down, arms stretched overhead.',
          'Lift arms, chest, and legs off the floor at the same time. Hold one second.',
          'Small range. You are not trying to fold in half.',
        ],
      },
      {
        h: 'Mountain climbers', spine: 'clay', s: 'cA cB backup',
        watch: yt('mountain+climbers+exercise+form'),
        tags: [{ t: 'Core' }, { t: 'Engine' }],
        cues: [
          'Start in a push-up position, hands under shoulders.',
          'Drive one knee toward your chest, then switch, like running in place horizontally.',
          'Hips stay low and level. Do not let your butt pop up as you speed up.',
        ],
      },
    ],
  },
  {
    title: 'Full body and race skills',
    note: null,
    cards: [
      {
        h: 'Burpee (step-back and full)', spine: 'clay', s: 'cA cB backup',
        watch: yt('burpee+step+back+beginner+modification'),
        tags: [{ t: 'Full body' }, { t: 'Engine' }],
        cues: [
          '<b>Step-back version (start here):</b> squat down, hands on floor, step one foot back then the other into a plank. Step them back in. Stand up tall.',
          '<b>Full version:</b> same, but jump the feet back and in, add a push-up at the bottom and a jump at the top.',
          'Every rep finishes with hips fully open and standing tall.',
        ],
        mod: 'Step-back, no jump. Quiet, works on carpet, will not annoy the room below.',
        miss: 'Rushing into the full version too early and wrecking your low back. Step-backs for all of Phase 1.',
      },
      {
        h: 'Wall get-over', spine: 'blaze', s: 'sC',
        watch: yt('obstacle+course+race+wall+climb+technique'),
        tags: [{ t: 'Pull', c: 'pull' }, { t: 'Race specific' }],
        cues: [
          'Find something waist high and solid. A picnic table, a low retaining wall, a fence rail.',
          'Jump and get your chest onto the top edge, then hook a heel over and roll across.',
          'The technique is chest first, then hip, then leg. Not a pull-up.',
        ],
        mod: 'Nothing safe to climb. Substitute 10 burpees with a hard vertical jump at the top.',
        miss: 'Trying to muscle straight up with your arms. Use the jump, get your torso over the edge, let the wall hold your weight.',
      },
      {
        h: 'Strides', spine: 'clay', s: 'sC',
        watch: yt('running+strides+how+to+do+them'),
        tags: [{ t: 'Running' }],
        cues: [
          'After an easy run, do 4 to 6 accelerations of about 20 seconds each.',
          'Build smoothly to roughly 85 percent effort, hold a few seconds, ease off. Not a sprint.',
          'Walk a full minute between each. They should feel good, not hard.',
        ],
      },
    ],
  },
  {
    title: 'The 15 minute travel backup',
    note: 'Long flight, bad hotel, no time. Do this and log it as <b>Backup</b> in the tracker. It counts.',
    cards: [
      {
        h: 'The whole session', spine: 'blaze', s: 'backup',
        watch: null,
        tags: [{ t: '5 rounds' }, { t: '60 sec rest between' }],
        cues: [
          '10 bodyweight squats',
          '10 push-ups (hands on the desk if needed)',
          '10 reverse lunges, 5 each leg',
          '20 mountain climbers',
          '5 burpees, step-back version',
          'Finish with a dead hang if there is anything to hang from',
        ],
        missTitle: 'Watch this',
        miss: 'If backups pass roughly 30 percent of your completed sessions, your strength work has stopped progressing. The dashboard tracks that share for you.',
      },
    ],
  },
]
