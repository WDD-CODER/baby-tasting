# Plan 013 — Tracker statistics computed on the server and the six dashboard sections

Status: draft
Depends-on: 012
Snapshot: 5f881b2abe79c9e8ee8ca2424032619b6818bae0
Source: docs/briefs/tracker/brief-T5-dashboards.md (program P4, P6, F1; spec-timeline-dashboards §3; spec-server-data §4)

## Problem Statement
The statistics page must answer how the baby eats, sleeps, pees, pumps, spits up and grows over a range, with numbers computed once on the server (today the stats routes fail and the browser recomputes).

## Goals & Success Criteria
**Primary:** six stats routes backed by pure tested functions, and the `/stats` page of spec §3.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0 (Karma and every server test).
- [auto] `node --test server/domain/tracker/stats.test.js server/test/tracker-stats.test.js` exits 0, covering: each of the six functions on fixed data; a DST-switch day; an empty range; the 06:00 day start for the dashboard range; routes accept `from`/`to` as `YYYY-MM-DD` and refuse a full ISO string with 400 (F1).
- [ui] With two bottles today (60 and 90 ml), `/stats` shows `150` in the nutrition section for `היום`.
- [ui] Switching the range to `7` ימים shows 7 bars in the sleep bar chart.
- [human] The numbers match what the parents remember for the last few days.

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
server/test/**
src/app/core/**
src/app/shared/**
src/app/dev/**
src/app/pages/tracker/**
e2e/**
DESIGN.md
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

- INV-1: preserves — `server/domain/tracker/stats.js` is pure (events, range, time zone in; numbers out).
- INV-2: preserves — the routes read events through the tracker events repository.
- INV-4: preserves — `/api/v1/tracker/stats/*`, `YYYY-MM-DD` params.
- INV-5: preserves — bars are shared components on tokens.
- INV-3: preserves — new routes sit behind the existing auth middleware and read `req.user` and `req.householdId` only.
- INV-6: preserves — no calendar or tasting placement code is touched.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, I see in five seconds whether today's feeding is on track.

## Functional Requirements

### Must Have (P0)
- [ ] Stats for nutrition, sleep, diapers, weight, pumping, vomiting on the server (spec-server-data §4; pumping and vomiting from spec-timeline-dashboards §3.6–3.7).
- [ ] `/stats` page with six collapsible sections and the range control.

## UI/UX Notes
- Exactly spec-timeline-dashboards §3 (texts, tiles, empty states, formats); bars as shared components: `app-split-bar`, `app-bar-chart` (scaled to a target, e.g. 16 h of sleep), `app-sequence-bar` (sleep/awake).

## Atomic Sub-tasks

- [ ] O1: Compute every statistic in pure functions — `server/domain/tracker/stats.js` (`nutritionStats`, `sleepStats`, `diaperStats`, `weightStats`, `pumpingStats`, `vomitingStats`; input events + `{ from, to, dayStartHour }`, days in Asia/Jerusalem) with tests — server/domain/tracker/**
- [ ] O2: Serve them — `server/routes/tracker-stats.js` `GET /api/v1/tracker/stats/:kind?from&to` (400 `invalid` unless both are `YYYY-MM-DD`) with tests — server/routes/**, server/app.js, server/test/**
- [ ] O3: Build the statistics page — `src/app/pages/tracker/stats-page/` (replaces the empty state of plan 009) with the six sections and the range control, the three bar components in `src/app/shared/ui/` (on the demo page), cards open the edit sheet via `EditSheetService` — src/app/pages/tracker/**, src/app/shared/ui/**, src/app/dev/**, src/app/core/**
- [ ] O4: Write the UI checks — `e2e/013-1-nutrition.spec.ts`, `e2e/013-2-range.spec.ts`, screenshots; `docs/project/current-state.md` — e2e/**, docs/project/current-state.md

## Technical Considerations
- Backend / API: 6 read-only routes.

## Out of Scope
Export (plan 014), charts library.

## Critical Questions
- none

## Execution Notes
- none yet
