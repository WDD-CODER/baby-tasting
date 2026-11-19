# Plan 024 — One time picker everywhere: select-all typing and a tap-only time box

Status: draft
Depends-on: none
Snapshot: b778b9117cbeb4acc6ceb6d3c5fbd9b34ddd9e01
Source: the Human, 2026-11-19: "make all the different places that you select time work different … once it's selected it's all selected, then it allows the user to set it as he wishes, but it needs to be a time selector like the calendar container … so the user could pick the hour or set the time freely by text … so the user doesn't need to start clicking and dragging." Answer the same day: the time box is an hour grid, then a minute grid.

## Problem Statement
Setting a time today means placing the cursor in the typed `HH:MM` field and deleting digits, or opening `בחירה מרשימה` and scrolling two long lists. The reaction form uses the phone's own date-and-time input instead, which looks different on every phone.

## Decisions
- **D-024-1 (Human, 2026-11-19)** Tapping (focusing) the typed time selects its whole value, so the next digits replace it.
- **D-024-2 (Human, 2026-11-19)** A clock button next to the typed field opens a centred time box (like the calendar box): first a grid of the 24 hours `00`–`23`, then a grid of minutes in 5-minute steps `00`, `05` … `55`. Tapping a minute sets the time and closes the box. `ביטול` / tapping outside closes it unchanged. An exact minute (e.g. 07:43) is still typed.
- **D-024-3 (Planner)** The time box replaces the `בחירה מרשימה` link and its two lists. The `עכשיו` / `−5` / `−15` / `−30` and `היום` / `אתמול` chips stay.
- **D-024-4 (Planner)** "Every place" = every time picked in the app: the Tracker entry and edit sheets (already `app-datetime24`) and the reaction form's `מתי` field, which moves from the native `datetime-local` input to `app-datetime24` (with date). Date-only fields (birth date, export range, move date, delete-from-date) are out of scope.

## Goals & Success Criteria
**Primary:** every time in the app is set by typing over a fully selected value, or by two taps in a time box.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0, including `src/app/shared/ui/datetime24/datetime24.spec.ts` cases: focusing the typed field selects all of it; hour `14` then minute `35` in the box sets `14:35` and closes the box; `ביטול` leaves the value unchanged.
- [ui] On the home page (`/`), opening the activity sheet, tapping the clock button, then `09` and `30`, shows `09:30` in the typed field — e2e `e2e/024-1-time-box.spec.ts`, screenshot `e2e/screens/024-1.png`.
- [ui] On a reaction (`/reactions/new`), the `מתי` field is the same picker (typed time, chips, clock button) and saving keeps the chosen time — same spec file.
- [human] On the phone, setting a time takes two taps in the box, or typing right after tapping the field, with no deleting or scrolling.

## Execution Mode
- Parallel: yes
- Concurrent plans: 023, 025
- Isolated DB: no
- Reviewer: gate

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/ui/datetime24/**
src/app/pages/reactions/reaction-form/**
src/app/core/icons/icon-slots.ts
src/app/core/icons/icon-names.ts
server/domain/tracker/icon-names.js
src/app/core/i18n/he.ts
src/app/dev/components-demo/**
e2e/**
docs/project/current-state.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — `server/domain/tracker/icon-names.js` is regenerated data, no logic.
- INV-2: preserves — no database access changes.
- INV-4: preserves — the reaction's `noticedAt` is still sent as an ISO moment.
- INV-5: preserves — the time box uses tokens only.
- INV-6: preserves — no calendar rule or page changes.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, I set the time of an entry with two taps, or type it straight over the old one.

## Functional Requirements

### Must Have (P0)
- [ ] Select-all on focus in the typed time.
- [ ] Centred hour-then-minute time box behind a clock button.
- [ ] The reaction form uses the same picker.

## Reuse Check
- none — the time box lives inside the existing shared `app-datetime24`; no new shared piece

## Defaults
- confirm-destructive-action — exception — why: the plan deletes nothing; "deleting digits" describes today's typing
- icon-slots — applies — how: the clock button uses a new slot `ui.time` (default `schedule`) in `src/app/core/icons/icon-slots.ts`, then `node server/lib/gen-icon-names.mjs`

## UI/UX Notes
- New Hebrew keys in the datetime24 texts: `openTimeBox: 'בחירת שעה'`, `pickHour: 'שעה'`, `pickMinute: 'דקות'`; `fromList` is removed.
- The box: centred over a dimmed backdrop, grids of at least `--touch-target` buttons, `dir="ltr"` digits.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] T1: Select the whole typed time when the field is tapped so typing replaces it — `(focus)` selects the input's value — src/app/shared/ui/datetime24/**
- [ ] T2: Add the centred hour-then-minute time box behind a clock button and drop the old lists — step signal `hour | minute | null`; hour tap moves to minutes; minute tap sets the value through the existing setter and closes; backdrop and `ביטול` close; new slot `ui.time` and regenerated icon names — src/app/shared/ui/datetime24/**, src/app/core/icons/icon-slots.ts, src/app/core/icons/icon-names.ts, server/domain/tracker/icon-names.js, src/app/core/i18n/he.ts
- [ ] T3: Use the same picker for a reaction's time — the reaction form's `מתי` becomes `app-datetime24` with the date chips; the value it sends stays an ISO moment — src/app/pages/reactions/reaction-form/**
- [ ] T4: Prove it in the real app — `e2e/024-1-time-box.spec.ts` per the [ui] items; update any spec that used `בחירה מרשימה` or filled the reaction's `datetime-local`; the demo page shows the new box; one line in current-state — e2e/**, src/app/dev/components-demo/**, docs/project/current-state.md

## Technical Considerations
- Dependencies: `app-datetime24` is used by `entry-sheet` (time with date, and time only for `fixStart`) and the components demo; both get the change without edits.
- New files needed: `e2e/024-1-time-box.spec.ts`.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none.
- Project checks: none.

## Out of Scope
- Date-only fields (birth date, export range, calendar move date, delete-from-date).
- A wheel or the phone's native time picker.

## Critical Questions
- Q: What does the time box look like? A: hour grid, then minutes (Human, 2026-11-19).

## Execution Notes
- none yet
