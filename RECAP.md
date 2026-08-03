# Tough Mudder 5K Training App — Full Recap for Review (v3)

Updated after a three-part overhaul (stabilization → multi-day/library/scaling
→ design) and a correctness/data-safety hardening pass (§11). Hand this to a
reviewer to audit the work.

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
  hangs{ "<id>": {id,date,seconds,grip,notes} },
  clock{ marks,logs,hangs,extra: {"<key>": ms} },       // per-item last-write time
  tombstones{ marks,logs,hangs,extra: {"<key>": ms} } } // per-item deletion time
```
`<session>` = `run|strength|circuit` (core), `overlay-grip|overlay-run2|
overlay-mobility` (overlay days, derived per week), or an extra id. Overlay days
are **derived** from days-per-week + running base (attached as `week.overlays`),
not stored. `hangs` is an id-keyed **object** (was an array); `extra` clock/
tombstone keys are composite `"<week>:<id>"`. Migrations move the former `bonus`
key to `extra` and the `hangs` array to an object, both idempotent and lossless.
Sync is **per-item last-write-wins with tombstones** (see §11.9), not doc-level.

## 5. Security — verified live AND in CI
Firestore rules: `allow read, write: if request.auth != null &&
request.auth.uid == uid`. Two layers of proof: (a) probed the live database
unauthenticated — read/write both return 403 PERMISSION_DENIED everywhere; and
(b) a **Firebase-emulator test signs in as a real authenticated user and is
denied read AND write on another user's document** (`npm run test:rules`). So
isolation is enforced against *authenticated* cross-account access, not just
anonymous — and it runs in CI. The Firebase web config in the repo is not a
secret (protection is the rules).

## 6. Tests (Vitest) — 91 unit + 7 rules passing
`npm test` runs the unit suite under `TZ=America/Los_Angeles` (so any regression
to local-time date math fails); `npm run test:rules` runs the Firestore-rules
tests against the emulator; `npm run test:ci` runs both. Unit coverage includes:
the default 47-week/10-14-14-9 plan and week 47 = race week; all four
running-base skips landing on race week; Phase 1 never < 4 weeks; compression
protecting Phase 1 + 2 taper weeks; extra runway extending Phase 2; **timezone
invariance**; **run-scaling coverage** (every prescription string must match a
scaling pattern or be on the do-not-scale list — a new unscaled run fails the
build); overlay gate + core-invariance + grip taper; **core vs plan completion**
per days-per-week (both ≤ 100%); the **cloud-load ordering + write guard**;
**account reset** (delete-before-clear, failed-delete keeps local); and
**deletion tracking** (LWW both directions, import-omission, TTL cleanup).
Emulator tests run serially (shared Firestore) and cover isolation, real
doc-delete on reset, and nested-`deleteField` tombstone GC.

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
1. **Sync is per-item last-write-wins with tombstones** (§11.9). Two devices
   editing *different* items both survive; a same-item conflict resolves to the
   newer write (accepted trade-off). Deletions propagate. A fresh device that
   imports a backup *before* signing in unions with the cloud rather than
   replacing it (import replaces relative to current local state).
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
→ **Part 3** design overhaul → guided-timer portal fix → **v3 hardening** (§11).
Deploys from `main`.

## 11. Correctness & data-safety hardening (v3)
No new features — a stabilization pass driven by real-world use. All shipped,
tested, and live.

**Round 1 — six correctness fixes**
1. **Account isolation verified for real** — emulator test proves an
   authenticated user can't read/write another user's doc (see §5).
2. **Completion math for multi-day plans** — split into **Core completion**
   (fixed 3-day spine, denominator always 141) and **Plan completion** (scales
   with days/week, includes overlays). A 6-day user can no longer skip overlays
   and show 100%. Extras still counted separately; neither rate exceeds 100%.
3. **Run scaling fails loudly** — a coverage test asserts every prescription
   string matches a scaling pattern or is on the explicit do-not-scale list.
4. **Two devices can't wipe each other** — moved off whole-document overwrite to
   per-item merge; `hangs` array → id-keyed object (superseded by §11.9's LWW).
5. **Import survives `bonus`→`extra`** — old exports and old-shape cloud docs
   migrate losslessly; migration writes back so it runs once, not every load.
6. **clip-path/`position:fixed` gotcha documented** in CLAUDE.md; audit found
   RunTimer the only affected element and it already portals to `<body>`.

**Round 2 — four bugs found in use**
7. **Returning user saw onboarding + blank progress on a new device.** The app
   decided onboarding from empty local storage *before* the cloud doc loaded.
   Fixed the ordering (wait for auth + cloud, show a loader, never onboard over
   cloud data) and added a **write guard**: an empty/fresh local state can never
   overwrite a populated cloud doc. Settings now shows sync status + last-synced.
8. **Reset didn't stick — cloud restored everything.** Reset only cleared local.
   Now it **deletes the Firestore document** and confirms that *before* clearing
   local (a failed delete leaves local intact and surfaces an error); a second
   device mirrors the wipe. UI warns it erases cloud data on all devices and
   offers export-first.
9. **Deletions didn't sync (LWW + tombstones).** Un-checking a mark, removing an
   extra, or deleting a hang was re-added on the next sync. Now every item has a
   timestamp (`clock`) and every deletion a `tombstone`; merge picks the most
   recent of {edit, delete} per item — newer delete beats older edit, newer edit
   beats older delete. Legacy items backfill to a floor timestamp (no data loss).
   Tombstones GC after 90 days (local prune + nested `deleteField` in the cloud).
   Import replaces under LWW: entries a backup omits are tombstoned so the cloud
   can't silently re-add them. Core in `lib/lww.js` (pure, unit-tested).
10. **Sign-in failed in the installed PWA.** Standalone used `signInWithRedirect`,
    which iOS drops (app origin ≠ Firebase authDomain → Safari storage
    partitioning → empty `getRedirectResult`), looping back to onboarding.
    Switched to **popup-first everywhere** (Firebase's recommended flow for
    storage-partitioning browsers), redirect only as fallback. Confirmed working.

**No data was lost** in any reported issue — the returning-user and reset bugs
were about display/ordering and deletion propagation, not destruction of stored
data. Account isolation was independently verified.
