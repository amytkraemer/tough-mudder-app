# Tough Mudder 5K Training App — Full Recap for Review (v2)

Updated after a three-part overhaul (stabilization → multi-day/library/scaling
→ design). Hand this to a reviewer to audit the work.

## 1. What it is
An installable, offline-capable PWA that combines a 47-week Tough Mudder 5K
training plan (PDF), an xlsx tracker, and an exercise guide (HTML) into one
mobile app, with optional per-account cloud sync.

- **Live URL:** https://amytkraemer.github.io/tough-mudder-app/
- **Deploy:** GitHub Pages, **`main` branch `/docs`** (no longer a feature branch).
- **Stack:** Vite 6 + React 18 + Tailwind 3, `vite-plugin-pwa` (Workbox),
  Firebase 12 (Auth + Firestore). **Vitest** for tests. No custom backend.
- **Fonts (self-hosted woff2, offline-safe):** Big Shoulders Display (display),
  Barlow (body), Barlow Semi Condensed (labels).

## 2. Views (5 tabs) + screens
Today, Plan, Moves (exercise guide), Grip (dead-hang log), Progress. Plus
Onboarding (3 questions once), Settings, a monthly export nudge, and a
full-screen guided-run timer.

## 3. Feature set
- **Core plan:** 3 fixed sessions/week (Run 1 / Strength / Circuit) over 47
  weeks in 4 phases (Base 10 / Strength Build 14 / Race Specific 14 / Terrain &
  Taper 9), anchored so week 47 is race week. Dates match the source xlsx.
- **Onboarding inputs:** race date, days/week, running base. Running base sets
  only where the run progression starts; strength always starts at Strength A
  (≥ 4 weeks); freed weeks extend Phase 2; a close race compresses P2→P3→terrain
  and protects Phase 1 + the final 2 taper weeks.
- **Overlay days (days-per-week 4/5/6):** Day 4 Grip & Pull (sets progress by
  phase, drop to 2 in the last 2 weeks), Day 5 Easy Run 2, Day 6 Mobility &
  Carry. Fixed order; never alter the core 3, phases, or race math. Beginner
  gate: not-running + 5/6 days warns before saving, and Easy Run 2 is locked
  until week 5 (substituted by Mobility & Carry).
- **Run scaling by experience** on Day 1 + Easy Run 2: run3 ×1.25 (+2 hills),
  regular ×1.5 (+4 hills, weekly pack from Phase 2). Never scales Phase 1,
  Broken 5K, taper, or race week.
- **Extra sessions + supplemental library:** "Add a session" repeats the week's
  Run/Strength/Circuit or adds a named preset (Grip Ladder, Hotel Room 15,
  Obstacle Skills, Recovery Run, Ankle & Terrain Prep, Stairwell Intervals).
  Extras are logged/charted but **excluded from the completion denominator**.
- **Per-session logging** with movement-adaptive inputs (time+distance / reps+
  weight / seconds / rounds), placeholders that carry over last week's numbers,
  and per-movement "Easier options" with a "Modified" checkbox.
- **Guided run intervals:** timestamp-based timer (accurate across screen lock),
  warm-up/cool-down, run/walk/incline phases (incline segment preserved), beeps
  + vibration + wake-lock, one-tap logging. Distance runs fall back to free-run.
- **Cloud sync:** Google sign-in, Firestore, offline-first, per-account isolated.
- **Progress:** running/lift/grip trend charts, streak, "still scaling" list,
  consistency breakdown.

## 4. Data model
localStorage key `tm.data.v1` (same shape as the Firestore doc `users/{uid}`):
```
{ version, settings{onboarded,raceDate,runningBase,daysPerWeek,startDate,
                    hotelMode,lastExportPrompt,createdAt},
  marks{ "<week>:<session>": done|backup|partial|missed },
  logs{  "<week>:<session>": {min,mi}|{rounds}|{ex:{<i>:{n,w,mod}}}, notes },
  extra{ "<week>": [{id,kind,n,preset?}] },
  hangs[ {id,date,seconds,grip,notes} ] }
```
`<session>` = `run|strength|circuit` (core), `overlay-grip|overlay-run2|
overlay-mobility` (overlay days, derived per week), or an extra id. Overlay days
are **derived** from days-per-week + running base (attached as `week.overlays`),
not stored. A migration moves the former `bonus` key to `extra` with no data loss.
Sync is doc-level last-write-wins; first sign-in unions local + remote.

## 5. Security — verified live, not just documented
Firestore rules: `allow read, write: if request.auth != null &&
request.auth.uid == uid`. Probed the live database unauthenticated: **read and
write both return 403 PERMISSION_DENIED on `users/*` and every other path** —
default-deny, not open test mode. Accounts are isolated; friends' data can't be
read or written by anyone else. The Firebase web config in the repo is not a
secret (protection is the rules).

## 6. Tests (Vitest) — 51 passing
Run with `npm test` (executes under `TZ=America/Los_Angeles` so any regression
to local-time date math fails). Files: `test/schedule`, `metrics`, `runScaling`,
`runIntervals`, `overlays`. Coverage includes: default 47-week/10-14-14-9 plan
and week 47 = race week; all four running-base skips landing on race week;
Phase 1 never < 4 weeks; compression protecting Phase 1 + 2 taper weeks; extra
runway extending Phase 2; **timezone invariance** (UTC-derived week); run scaling
verification cases (4mi→6mi, 8×45→10×45, 35min→50min) and protected sessions;
run-interval parsing incl. the incline segment; overlay gate + core-invariance +
grip taper; **completion rate ≤ 100%** with overlays and extras marked.

## 7. Key modules
- `lib/schedule.js` — plan generation, UTC day-number date math, overlay attach,
  run-scaling application.
- `lib/runScaling.js`, `lib/runIntervals.js` — pure, well-tested.
- `lib/stats.js` — completion (arrived-only, clamped ≤ 100%) + hang stats.
- `lib/metrics.js` — log index (core + extra + overlay), prev-value lookup,
  progress series.
- `lib/storage.js` (+ migration), `lib/sync.js`, `lib/firebase.js`.
- `data/plan.js`, `data/overlays.js`, `data/supplemental.js`,
  `data/exercises.js`, `data/modifications.js`.
- `components/` — App, TabBar, Today, Plan, Exercises, Grip, Progress, Settings,
  Onboarding, SessionCard, SessionLog, ExtraArea, OverlaySection, Chart,
  LineChart, RunTimer, ExportNudge.

## 8. Design system (Part 3)
Palette pitch/char/steel/bone/ash/blaze/caution/mud/kill (old token names alias
to it). Big Shoulders Display headings. SVG grain overlay, caution hazard-stripe
dividers, mud splatter on the Today hero, giant days-to-race numeral, rubber-
stamp DONE/BACKUP/PARTIAL/MISSED on marking, mile-marker phase headers, a Plan
vertical course map, dog-tag session cards. `prefers-reduced-motion` makes the
stamp instant and stops the pulse.

## 9. Known limitations / review these
1. **Sync is doc-level last-write-wins.** Two devices editing the same week
   offline then reconnecting can clobber each other. Fine for one person;
   consider field-level merges if that changes.
2. **Overlay days + extras are excluded from the completion denominator**
   (intentional, keeps the rate ≤ 100% and comparable across users). A reviewer
   may want overlay completion surfaced somewhere.
3. **Same-week duplicate chart points** — a core run + an extra/Easy-Run-2 in the
   same week produce two points at the same week label. Cosmetic.
4. **Run-scaling parsing is regex-based.** It targets the leading duration,
   mileage, and hill reps; unusual future strings could be missed. Covered by
   tests for the real prescriptions.
5. **`clip-path`/`position:fixed` gotcha** — dog-tag cards use `clip-path`, which
   makes them the containing block for fixed descendants. RunTimer now portals to
   `document.body`; any *new* fixed-position child rendered inside a card must do
   the same.
6. **Grain overlay sits above modals** (z-index) at ~3.5% — intentional uniform
   texture; confirm it reads acceptably on the Settings/timer panels.
7. **Timezone model** uses the UTC calendar day; near the UTC midnight boundary a
   late-evening session in far-west zones can read as the next day. Weekly
   granularity absorbs it except at the Sun→Mon boundary. Accepted trade-off for
   travel-stability; see the timezone tests.
8. **No E2E/visual tests** — logic is unit-tested; UI was verified by screenshot.

## 10. Commit history (high level)
Base PWA → Firebase sync (dormant → enabled) → Strength A per-week reps →
performance logging → easier-options/modified → placeholders + Progress tab →
extra sessions/day nudge/guided runs → **Part 1** stabilization (tests,
timezone, RunTimer, extra rename, precache) → **Part 2** overlays/library/scaling
→ **Part 3** design overhaul → guided-timer portal fix. Deploys from `main`.
