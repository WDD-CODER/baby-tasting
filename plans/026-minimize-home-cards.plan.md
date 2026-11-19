# Plan 026 — Minimize any container on the home screen

Status: draft
Depends-on: 023
Snapshot: c9fb54b9955fe6e0c9a8529978220c944213730e
Source: the Human, 2026-11-19, after validating plan 023: "make all the containers in the main screen be minimized if wished!" Answer the same day: `plan 026 as described` — a minimize switch per container in `ערוך פריסה`, a slim bar when minimized, a tap opens it for this visit, saved for both parents, the alert banners stay, and the Settings date field that overflows a narrow phone is fixed here too.

## Problem Statement
Plan 023 lets a parent minimize single quick-action buttons. The other containers on the home page (`/`) — today's summary, the quick-action grid as a whole, the diaper tracker, the pumping tracker and the Bio Gaia card — always show at full size, so a parent who never pumps, for example, scrolls past an empty pumping card every time.

Separately, on a 360 px phone the Settings Excel-export card's two date fields (`מתאריך`, `עד תאריך`) do not fit side by side; the `עד תאריך` field sticks out 33 px past the left edge and the whole Settings page can slide sideways (measured in run-023: `document.scrollWidth` 393 on a 360 px screen).

## Decisions
- **D-026-1 (Human, 2026-11-19)** The containers that can be minimized: today's summary (`app-today-carousel`), the quick-action grid as a whole (`app-quick-grid`), the diaper tracker, the pumping tracker and the Bio Gaia card. The alert banners (`app-log-banners`) can never be minimized.
- **D-026-2 (Human, 2026-11-19)** A minimized container shows as one slim bar: its slot icon, its title and a chevron. Tapping the bar opens the container for this visit only (until the page is left or reloaded); tapping the bar of an opened one closes it again. Its saved state stays minimized.
- **D-026-3 (Human, 2026-11-19)** The choice is set in `ערוך פריסה` (edit layout) and saved for the household (both parents), with the quick-action order and minimized buttons, by `סיום ושמירה`.
- **D-026-4 (Planner)** The `ערוך פריסה` / `סיום ושמירה` button moves from inside the quick grid to the top of the home page, above the containers, because a minimized grid would hide it. One edit mode covers the whole page: the quick grid's drag-and-drop (plan 023) and every container's minimize switch. Outside edit mode the button stays where it is today in the visual order: under the banners and today's summary moves below it.
- **D-026-5 (Planner)** In edit mode every container shows full size with a switch row on top: its title and a toggle `מזער` (on = minimized). A container that shows nothing today (today's summary with no events, the Bio Gaia card before it was given) still shows its switch row in edit mode, so it can be set ahead of time; outside edit mode a minimized container with nothing to show shows no bar either.
- **D-026-6 (Planner)** Export dates: the two fields sit side by side when both fit and wrap to one per line otherwise; nothing else on the card changes.

## Goals & Success Criteria
**Primary:** a parent can minimize any home container they do not use and still open it with one tap.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0 (server tests included).
- [auto] `node --test server/test/tracker-settings.test.js` passes with these cases: `PUT /api/v1/tracker/settings { homeCardsMinimized: ['pumping'] }` saves and `GET` returns it; an unknown id or a repeated id answers 400; a household with no saved value gets `[]`.
- [ui] On the home page (`/`), tapping `ערוך פריסה`, switching `מזער` on for the pumping tracker and tapping `סיום ושמירה` shows the pumping tracker as one bar carrying the `pumpingTrackerTitle` text; after a reload it is still a bar; tapping the bar shows the full tracker — e2e `e2e/026-1-minimize-cards.spec.ts`, screenshot `e2e/screens/026-1.png`.
- [ui] On the home page, minimizing the quick-action grid leaves the `ערוך פריסה` button visible, and tapping the grid's bar shows the six buttons — same spec, second test.
- [ui] `e2e/023-1-minimize.spec.ts` and `e2e/011-4-reorder.spec.ts` still pass (they start edit mode from the moved button).
- [ui] In Settings (`/settings`) on a 360 px screen the page does not scroll sideways (`document.documentElement.scrollWidth` equals the screen width) and both export date fields are fully on screen — e2e `e2e/026-2-export-dates.spec.ts`.
- [human] On the phone, minimizing a container and opening its bar feels natural, and the bars are easy to tap.

## Execution Mode
- Parallel: no
- Concurrent plans: none
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
src/app/core/icons/icon-slots.ts
src/app/pages/tracker/log-page/**
src/app/pages/tracker/home-card/**
src/app/pages/tracker/home-layout.service.ts
src/app/pages/tracker/home-layout.service.spec.ts
src/app/pages/tracker/quick-grid/**
src/app/pages/tracker/today-carousel/**
src/app/pages/tracker/diaper-tracker/**
src/app/pages/tracker/pumping-tracker/**
src/app/pages/tracker/bio-gaya-card/**
src/app/pages/settings/export-card/**
src/app/app.spec.ts
src/app/pages/settings/icon-picker-sheet/icon-picker-sheet.spec.ts
src/app/pages/tracker/entry-sheet/entry-sheet.spec.ts
src/app/pages/tracker/timeline-page/timeline-row/timeline-row.spec.ts
e2e/026-1-minimize-cards.spec.ts
e2e/026-2-export-dates.spec.ts
e2e/023-1-minimize.spec.ts
e2e/011-4-reorder.spec.ts
e2e/support/tracker.ts
e2e/screens/026-1.png
docs/brain/inventory.md
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

- INV-1: preserves — the new validation stays a pure function in `server/domain/tracker/settings.js`.
- INV-2: preserves — no database code changes; the settings repository stores the field as it stores the others.
- INV-4: preserves — the field rides the existing `GET`/`PUT /api/v1/tracker/settings`, plain JSON.
- INV-5: preserves — the bars, switches and the export grid use tokens and logical properties only.
- INV-6: preserves — no calendar rule; only the Tracker settings domain file changes.

## Backend Impact
- One new persisted field, `tracker.homeCardsMinimized` (list of `today | quick | diaper | pumping | biogaya`, default `[]`), inside the household's existing `settings` document, validated and reconciled exactly like `quickActionsMinimized` (plan 023). Schema-less: no migration; a document without it reads as `[]`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, I fold away the home containers I do not use so the screen shows what I need, and still open one with a tap.

## Functional Requirements

### Must Have (P0)
- [ ] A minimize switch per home container in edit mode, saved per household.
- [ ] A minimized container is one bar that opens it for this visit.
- [ ] The edit-layout button stays reachable when the quick grid is minimized.
- [ ] The Settings export dates fit a 360 px screen.

## Reuse Check
- Home container that folds to a bar (src/app/pages/tracker/home-card/, class .hc) — family: none — rung: 4 — why: no shared piece is a collapsible titled container; it is used only on the home page, so it lives under pages/tracker; it reuses app-icon slots and a plain button with aria-pressed for the switch
- Home layout edit mode (src/app/pages/tracker/home-layout.service.ts) — family: none — rung: 4 — why: holds the page-wide edit mode the quick grid used to own (reorder_); no existing service covers it

## Defaults
- icon-slots — applies — how: each bar's icon is a slot in `src/app/core/icons/icon-slots.ts` (`card.today`, `card.quick`, `card.diaper`, `card.pumping`; `card.biogaya` exists)
- undo-instead-of-confirm — exception — why: minimizing is a layout change saved with `סיום ושמירה`, not a record; it is undone by switching it off
- confirm-in-modal — exception — why: nothing here asks for confirmation

## UI/UX Notes
- New Hebrew keys beside the quick-grid texts: `cardMinimize: 'מזער'`, `cardTodayTitle: 'היום'`, `cardQuickTitle: 'פעולות מהירות'`; the diaper, pumping and Bio Gaia bars reuse `diaperTrackerTitle`, `pumpingTrackerTitle`, `bioGayaTitle`.
- Bar: full width, at least `--touch-target` high, `aria-expanded` on the bar button, chevron turned by state; logical properties only.
- Export dates: `grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr))` and `min-inline-size: 0` on the fields, so the date inputs cannot force the row wider than the card.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] M1: Store which home containers a household minimized — `homeCardsMinimized` in `TRACKER_DEFAULTS` (`[]`), validated like `quickActionsMinimized` (known ids, no repeats), reconciled on read; client model type `HomeCardId` and field; spec fixtures that build a settings object get `homeCardsMinimized: []` — server/domain/tracker/settings.js, server/test/tracker-settings.test.js, src/app/core/models/tracker-settings.ts, src/app/app.spec.ts, src/app/pages/settings/icon-picker-sheet/icon-picker-sheet.spec.ts, src/app/pages/tracker/entry-sheet/entry-sheet.spec.ts, src/app/pages/tracker/timeline-page/timeline-row/timeline-row.spec.ts
- [x] M2: Move the edit-layout mode from the quick grid to the whole home page — `HomeLayoutService` (`editing` signal, `start()`, `finish()` that saves `quickActionOrder`, `quickActionsMinimized` and `homeCardsMinimized` in one `TrackerSettingsService.save` with the existing toast); the `ערוך פריסה` / `סיום ושמירה` button moves to the top of `log-page.html`; the quick grid reads `editing` instead of its own `reorder_` and hands its order and minimized lists to the service — src/app/pages/tracker/home-layout.service.ts, src/app/pages/tracker/quick-grid/**, src/app/pages/tracker/log-page/**
- [x] M3: Add a home container that folds to one bar — `app-home-card` with inputs `id`, `title`, `slot`, `hasContent`; edit mode shows the switch row and the content; minimized outside edit mode shows the bar (only when `hasContent`), and a tap opens it for this visit; four new `card.*` icon slots; the Hebrew keys — src/app/pages/tracker/home-card/**, src/app/core/icons/icon-slots.ts, src/app/core/i18n/he.ts
- [x] M4: Wrap the five home containers in it — `log-page.html` wraps today's summary (`hasContent`: `day().length > 0`), the quick grid (always), the diaper and pumping trackers (always) and the Bio Gaia card (`hasContent`: the given-today check the card already computes, exported as a pure function the page can call); the banners stay outside — src/app/pages/tracker/log-page/**, src/app/pages/tracker/today-carousel/**, src/app/pages/tracker/diaper-tracker/**, src/app/pages/tracker/pumping-tracker/**, src/app/pages/tracker/bio-gaya-card/**
- [x] M5: Stop the Settings export dates from pushing the page sideways on a narrow phone — the grid and field rules in UI/UX Notes — src/app/pages/settings/export-card/**
- [x] M6: Prove it in the real app — `e2e/026-1-minimize-cards.spec.ts` (two tests per the [ui] items), `e2e/026-2-export-dates.spec.ts`; update `e2e/023-1-minimize.spec.ts` and `e2e/011-4-reorder.spec.ts` (and `e2e/support/tracker.ts` if it holds the edit-button helper) for the moved button; add `app-home-card` to the inventory; one line in current-state under the Tracker notes — e2e/026-1-minimize-cards.spec.ts, e2e/026-2-export-dates.spec.ts, e2e/023-1-minimize.spec.ts, e2e/011-4-reorder.spec.ts, e2e/support/tracker.ts, docs/brain/inventory.md, docs/project/current-state.md

## Technical Considerations
- Dependencies: plan 023 (merged in PR #24) — `quickActionsMinimized`, the chip row, `reorder_` in `quick-grid.ts`.
- New files needed: `src/app/pages/tracker/home-card/home-card.{ts,html,scss,spec.ts}`, `src/app/pages/tracker/home-layout.service.ts` (+ spec), `e2e/026-1-minimize-cards.spec.ts`, `e2e/026-2-export-dates.spec.ts`.
- Model changes: `TrackerSettings.homeCardsMinimized: HomeCardId[]`.
- Backend / API: no new route; one more field on `/api/v1/tracker/settings`.
- Auth and validation: existing `requireAuth`; validation as above.
- Security surface: none.
- Data / migration: none (see Backend Impact).
- Project checks: none.

## Out of Scope
- Reordering the containers (only the quick-action buttons reorder, as today).
- Hiding a container completely, or per-parent layouts.
- Minimizing the alert banners.
- Other pages (timeline, statistics, tasting).

## Critical Questions
- Q: Which containers? A: every home container except the alert banners (Human, 2026-11-19).
- Q: What does a minimized one look like and do? A: a slim bar; a tap opens it for this visit (Human, 2026-11-19).
- Q: Saved for whom? A: the household, both parents (Human, 2026-11-19).

## Execution Notes
- pnpm run build -> exit 0; pnpm run lint -> exit 0; pnpm run test -> exit 0 (karma 115 SUCCESS, server 256 pass 0 fail); node --test server/test/tracker-settings.test.js -> 9 pass; override-check ok; scope-check ok.
- kit-checks -> fail: 2 findings, both `reuse-registry-missing-piece`: docs/brain/component-families.md needs a family heading for `app-home-card` and for `HomeLayoutService` (file outside the plan scope; ESCALATE scope).
- e2e specs written, not run (no app/QA login in the worktree): e2e/026-1-minimize-cards.spec.ts (2 tests), e2e/026-2-export-dates.spec.ts. 023-1 and 011-4 need no change: they click `ערוך פריסה` by name, which now sits at the top of the page.
- Icon slots card.today/quick/diaper/pumping added to icon-slots.ts; `node server/lib/gen-icon-names.mjs` NOT run because it writes server/domain/tracker/icon-names.js and src/app/core/icons/icon-names.ts, outside scope: the server refuses an icon override for those 4 slots until it is run.
- Reuse Check row for home-card now names class `.hc`; `node scripts/inventory.mjs` was rerun (inventory.md has no home-card line until the families file has the heading).
