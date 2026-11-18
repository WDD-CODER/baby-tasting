# Plan 011 — Tracker log tab: today at a glance, quick actions, entry sheets, sleep timer and daily trackers

Status: done
Depends-on: 010
Snapshot: 5f881b2abe79c9e8ee8ca2424032619b6818bae0
Source: docs/briefs/tracker/brief-T3-log-tab.md (program P2, P4, P5, P7, F3, F4, F8, F9; spec-log-settings §1, §3, §4, §5, §6.1–6.8, §7, §10)

## Problem Statement
The Tracker home must let a parent record any event in a few taps, exactly as in the old app, and see today at a glance.

## Goals & Success Criteria
**Primary:** the `/` page reproduces the old log tab (spec-log-settings §4–§7) on the new API, with the fixes F3, F4, F9.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0 (Karma and every server test).
- [auto] Component tests pass for: the double-submit guard starting only after validation (F4) — `src/app/pages/tracker/entry-sheet/entry-sheet.spec.ts`; new bottle entries starting with the settings' default bottle type (F3) — same file; the awake-time widget thresholds of spec §4.4 — `src/app/pages/tracker/awake-widget/awake-widget.spec.ts`; `DateTime24` producing Asia/Jerusalem wall-clock values — `src/app/shared/ui/datetime24/datetime24.spec.ts`.
- [ui] On `/`, tapping the diaper quick action and saving `פיפי` shows it in today's carousel.
- [ui] On `/`, a short press on the sleep button shows the open-sleep pill; a second short press ends it and the carousel shows a sleep with a duration.
- [ui] On `/`, saving a bottle with an empty amount shows the validation message; filling the amount saves at once.
- [ui] On `/`, dragging one quick button before another keeps the new order after a reload.
- [human] Recording a feeding one-handed takes as few taps as in the old app.

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
package.json
pnpm-lock.yaml
src/styles.scss
src/styles/**
src/app/core/**
src/app/shared/**
src/app/dev/**
src/app/layout/**
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

- INV-4: preserves — the page calls only `/api/v1/tracker/*`.
- INV-5: preserves — Tracker's per-event colours (spec-timeline-dashboards §5.5) become tokens in `src/styles/tokens.scss` (`--color-event-nutrition`, …); icons through `app-icon` slots.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent at 3 a.m., I record a bottle with two taps.
- As a parent, I start and end a sleep with one tap and see how long the baby has been awake.

## Functional Requirements

### Must Have (P0)
- [ ] Shell behaviours of spec §1, §3 (refresh 5 s + focus, toast with undo, delete strip, banners, floating pills, notifications).
- [ ] Log tab of spec §4 (carousel, quick grid with reorder, awake widget, diaper and pumping trackers, Bio Gaya card).
- [ ] Entry sheets of spec §6.1–6.8, sleep of §5, DateTime24 of §7.

## UI/UX Notes
- Everything as in spec-log-settings §3–§7 (exact Hebrew), drawn with the design system: `app-bottom-sheet` for sheets, `app-button`, `app-chip`, tokens only.
- Icons: add slots for every quick action, event type and sub-type, sleep location and card icon (group, Hebrew label, keywords) to `icon-slots.ts`, each with an accurate Material Symbols default (e.g. `quick.sleep` → `bedtime`, `event.diaper` → `baby_changing_station`, `location.crib` → `crib`, `location.stroller` → `stroller`, `event.weight` → `scale`, `event.pumping` → `water_drop`, `event.nutrition.breast` → `breastfeeding`).

## Atomic Sub-tasks

- [x] M1: Load and refresh the Tracker data in one service — `src/app/core/services/tracker-events.service.ts` (`events` signal for the last 400, `openSleep`, refresh every 5 s while visible and on focus, `create`, `update`, `remove` with undo, `toggleSleep`), toast-with-undo support in `ToastService` (action label + callback) — src/app/core/**
- [x] M2: Add the per-event colours and icon slots — tokens in `src/styles/tokens.scss`, slots in `src/app/core/icons/icon-slots.ts` per UI notes; DESIGN.md table — src/styles/**, src/app/core/icons/**, DESIGN.md
- [x] M3: Build the shared 24-hour date-time picker — `src/app/shared/ui/datetime24/` per spec §7 in Asia/Jerusalem (P4), on the demo page — src/app/shared/ui/datetime24/**, src/app/dev/**
- [x] M4: Build the log page — `src/app/pages/tracker/log-page/` with `today-carousel/`, `quick-grid/` (fixed rows + CDK drag-drop reorder saved to `quickActionOrder`), `awake-widget/`, `diaper-tracker/`, `pumping-tracker/`, `bio-gaya-card/`, floating pills and banners per spec §3–§4 — src/app/pages/tracker/**, src/app/layout/**
- [x] M5: Build the entry sheets and the sleep flow — `src/app/pages/tracker/entry-sheet/` (one sheet, a form per type of spec §6.5–6.8, shared footer §6.3, double-submit guard after validation, default bottle from settings), `sleep-timer/` and the short/long press flow of §5 with F9 (one open sleep; "end current sleep" uses the chosen time); browser notifications of §1.7 — src/app/pages/tracker/**
- [x] M6: Write the UI checks — `e2e/011-1-diaper.spec.ts` … `e2e/011-4-reorder.spec.ts`, screenshots `e2e/screens/011-<n>.png`; `docs/project/current-state.md` — e2e/**, docs/project/current-state.md

## Technical Considerations
- Dependencies: none new (`@angular/cdk` drag-drop already present).
- Backend / API: none new.
- Security surface: none new.

## Out of Scope
Editing existing events (plan 012), timeline, statistics, settings screens, export.

## Critical Questions
- none

## Execution Notes
- build: `pnpm run build` -> exit 0.
- lint: `pnpm run lint` -> exit 0 ("All files pass linting", no colour literals).
- test: `pnpm run test` -> exit 0; Karma `TOTAL: 53 SUCCESS`; server `# pass 178, # fail 0` (the MongoClientClosedError lines are the existing teardown noise of the server tests).
- Component tests: `entry-sheet.spec.ts` (F3 default bottle type FORMULA / EXPRESSED_MILK; F4 a refused save does not start the guard and the fixed retry saves at once; an empty amount shows `יש להזין כמות`; the guard still blocks a second valid save), `awake-widget.spec.ts` (thresholds 35/45/60/60 and 45/60/75/90, bath state 76-89), `datetime24.spec.ts` (Asia/Jerusalem wall-clock values in summer and winter, the nudge rolls the day, the 24-hour list).
- [ui] items: `e2e/011-1-diaper.spec.ts`, `011-2-sleep.spec.ts`, `011-3-bottle.spec.ts`, `011-4-reorder.spec.ts` written, not run (no running app or QA login here); screenshots `e2e/screens/011-<n>.png`.
- scope extended: none. `node server/lib/gen-icon-names.mjs` also rewrites `server/domain/tracker/icon-names.js` (outside the scope): that file was reverted, so the server does not yet accept icon overrides for the new slots; run the generator in the icon-settings plan, or approve `server/domain/tracker/icon-names.js`.
- `e2e/001-2-components.spec.ts` section count 14 -> 15 (the DateTime24 section on `/dev/components`).
- Decisions: the quick meal sends `nutrition: { feedType: 'BOTTLE' }` because the server requires a feed type (the carousel still shows `האכלה 🍼`; the bottle count ignores quick meals); activity intensity 0 is sent without `cryingIntensity` (the server accepts 1-10); the long-open-sleep banner button `סיום השינה` opens the sleep sheet (the edit sheet is plan 012); banners, pills and notifications live on the log page only; the quick sleep toggle cannot send `quickRecorded` (the server toggle accepts only `location` and `at`); carousel cards and chips are not tappable until plan 012.
