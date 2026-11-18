# Plan 012 — Tracker timeline and the shared edit and delete sheet

Status: done
Depends-on: 011
Snapshot: 5f881b2abe79c9e8ee8ca2424032619b6818bae0
Source: docs/briefs/tracker/brief-T4-timeline-edit.md (program F5, F8, F10; spec-timeline-dashboards §2, §4, §5.5; spec-log-settings §6.9)

## Problem Statement
Parents must scroll everything that happened, newest first, and fix or delete any entry with every field editable.

## Goals & Success Criteria
**Primary:** `/timeline` and one edit sheet usable from any list.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0 (Karma and every server test).
- [auto] `src/app/pages/tracker/timeline-page/timeline-row/timeline-row.spec.ts` passes: each of the 8 event types renders its Hebrew title and detail line from spec-timeline-dashboards §2.6.
- [ui] On `/timeline`, switching the filter from `היום` to `7 ימים` shows an event from 3 days ago that `היום` hides.
- [ui] Editing a quick-recorded bottle's amount keeps its feed type and shows the new amount (F5).
- [ui] Clearing an event's note and saving removes the note from its row (F10).
- [ui] Deleting a row asks first; after confirming the row disappears and `ביטול` brings it back.
- [human] The timeline reads as clearly as the old one.

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
src/app/core/**
src/app/shared/**
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

- INV-4: preserves — uses `/api/v1/tracker/events` only.
- INV-5: preserves — row accents use the event tokens and quality-tier tokens.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, I correct yesterday's bottle amount in seconds.

## Functional Requirements

### Must Have (P0)
- [ ] Timeline per spec §2 (filter, pinned sleeping card, per-type rows, tier accents, badges).
- [ ] Edit sheet for every field of every type (F5, F8, F10), delete with confirm and undo.

## UI/UX Notes
- Exactly spec-timeline-dashboards §2 and §4 (Hebrew title per type instead of the raw English type — F10).

## Atomic Sub-tasks

- [x] N1: Build the timeline page — `src/app/pages/tracker/timeline-page/` with `timeline-row/` (per-type rendering, tier accent, big-nap badge, memo `!`, `⚡ מהיר`), the filter (resets to `היום` on app open), pinned `ישן עכשיו` card, empty and loading states; route `timeline` already exists from plan 009 (replace its empty state) — src/app/pages/tracker/timeline-page/**
- [x] N2: Build one edit sheet for every event type — `src/app/pages/tracker/edit-sheet/` reusing the entry-sheet forms of plan 011 in edit mode with every field (spit-up, liquid type, activity, supplement included); save via `PUT`, delete via the confirmation strip, error toast on failure; opened by `EditSheetService.open(event)` so plan 013 can open it from cards — src/app/pages/tracker/**, src/app/core/services/**
- [x] N3: Write the UI checks — `e2e/012-1-filter.spec.ts` … `e2e/012-4-delete.spec.ts`, screenshots `e2e/screens/012-<n>.png`; `docs/project/current-state.md` — e2e/**, docs/project/current-state.md

## Technical Considerations
- Backend / API: none new.

## Out of Scope
Statistics, settings, export.

## Critical Questions
- none

## Execution Notes
- pnpm run build -> exit 0; pnpm run lint -> exit 0; pnpm run test -> exit 0 (Karma 69 SUCCESS, server tests pass)
- scope-check --diff=origin/orch/tracker-1 -> SCOPE: ok; override-check -> ok
- e2e/012-1..4 written, not run (no running app here)
- behaviour: undo of a delete re-creates the event with POST (no restore endpoint), so it gets a new id and the current parent as logger
