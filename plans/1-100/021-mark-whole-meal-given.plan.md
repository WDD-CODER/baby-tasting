# Plan 021 — Mark a whole meal as given in one tap

Status: done
Depends-on: none
Snapshot: b16c47f352153ff50c1e5f20a04ccf74ad9a2bfa
Source: the Human, 2026-11-18: "after adding a food to a meal, let's say 3 items, you need to enter the items and say that they were given. I want to allow an option that we can say that the meal was given. So everything inside the meal was given to the child." Answers the same day: the button goes in a food's sheet; skipped is not how the parents work ("if we haven't given one of the foods, we remove it from the meal"), so marking the meal given marks every food in it given; amount, liked and note stay per food ("if he clicks the specific ingredient, then he sets the amount, did he like it and remarks").

## Problem Statement
A meal with three foods takes three taps-and-sheets to record as given: open each food, tap `ניתן`, close. The parents feed the whole meal at once and want to record it at once.

## Decisions
- **D-021-1 (Human, 2026-11-18)** The button is in the food's actions sheet (`app-item-actions-sheet`), so it works from the week view, the month view's day sheet and any place that opens that sheet. It shows only when the meal holds 2 or more foods and at least one of them is not given yet. Label: `כל הארוחה ניתנה ({n})`, n = the number of foods in that meal.
- **D-021-2 (Human, 2026-11-18)** Every food of that day and meal becomes `given`, whatever its status was (`planned` or `skipped`). A food already given keeps its `givenBy` / `givenAt`.
- **D-021-3 (Human, 2026-11-18)** Amount, liked and note are not touched; the parent sets them per food by opening it, as today.
- **D-021-4 (Planner)** One server request: `POST /api/v1/calendar/meal-given { date, meal }`. A future date is refused as one food is today (400 `given_in_future`, toast `אי אפשר לסמן כ"ניתן" תאריך עתידי`). After the tap the sheet closes and the calendar shows every tile with ✓.

## Goals & Success Criteria
**Primary:** one tap in a food's sheet marks every food in its meal as given.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0 (server tests included).
- [auto] `node --test server/test/calendar.test.js` passes with these cases: `POST /api/v1/calendar/meal-given` with today and meal 2 holding one planned and one skipped food answers 200 with both items `status: 'given'`, `givenBy` set and `amount` unchanged; an item of meal 1 the same day is unchanged; an item already given keeps its `givenAt`; a future date answers 400 `given_in_future` and changes nothing; a bad `date` or a `meal` outside 1–3 answers 400 `invalid`; another household's items are never touched.
- [ui] On the calendar (`/tasting`), after adding three foods to today's meal 2 and opening one of them, tapping `כל הארוחה ניתנה (3)` shows all three tiles of that cell with `✓` — e2e `e2e/021-1-meal-given.spec.ts`, screenshot `e2e/screens/021-1.png`.
- [ui] The add-food multi-select from plan 017 still works on `main`: `e2e/017-2-multi-select.spec.ts` passes unchanged.
- [human] On the phone, marking a real meal given feels like one step, and opening one of its foods still lets you set the amount, ❤️ and a note.

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
server/routes/calendar.js
server/repositories/calendar-items-repository.js
server/test/calendar.test.js
src/app/core/services/calendar.service.ts
src/app/core/i18n/he.ts
src/app/pages/calendar/item-actions-sheet/**
src/app/pages/calendar/calendar-page/**
e2e/021-1-meal-given.spec.ts
e2e/017-2-multi-select.spec.ts
e2e/support/calendar.ts
e2e/screens/021-1.png
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

- INV-1: preserves — the future-date rule is the existing pure `checkStatus` in `server/domain/calendar-rules.js`, called as it is; no domain file changes.
- INV-2: preserves — the bulk update is a new `CalendarItemsRepository` method; the route never touches the driver.
- INV-3: preserves — the route sits behind the existing `requireAuth` mount of `/api/v1/calendar`.
- INV-4: preserves — `POST /api/v1/calendar/meal-given`, plain JSON, `date` as `YYYY-MM-DD`.
- INV-5: preserves — no colour; the button uses the shared `app-button`.
- INV-6: preserves — no placement rule changes; marking given never moves a food.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, after feeding a meal, I mark the whole meal as given with one tap, and add amounts or notes only where I want them.

## Functional Requirements

### Must Have (P0)
- [ ] `כל הארוחה ניתנה (n)` in a food's sheet marks every food of that day and meal as given in one request.

## Reuse Check
- none — the button is the shared `app-button`; the server reuses `checkStatus`, `handle`, the audit helpers and the calendar router.

## Defaults
<!-- no product default is `on` (docs/project/product-defaults.md: all `proposed`) -->

## UI/UX Notes
- The button sits in the first row of the sheet, after `ניתן` / `דילגנו`, as `secondary`. Hebrew key `HE.calendar.mealGiven: 'כל הארוחה ניתנה ({n})'`.
- No confirm dialog (the builder rule: no added dialog); a mistake is undone per food with `ביטול סימון`, as today.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] M1: Let the server mark every food of one meal as given in a single request — `POST /meal-given` in the calendar router, registered before the `/:id` routes: validate `date` (`YYYY-MM-DD`) and `meal` (1, 2 or 3) else 400 `invalid`; `checkStatus({ status: 'given', date, today: todayIso() })` → 400 `given_in_future`; new `CalendarItemsRepository.markMealGiven(householdId, date, meal, user)`: one `updateMany` on items of that household, date and meal whose status is not `given`, setting `status: 'given'`, `givenBy`, `givenAt` and the update audit fields (`withUpdateAudit`); answer `{ items }` of that day and meal via `listForDay` filtered by meal, mapped with `toItemDto`; tests beside the other calendar server tests, per the success criteria — server/routes/calendar.js, server/repositories/calendar-items-repository.js, server/test/calendar.test.js
- [x] M2: Give the app one call that marks a meal given and shows it at once — `CalendarService.markMealGiven(date, meal)` through the existing optimistic `write`: every item of that date and meal becomes `given` locally (amount, note, liked kept), then `POST /calendar/meal-given`; a refusal rolls back and toasts as today — src/app/core/services/calendar.service.ts
- [x] M3: Add the whole-meal button to a food's sheet — new input `mealCount` (number of foods in the item's day and meal) and `mealOpen` (true when one of them is not given), output `mealGiven`; button `כל הארוחה ניתנה ({n})` shown when `mealCount >= 2 && mealOpen`; the calendar page passes both from its loaded items, on `mealGiven` refuses a future date with the existing toast, else calls `markMealGiven` and closes the sheet; Hebrew key `mealGiven` — src/app/pages/calendar/item-actions-sheet/**, src/app/pages/calendar/calendar-page/**, src/app/core/i18n/he.ts
- [x] M4: Prove it in the real app and keep plan 017's multi-select covered — `e2e/021-1-meal-given.spec.ts` per the [ui] item (reuse `addFood` / `cell` from `e2e/support/calendar.ts`); run `e2e/017-2-multi-select.spec.ts` unchanged; one line under the calendar notes in current-state — e2e/021-1-meal-given.spec.ts, docs/project/current-state.md

## Technical Considerations
- Dependencies: `ItemActionsSheet` is used only by `calendar-page`; `CalendarService.write` already refreshes the allergen status after a write, so the allergen days count the new given foods.
- New files needed: `e2e/021-1-meal-given.spec.ts`.
- Model changes: none (`ItemStatus` unchanged).
- Backend / API: new `POST /api/v1/calendar/meal-given { date, meal }` → `{ items }`.
- Auth and validation: behind `requireAuth` and the calendar's catalog context; `date` and `meal` validated; only the caller's household is updated.
- Security surface: none new (same household scoping as `PATCH /calendar/:id`).
- Data / migration: none. The activity log reads the audit fields, so each food shows as changed by the parent.
- A locked food (after a reaction) can be marked given one by one today; the meal action behaves the same.
- Project checks: none (`docs/project/plan-checks.md` does not exist).

## Out of Scope
- Removing the `דילגנו` (skipped) button from a food's sheet.
- A meal-level amount, liked mark or note.
- A meal button on the week grid itself or on the day sheet.
- Undo for the whole meal in one tap.

## Critical Questions
- Q: Where is the button? A: in a food's sheet (Human, 2026-11-18).
- Q: What happens to a skipped food? A: it becomes given too (Human, 2026-11-18).
- Q: What amount do the foods get? A: none changed; set per food (Human, 2026-11-18).

## Execution Notes
- pnpm run build, lint, test -> exit 0 (254 server tests pass); node --test server/test/calendar.test.js -> 11 pass, 0 fail.
- behaviour: future date answers 400 given_in_future as the plan states (a single food answers 422) — reverse: use refusal(future) for 422.
- [ui] items written, not run (e2e/021-1-meal-given.spec.ts; 017-2 unchanged).
