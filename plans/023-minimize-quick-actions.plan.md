# Plan 023 — Minimize quick-action buttons you don't use

Status: draft
Depends-on: none
Snapshot: b778b9117cbeb4acc6ceb6d3c5fbd9b34ddd9e01
Source: the Human, 2026-11-19: "There's this option to arrange the different containers … I want to allow there an option to minimize, like if somebody's not using one of the containers, like let's say the activity or the sleep timer, he could have an option to drag them somewhere that they'll become like a really minimized one. And then only when it's clicked, it's gonna open again." Answers the same day: the six quick-action buttons (not the home sections); tapping a minimized one uses it once and it stays minimized.

## Problem Statement
The home screen shows all six quick-action buttons (meal, diaper, sleep, activity, weight, vomiting) at full size. A parent who never uses some of them can only reorder them (`ערוך פריסה`), not get them out of the way.

## Decisions
- **D-023-1 (Human, 2026-11-19)** Only the six quick-action buttons of `app-quick-grid` can be minimized; the home sections below them do not change.
- **D-023-2 (Human, 2026-11-19)** A minimized button shows as a small round chip (its slot icon and its short title) in one row, `ממוזער`, under the grid. Tapping a chip does exactly what a short tap on the full button does (meal quick log, diaper panel, sleep toggle, the activity / weight / vomiting sheet or panel); a long press opens the full sheet, as on the full button. The chip stays minimized.
- **D-023-3 (Planner)** In reorder mode (`ערוך פריסה`) the row becomes a drop zone with the hint `גררו לכאן כדי למזער`: dragging a button into it minimizes it, dragging a chip back into the grid restores it at the drop place. `סיום ושמירה` saves order and minimized together, with the existing toast. The row is hidden outside reorder mode when nothing is minimized.
- **D-023-4 (Planner)** All six may be minimized. A running sleep shows its timer only on the full sleep button; when sleep is minimized, the sleep chip shows a filled moon while a sleep runs.

## Goals & Success Criteria
**Primary:** a parent can drag an unused quick-action button into a minimized row and still use it with one tap.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0 (server tests included).
- [auto] `node --test server/test/tracker-settings.test.js` passes with these cases: `PUT /api/v1/tracker/settings { quickActionsMinimized: ['activity'] }` saves and `GET` returns it; an unknown id or a repeated id answers 400; a household with no saved value gets `[]`.
- [ui] On the home page (`/`), in `ערוך פריסה`, dragging the activity button into the `ממוזער` row and tapping `סיום ושמירה` leaves the activity button out of the grid and an activity chip in the row; after a reload the chip is still there; tapping the chip opens the activity sheet — e2e `e2e/023-1-minimize.spec.ts`, screenshot `e2e/screens/023-1.png`.
- [ui] `e2e/011-4-reorder.spec.ts` still passes.
- [human] On the phone, minimizing and restoring a button by dragging feels natural, and the chips are easy to tap.

## Execution Mode
- Parallel: yes
- Concurrent plans: 024, 025
- Isolated DB: no
- Reviewer: gate

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/domain/tracker/settings.js
server/test/tracker-settings.test.js
src/app/core/models/tracker-settings.ts
src/app/core/i18n/he.ts
src/app/pages/tracker/quick-grid/**
src/app/app.spec.ts
src/app/pages/settings/icon-picker-sheet/icon-picker-sheet.spec.ts
src/app/pages/tracker/entry-sheet/entry-sheet.spec.ts
e2e/023-1-minimize.spec.ts
e2e/011-4-reorder.spec.ts
e2e/screens/023-1.png
docs/project/current-state.md
src/app/pages/tracker/timeline-page/timeline-row/timeline-row.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the new validation stays a pure function in `server/domain/tracker/settings.js`.
- INV-2: preserves — no database code changes; the settings repository stores the field as it stores the others.
- INV-6: preserves — no calendar rule; only the Tracker settings domain file changes.
- INV-4: preserves — the field rides the existing `GET`/`PUT /api/v1/tracker/settings`, plain JSON.
- INV-5: preserves — the chip row uses tokens only.

## Backend Impact
- One new persisted field, `tracker.quickActionsMinimized` (list of quick-action ids, default `[]`), inside the household's existing `settings` document. Schema-less: no migration; a document without it reads as `[]`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, I hide the buttons I never use so the home screen shows what I need, and still reach them with one tap.

## Functional Requirements

### Must Have (P0)
- [ ] Drag a quick-action button into a minimized row and back, saved per household.
- [ ] A minimized chip works like the full button.

## Reuse Check
- none — the chips reuse `app-icon` slots (`quick.*`) and the grid's existing press handlers; the drop zone is a second CDK drop list in the same group.

## Defaults
- icon-slots — applies — how: the chips use the existing `quick.*` slots of `src/app/core/icons/icon-slots.ts`
- undo-instead-of-confirm — exception — why: minimizing is a layout change saved with `סיום ושמירה`, not a record; it is undone by dragging the chip back

## UI/UX Notes
- New Hebrew keys under the quick grid texts: `minimizedTitle: 'ממוזער'`, `minimizedHint: 'גררו לכאן כדי למזער'`.
- Chips: at least `--touch-target` high, one row that wraps, logical properties only.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] M1: Store which quick-action buttons a household minimized — `quickActionsMinimized` in `TRACKER_DEFAULTS` (`[]`), validated like `quickActionOrder` (known ids, no repeats), reconciled on read (unknown ids dropped); client model field; the spec fixtures that build a settings object get `quickActionsMinimized: []` — server/domain/tracker/settings.js, server/test/tracker-settings.test.js, src/app/core/models/tracker-settings.ts, src/app/app.spec.ts, src/app/pages/settings/icon-picker-sheet/icon-picker-sheet.spec.ts, src/app/pages/tracker/entry-sheet/entry-sheet.spec.ts
- [ ] M2: Let the parent drag a button into a minimized row and back while editing the layout — second `cdkDropList` (`qg__minimized`) connected to the grid list; `drop` moves ids between `order_` and a new `minimized_` signal; `saveOrder` saves both fields; the grid renders only ids not minimized — src/app/pages/tracker/quick-grid/**, src/app/core/i18n/he.ts
- [ ] M3: Make a minimized chip work like the full button — chip tap and long press call the same `onDown`/`onUp` path with the chip's id; the sleep chip shows a filled moon while a sleep runs — src/app/pages/tracker/quick-grid/**
- [ ] M4: Prove it in the real app — `e2e/023-1-minimize.spec.ts` per the [ui] item; keep `e2e/011-4-reorder.spec.ts` passing; one line in current-state under the Tracker notes — e2e/023-1-minimize.spec.ts, e2e/011-4-reorder.spec.ts, docs/project/current-state.md

## Technical Considerations
- Dependencies: `TrackerSettingsService.save` sends a partial object; the server merges it.
- New files needed: `e2e/023-1-minimize.spec.ts`.
- Model changes: `TrackerSettings.quickActionsMinimized: QuickActionId[]`.
- Backend / API: no new route; one more field on `/api/v1/tracker/settings`.
- Auth and validation: existing `requireAuth`; validation as above.
- Security surface: none.
- Data / migration: none (see Backend Impact).
- Project checks: none.

## Out of Scope
- Minimizing or reordering the home sections (today summary, diaper tracker, pumping tracker, bio-gaya card).
- Hiding a button completely.

## Critical Questions
- Q: Which containers? A: the six quick-action buttons (Human, 2026-11-19).
- Q: What does tapping a minimized one do? A: uses it once; it stays minimized (Human, 2026-11-19).

## Execution Notes
- none yet
