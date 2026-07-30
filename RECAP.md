# Tough Mudder 5K Training App — Full Recap for Review

A complete summary of what has been built, how it works, and the areas most
worth reviewing for errors/issues. Hand this to a reviewer (human or AI) to
audit the work and suggest corrections.

## 1. What it is
A single-user (multi-account) **installable PWA** that combines three source
files — a 47-week Tough Mudder 5K training plan (PDF), an xlsx tracker, and an
exercise-guide HTML — into one offline-capable mobile web app.

- **Live URL:** https://amytkraemer.github.io/tough-mudder-app/
- **Repo/branch:** `amytkraemer/tough-mudder-app` @ `claude/tough-mudder-training-app-ylr943`
- **Deploy:** GitHub Pages serving `/docs` from the feature branch (base path `/tough-mudder-app/`)
- **Stack:** Vite 6 + React 18 + Tailwind 3, `vite-plugin-pwa` (Workbox), Firebase 12 (Auth + Firestore) for optional sync. No custom backend.
- **Fonts:** Archivo Black / Barlow / Barlow Semi Condensed, **self-hosted** (vendored woff2) so it works offline. Palette/typography copied verbatim from the exercise guide's CSS custom properties.
- **Size:** ~3,400 LOC; main bundle ~247KB; Firebase split into lazy chunks (largest ~611KB Firestore, only loaded when signed in).

## 2. Views (5 bottom tabs)
1. **Today** — current training week (computed from today + race date), the 3 sessions with exact prescriptions, big Done/Backup/Partial/Missed targets, day-plan chips, bonus sessions + "Add a session".
2. **Plan** — pinned stats (days to race, done vs scheduled, completion %, backup share), per-phase progress bars, collapsible phases (current auto-expanded), every week expandable to full session cards.
3. **Moves** (Exercises) — the exercise guide ported as-is: session filter chips, hotel-mode toggle, all cues/mistakes/Watch links.
4. **Grip** — dead-hang logger (date/seconds/grip/notes), PR, rolling avg, line chart, 60s/90s benchmarks.
5. **Progress** — days/completion/streak; running trend (distance/time toggle); per-lift weight/reps chart with movement picker; dead-hang chart; "still scaling" list; consistency breakdown.

Plus: **Onboarding** (3 questions, once), **Settings** (change race date/days/running base → recalculates; Export/Import JSON; sign in/out; reset), **monthly export nudge**.

## 3. Feature capabilities
- **Per-session performance logging** with movement-adaptive inputs: run→time+distance; strength→reps+weight or seconds per exercise; circuit→rounds; notes everywhere. Placeholders **carry over last week's logged value** (matched by movement name), falling back to the plan target.
- **Easier options + "Modified" tracking** per movement (regressions drawn from the guide's cues; a checkbox records when scaled; surfaces in "still scaling").
- **Bonus sessions** — add extra Run/Strength/Circuit to any week, reusing that week's prescription; logged/charted/removable; don't change the 141 denominator.
- **Guided run intervals** — timer with warm-up/cool-down, run/walk phases, beeps + vibration + wake-lock, skip/pause/finish, one-tap logging. Free-run fallback for distance runs.
- **Cloud sync** — Google sign-in, Firestore, offline-first; each account isolated by security rules (`users/{uid}`). Sign-in optional.

## 4. Data model
**localStorage key `tm.data.v1`** (also the Firestore doc shape at `users/{uid}`):
```
{ version, settings:{onboarded,raceDate,runningBase,daysPerWeek,startDate,hotelMode,lastExportPrompt,createdAt},
  marks:{ "<week>:<session>": done|backup|partial|missed },
  logs:{  "<week>:<session>": {min,mi} | {rounds} | {ex:{<i>:{n,w,mod}}} , notes },
  bonus:{ "<week>": [{id,kind,n}] },
  hangs:[ {id,date,seconds,grip,notes} ] }
```
`<session>` is `run|strength|circuit` for core, or a bonus id for extras. Sync =
last-write-wins at the doc level; first sign-in does a union merge so nothing is
lost.

## 5. Scheduling engine (`src/lib/schedule.js`) — the highest-risk logic
- Phases (default): Base 10w, Strength Build 14w, Race Specific 14w, Terrain&Taper 9w = **47 weeks**, anchored so week 47 = race week; default start Aug 3 2026 for a June 26 2027 race (matches the xlsx dates exactly).
- **Running base** sets only where the *run* progression starts: none→wk1, jog12→wk5, run3→wk10, regular→wk11. Implemented as skip = {0,4,9,10}.
- **Strength never skips:** everyone starts Strength A, Phase 1 = `max(4, 10-skip)` weeks; freed weeks extend Phase 2.
- **Fit to race:** if the race is too close, compress Phase 2 → Phase 3 → terrain (floors of 2/2/0), never Phase 1, never the final 2 taper weeks. If there's extra runway, extend Phase 2.
- **Strength A reps** computed per week (`strengthAForWeek`): +1 rep/week, +1 round & reset every 5 weeks.

All content (run prescriptions, Strength A/B/C, Circuit A/B/C, backup, taper) is
transcribed verbatim from the PDF/xlsx into `src/data/plan.js`; exercise guide in
`src/data/exercises.js`; regressions in `src/data/modifications.js`.

## 6. File map
- `lib/`: `schedule.js` (plan generation), `storage.js` (persistence + export/import), `stats.js` (Dashboard stats + hang stats), `metrics.js` (log index, prev-value lookup, progress series, streak, modification helpers), `runIntervals.js` (run→phases parser), `firebase.js` + `firebaseConfig.js` + `sync.js` (auth/Firestore/merge hook).
- `components/`: `App` wiring, `Onboarding`, `TabBar`, `Today`, `Plan`, `Exercises`, `Grip`, `Progress`, `Settings`, `SessionCard`, `SessionLog`, `BonusArea`, `Chart`, `LineChart`, `RunTimer`, `ExportNudge`.
- `data/`: `plan.js`, `exercises.js`, `modifications.js`.

## 7. Known limitations / please review these specifically
1. **Sync conflicts (doc-level last-write-wins).** Two devices editing the same week offline, then both coming online, can clobber each other (whole-doc overwrite). Fine for one person; confirm that's acceptable or suggest field-level merges.
2. **`RunTimer` interval logic** (`components/RunTimer.jsx`) — the countdown nests `setIdx` inside `setLeft` and reads `idx` in a fallback expression; it works in testing but the phase-transition math is convoluted and is the most likely place for an off-by-one or a stale-closure bug. Worth close scrutiny / a rewrite to a single reducer or timestamp-based clock.
3. **Run parser gaps** (`lib/runIntervals.js`) — "30-35 min easy, plus 5 min at 4% incline mid-run" is guided as a flat 30-min block (the incline segment is dropped). Distance runs (miles, Broken 5K) intentionally have no guided mode. Confirm these are acceptable.
4. **Bonus vs core stats** — completed/completion-rate count **core sessions only**; bonus sessions show in Progress charts (via logs) but not in "sessions completed." Intentional, but may read as an inconsistency.
5. **Same-week duplicate points** — a bonus run + core run in the same week produce two chart points at the same x-label. Cosmetic.
6. **Timezone** — all date math is device-local (`parseDate`/`mondayOf`). Traveling across timezones near a week boundary could nudge the "current week." Low risk; worth a sanity check.
7. **Dead prop** — `SessionCard` still destructures an unused `onGuided`. Harmless; should be removed.
8. **PWA precache weight** — the ~611KB Firestore chunk is precached even for users who never sign in. Consider excluding it from precache or lazy-caching.
9. **Compression edge case** — verify the `too-tight` path (race date only a few weeks out) still protects Phase 1 + the 2 taper weeks and doesn't produce a negative/zero-length phase.
10. **Firebase config is committed** in `firebaseConfig.js` — correct/safe for Firebase web (protection is the Firestore rules), but may be flagged by reviewers unfamiliar with Firebase. Rule: `allow read, write: if request.auth != null && request.auth.uid == uid`.

## 8. Build & deploy
`npm install` → `npm run build` (outputs to `/docs`) → committed and pushed;
GitHub Pages serves it. **No automated tests exist yet.** The scheduling engine
(`schedule.js`) and metrics (`metrics.js`) are pure functions and are the best
first targets for unit tests.

## 9. Commit history (feature order)
1. Build the base PWA from the three source files
2. Add optional Firebase cloud sync (dormant until configured)
3. Enable cloud sync with the Firebase project config
4. Strength A: weights-first row + concrete per-week reps
5. Per-session performance logging (times/distances, reps/weights, seconds)
6. Per-movement easier options + "did modified" tracking
7. Carry last week's numbers as placeholders + add a Progress tab
8. Bonus sessions, days-per-week nudge, and guided run intervals
