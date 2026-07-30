# CLAUDE.md

Working notes for this repo. Read RECAP.md for the full product/architecture tour;
this file is for things that will bite you if you don't know them.

## Build & deploy
- `npm run dev` — local dev server.
- `npm run build` — outputs the PWA to `/docs` (base path `/tough-mudder-app/`).
- Deployed via **GitHub Pages from the `main` branch `/docs` folder**. Merge the
  feature branch into `main` and push; Pages serves `/docs`.
- Live URL: https://amytkraemer.github.io/tough-mudder-app/

## Tests
- `npm test` — Vitest unit suite. **Always run under `TZ=America/Los_Angeles`**
  (the npm script sets it); date math uses UTC day-numbers and some assertions are
  timezone-sensitive.
- `npm run test:rules` — Firestore security-rules test against the Firebase
  emulator (requires Java). Verifies real account isolation: a signed-in user
  cannot read or write another user's document.
- `npm run test:ci` — both of the above. Run this before deploying.

## Data model gotchas
- `hangs` is an **id-keyed object**, not an array (so per-key sync merge can't drop
  a second device's entry). Use `hangsArray(data.hangs)` from `src/lib/stats.js`
  anywhere you need to iterate/sort. `hangsToObject()` in `storage.js` migrates the
  legacy array shape and is idempotent.
- The field once called `bonus` is now `extra`. Migration lives in
  `storage.migrate()` and `sync.norm()`; both tolerate old-shape localStorage,
  imported JSON, and Firestore docs. `loadData()` writes the migrated shape back so
  migration doesn't re-run on every load.
- Sync is **last-write-wins per item with tombstones** (`sync.mergeData` →
  `lib/lww.js`), never whole-document overwrite. `firebase.writeRemote` uses
  `setDoc(..., { merge: true })`.
  - Every synced item carries a timestamp in `data.clock` (`{marks,logs,hangs,extra}`
    → `{key: ms}`); every deletion leaves a `data.tombstones` entry keyed the same
    way. `extra` uses composite keys `"<week>:<id>"`. Merge picks the most recent
    of {live edit, deletion} per item — so un-checking a mark, removing an extra,
    or deleting a hang **sticks across devices** instead of being re-added.
  - **Edit sites must stamp:** call `stamp(d, field, key)` when you add/edit an
    item and `tomb(d, field, key)` when you delete one (see `App.jsx` setMark/
    setLog/addExtra/removeExtra and `Grip.jsx`). A mutation that skips this won't
    sync its create/delete correctly.
  - Pre-LWW items (no clock) are backfilled to `LEGACY_TS` in `normalizeMeta`, so
    any real edit/delete outranks them. Tombstones are GC'd after
    `TOMBSTONE_TTL_MS` (90d): pruned locally in `normalizeMeta`, and removed from
    the cloud doc via nested `deleteField` in `writeRemote` (setDoc does NOT treat
    dotted keys as field paths — build the nested object).
  - **Import** replaces current data under LWW (`importInto`): entries the backup
    omits are tombstoned at import time so the cloud can't silently re-add them.
- Emulator tests share ONE Firestore instance and `clearFirestore()` in
  `beforeEach`, so `vitest.rules.config.js` forces serial execution
  (`fileParallelism: false`). Don't re-enable parallelism for `*.emulator.test.js`.

## Completion math
- **Core completion** = the fixed 3-day spine only; denominator is always 141
  (47 weeks × 3). Independent of days-per-week.
- **Plan completion** = scales with days-per-week and includes overlay days.
- Supplemental library ("extra") workouts are counted separately and never enter
  either denominator. Neither rate can exceed 100% (`Math.min(1, done/sched)`).

## Known gotchas

### position:fixed inside a dog-tag card breaks — must portal to <body>
The dog-tag session cards use `.dogtag { clip-path: polygon(...) }`
(`src/index.css`). **A `clip-path` (like `transform` or `filter`) makes that
element the containing block for any `position:fixed` descendant.** So a child
with `position:fixed; inset:0` will NOT cover the viewport — it gets clipped to
the card's box and pinned inside it.

**Fix:** render any full-screen fixed element that lives inside a dog-tag card
through a portal to `document.body` so it escapes the clipped ancestor. See
`src/components/RunTimer.jsx` — it uses `createPortal(..., document.body)` and
pins to `100dvh`; that's the reference implementation.

**Audit (2026-07):** the only `position:fixed` element that actually renders
inside a `.dogtag` card is **RunTimer** (guided-run overlay in `SessionCard`),
and it is already portaled. The other fixed/overlay elements —
`Settings` (full-screen modal), `ExportNudge` (bottom banner), and `TabBar`
(bottom nav) — all render at the **App root**, outside any dog-tag, so their
`position:fixed` resolves against the viewport correctly and needs no portal.
The rubber-stamp overprint (`.stamp-wrap`) is `position:absolute`, which is the
intended behavior: it is meant to sit inside the card's clipped bounds.

**Rule of thumb:** if you add a modal, sheet, or full-screen overlay, render it
at the App root. If it must live inside a `SessionCard`/`.dogtag` subtree, portal
it to `document.body`.
