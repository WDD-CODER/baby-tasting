# Plan 010 — Tracker events and sleep: data model, rules and API

Status: draft
Depends-on: 009
Snapshot: 5f881b2abe79c9e8ee8ca2424032619b6818bae0
Source: docs/briefs/tracker/brief-T2-events-sleep.md (program P4, P6, F7, F9, F10, F12; spec-server-data §1, §3.5–3.11, §7.6)

## Problem Statement
Every Tracker event type must be stored, listed, edited and deleted through one validated API with today's rules (minus the listed fixes), so the screens of plans 011–014 only render.

## Goals & Success Criteria
**Primary:** `/api/v1/tracker/events` and `/api/v1/tracker/sleep/*` with pure, tested rules.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0 (Karma and every server test).
- [auto] `node --test server/domain/tracker/events.test.js server/domain/tracker/sleep.test.js server/domain/tracker/baby-day.test.js` exits 0, covering: a sleep toggle opens and then closes with the duration in minutes (rounded, minimum 1); a second open sleep is refused; a manual sleep that overlaps another is refused; the baby day starts at 06:00 Asia/Jerusalem, also on both DST-switch days; each enum of spec-server-data §1.1 rejects an unknown value; quality tiers of §1.4 for sample events.
- [auto] `node --test server/test/tracker-events.test.js server/test/tracker-sleep.test.js` exits 0, covering: every route answers 401 without a session; create/list/edit/delete for each of the 8 event types; soft-deleted events are never returned; `clear` with a date removes that date's events too (F7); editing an open sleep works (F12); clearing a note removes it and editing a sleep keeps who started and ended it (F10); `loggedBy` always comes from the session.

## Execution Mode
- Parallel: no
- Concurrent plans: none (Tracker plans 009–014 run in order)
- Isolated DB: no
- Reviewer: gate

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/app.js
server/domain/**
server/routes/**
server/repositories/**
server/lib/**
server/test/**
docs/project/current-state.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected. The Tracker behaviour specs in `docs/briefs/tracker/spec-*.md` are binding for exact Hebrew texts and rules; `docs/briefs/tracker/00-tracker-program.md` (P1–P7, F1–F13) wins over them where it says so. The old Tracker code is at `C:\coding projects\Cursor/baby-tracker` (read only) when a spec line is unclear.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — sleep, validation, baby-day and quality-tier rules are pure in `server/domain/tracker/`, with "now" passed in.
- INV-2: preserves — `server/repositories/tracker-events-repository.js` is the only code that touches `trackerEvents`.
- INV-3: preserves — routes read `req.user` and `req.householdId` only.
- INV-4: preserves — `/api/v1/tracker/*`, ISO timestamps for moments, `YYYY-MM-DD` for days.
- INV-6: preserves — no calendar or tasting placement code is touched.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the screens of the next plans, I call one API that already applies every rule.

## Functional Requirements

### Must Have (P0)
- [ ] Collection `trackerEvents` with every `BabyEvent` field and per-type fields, validated enums, soft delete.
- [ ] Events, clear, open-sleep and sleep-toggle routes with the fixes F7, F9, F10, F12.

## UI/UX Notes
- none (API only).

## Atomic Sub-tasks

- [x] L1: Write the Tracker event and sleep rules as pure functions — `server/domain/tracker/events.js` (`EVENT_TYPES` and every enum of spec-server-data §1.1, `validateEvent(type, body)` per type with the fields of §1.3, `normalizeEvent`), `sleep.js` (`toggleSleep({ open, at, parentType, location })`, `checkOverlap(sleeps, candidate)`, `durationMinutes(start, end)` rounded, min 1), `baby-day.js` (`babyDayStart(nowIso)` 06:00 Asia/Jerusalem), `quality.js` (the tier helpers of §1.4); tests beside each — server/domain/tracker/**
- [x] L2: Store events through one repository — `server/repositories/tracker-events-repository.js` (`list(householdId, { from, to, limit })` newest first without `deletedAt`, `get`, `create`, `update`, `softDelete`, `clearBefore(householdId, dateInclusive)`, `findOpenSleep`), indexes `{ householdId, timestamp: -1 }` and `{ householdId, type, endAt }` in `server/repositories/indexes.js` — server/repositories/**
- [x] L3: Offer the events and sleep API — `server/routes/tracker-events.js`: `GET /api/v1/tracker/events?from&to&limit` (default limit 400 like spec §3.7), `POST`, `PUT /:id` (any field; `note: ''` or `null` clears it; sleep `startedBy`/`endedBy` kept), `DELETE /:id` (soft), `POST /clear` `{ before: 'YYYY-MM-DD' }` inclusive; `server/routes/tracker-sleep.js`: `GET /api/v1/tracker/sleep/open`, `POST /api/v1/tracker/sleep/toggle` `{ location, at? }` (ends the open sleep at `at` or now, else starts one at `at` or now; 409 `sleep_overlap` when a manual time overlaps); `loggedBy`/`startedBy`/`endedBy` from `req.user`; tests `server/test/tracker-events.test.js`, `server/test/tracker-sleep.test.js` — server/routes/**, server/app.js, server/test/**
- [x] L4: Note what now exists — `docs/project/current-state.md` — docs/project/current-state.md

## Technical Considerations
- Backend / API: 7 routes under `/api/v1/tracker/`.
- Auth and validation: session required; every field validated per type; unknown fields refused (400) except on import (plan T7).
- Data / migration: new collection `trackerEvents` (shape = old `BabyEvent` + `householdId`, `babyId`, audit fields, `legacyId` reserved for the import).

## Out of Scope
Screens, stats, export, the Firestore import.

## Critical Questions
- none

## Execution Notes
- Domain tests 22 pass, route tests 17 pass.
- behaviour: POST and PUT accept and ignore id and loggedBy in the body (the session decides); any other unknown field is 400. Reverse: reject them too.
- behaviour: POST /clear requires before (YYYY-MM-DD); there is no clear-all. Reverse: allow an empty body.
