# Plan 006 — Week suggestions: which queued food and allergen on which day

Status: draft
Depends-on: 005
Snapshot: ebf1b1f24e30f84c61981a4b78904df83e192c8f
Source: docs/briefs/brief-6-suggestions.md (product rules: docs/briefs/00-program.md section 5 "Suggestions", R1–R7)

## Problem Statement
Planning a week by hand is the parents' biggest chore. With one tap the app should propose which foods to give on which
days — only from foods the parents queued and from allergens in progress — and the parents accept, change or ignore it.

## Goals & Success Criteria
**Primary:** `הצע לי שבוע` shows a deterministic proposal for the visible week as dashed items; parents accept one,
dismiss one, accept all or dismiss all, and accepted items become normal planned items.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0.
- [auto] `node --test server/domain/suggestions.test.js` exits 0, covering: an allergen at 1/3 given today gets tomorrow and the day after in meal 1; two maintenance allergens with target 2 get two days each and never share a day with the introduction unless the week has no other free day; an existing planned item of an allergen reduces what is suggested for it; a locked food and an archived food are never suggested; a queue of 6 regular foods yields at most `newFoodsPerWeek` (3) new foods, one per day, in meal 2; nothing is suggested for days before today; no more than `maxAllergensPerMeal` allergens in one meal 1 unless the weekly target cannot be met otherwise; the next `not_started` allergen starts only when none is introducing and only from a queued allergen food, on three consecutive free days; the same input twice gives deep-equal output.
- [auto] `node --test server/test/suggestions.test.js server/test/queue.test.js server/test/settings.test.js` exits 0, covering: preview saves nothing (calendar count unchanged); accept saves exactly the chosen items as `planned` and refuses an allergen food outside meal 1; queue add, remove and reorder persist per household; settings accept `maxAllergensPerMeal` 1–5 and `newFoodsPerWeek` 0–7 and refuse values outside.
- [ui] With `שומשום` at 1/3 (given today) and `אגס` queued, `הצע לי שבוע` on `/` shows dashed `טחינה` tiles on the next two days in meal 1 and a dashed `אגס` in meal 2; `אשר הכול` turns them into regular planned tiles.
- [ui] Dismissing one dashed suggestion removes only that one.
- [human] The proposed week looks like something the parents would plan themselves.

## Execution Mode
- Parallel: no
- Concurrent plans: none (runs after 005; plan 007 runs after this one)
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
src/app/core/**
src/app/shared/**
src/app/pages/calendar/**
src/app/pages/foods/**
e2e/**
DESIGN.md
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

- INV-1: preserves — `server/domain/suggestions.js` is a pure function of the engine output, queue, week items, settings, locked ids and today.
- INV-2: preserves — the queue is stored on foods through `server/repositories/foods-repository.js`; accept creates items through the calendar repository.
- INV-3: preserves — new routes sit behind the existing auth middleware.
- INV-4: preserves — `/api/v1/suggestions/*`, `/api/v1/foods/queue*`, plain JSON, dates `YYYY-MM-DD`.
- INV-5: preserves — suggested tiles use the dashed outline defined in DESIGN.md.
- INV-6: preserves — every allergen suggestion is in meal 1, and accept runs the same `checkPlacement` as the calendar.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, I queue the foods I want to try next and order them.
- As a parent, I tap `הצע לי שבוע` and get a sensible week I can accept in one tap.
- As a parent, I dismiss the one suggestion that does not fit and accept the rest.

## Functional Requirements

### Must Have (P0)
- [ ] Tasting queue on foods (add, remove, reorder).
- [ ] Pure suggestion function with rules 1–5 of the brief and the two new settings.
- [ ] `POST /api/v1/suggestions/preview` and `/accept`.
- [ ] `הצע לי שבוע` in the week view; dashed items with reason; accept one, dismiss one, `אשר הכול`, `בטל הכול`.

## UI/UX Notes
- Foods page: each row gets a queue toggle (icon button ➕ / ✓ with aria-label `בתור לטעימה`); a section `התור לטעימה` at the top lists queued foods in order with CDK drag handles to reorder and a remove action; empty queue → hidden section.
- Week view header: secondary button `הצע לי שבוע`. While suggestions are shown, a bar under the header: `{n} הצעות` · `אשר הכול` (primary) · `בטל הכול` (ghost).
- Suggested tile: dashed accent outline, 70% opacity; tap → small sheet with the reason and `אישור` / `הסרה`. Suggested tiles cannot be dragged; accepted ones can.
- Reason texts (`HE.suggestions.reason.*`): intro `חשיפה: {allergen} יום {n} מתוך {total}`, maintenance `תחזוקה: {allergen} {x} מתוך {y} השבוע`, start `התחלה: {allergen} יום {n} מתוך {total}`, new food `מזון חדש מהתור`.
- Nothing to suggest → toast `אין הצעות לשבוע הזה`.

## Atomic Sub-tasks

- [ ] F1: Add the two suggestion settings to the rule module — `maxAllergensPerMeal` (default 2, range 1–5) and `newFoodsPerWeek` (default 3, range 0–7) in `server/domain/settings.js` and its test; the settings route accepts them — server/domain/settings.js, server/domain/settings.test.js, server/routes/settings.js, server/test/settings.test.js
- [ ] F2: Propose a week as a pure, deterministic function — `server/domain/suggestions.js` `suggestWeek({ engine, foods, allergens, queue, weekItems, settings, weekStart, today, lockedFoodIds = [], lockedAllergenIds = [] })` → `[{ date, meal, foodId, reason: { kind: 'intro'|'maintenance'|'start'|'new_food', allergenId?, n?, total?, x?, y? } }]`, sorted by date, meal, foodId. Rules: (1) the `introducing` allergen — remaining = `required − daysGiven − planned days of it in the window`, on consecutive days starting today (tomorrow when it is already given or planned today) up to the week's end, meal 1, food = its most recently given active, unlocked food; (2) each `maintenance` allergen — `maintenancePerWeek − (given + planned days this week)` more days, meal 1, from days ≥ today spread evenly (pick candidate indices `floor((i + 0.5) × count / need)`), preferring days without an introduction item and with fewer than `maxAllergensPerMeal` allergens in meal 1, relaxing first the introduction preference and then the cap only when the target cannot be met; (3) when no allergen is `introducing` (after rule 1) and the queue holds a food of a `not_started` allergen — the first such food in queue order, three consecutive days from the first day ≥ today whose meal 1 has no allergen item, within the week; (4) queued regular foods never tried, in queue order, at most `newFoodsPerWeek` minus new regular foods already planned this week, one per day on days without one, meal 2; (5) never a day before today, never a locked or archived food (or a food of a locked allergen), never a food already on that day; existing items are never moved or replaced — server/domain/suggestions.js, server/domain/suggestions.test.js
- [ ] F3: Store the tasting queue on the foods — `queuePosition: number | null` on food documents; `server/repositories/foods-repository.js` `setQueued(householdId, foodId, queued, user)` (appends at the end), `reorderQueue(householdId, foodIds, user)`, `listQueue`; routes in `server/routes/foods.js`: `POST /api/v1/foods/:id/queue` `{ queued }`, `PUT /api/v1/foods/queue` `{ foodIds }`; list includes `queuePosition`; tests `server/test/queue.test.js` — server/repositories/foods-repository.js, server/routes/foods.js, server/test/queue.test.js
- [ ] F4: Preview and accept suggestions — `server/routes/suggestions.js`: `POST /api/v1/suggestions/preview` `{ weekStart }` (a Sunday, `YYYY-MM-DD`) → `{ suggestions }` without writing; `POST /api/v1/suggestions/accept` `{ items: [{ date, meal, foodId }] }` → creates each as `planned` through the same validation as calendar create (shared helper extracted from `server/routes/calendar.js` into `server/lib/calendar-create.js`), returns `{ created, rejected: [{ item, code }] }`; locks are read from `server/lib/locks.js` `getLockedIds(repos, householdId)` which returns empty lists here (plan 007 fills it); tests `server/test/suggestions.test.js` — server/routes/suggestions.js, server/lib/**, server/routes/calendar.js, server/app.js, server/test/suggestions.test.js
- [ ] F5: Let parents queue and order foods — queue toggle and `התור לטעימה` section on the foods page per UI notes; `CatalogService` gains `queue` computed, `toggleQueue`, `reorderQueue` — src/app/pages/foods/**, src/app/core/services/catalog.service.ts
- [ ] F6: Show suggestions in the week view — `src/app/core/services/suggestions.service.ts` (`preview(weekStart)`, `accept(items)`), set `CalendarExtensionsService.suggested`; dashed tiles, reason sheet, bar with `אשר הכול` / `בטל הכול` per UI notes; accepting reloads the calendar and the status — src/app/pages/calendar/**, src/app/core/**
- [ ] F7: Dictionary and design notes — `HE.suggestions.*`; DESIGN.md suggested-tile rule and `## Open design decisions` lines — src/app/core/i18n/he.ts, DESIGN.md
- [ ] F8: Write the UI checks — `e2e/006-1-suggest-accept.spec.ts`, `e2e/006-2-dismiss-one.spec.ts`, screenshots `e2e/screens/006-<n>.png` — e2e/**
- [ ] F9: Note what now exists — `docs/project/current-state.md` — docs/project/current-state.md

## Technical Considerations
- Dependencies: none new.
- New files needed: listed per sub-task.
- Model changes: `queuePosition` on `Food`; `Suggestion` model; two settings.
- Backend / API: 2 suggestion routes, 2 queue routes; `GET /api/v1/foods` returns `queuePosition`.
- Auth and validation: session required; `weekStart` must be a Sunday; accept items validated like calendar create.
- Security surface: none new.
- Data / migration: new optional field `queuePosition` on foods (absent = not queued); no migration.

## Backend Impact
- Collections affected: `foods` (new field), `calendarItems` (accept creates planned items), `settings` (two values)
- New collections: no
- Server changes needed: yes — suggestion function, routes, queue.

## Out of Scope
Recipes, portions, nutrition balance, automatic acceptance, more than one week at a time, the settings UI (plan 008).

## Critical Questions
- none

## Execution Notes
- Planner decision (overnight pre-approval): "the next two days" for an allergen at 1/3 means the next two days without it, starting today unless it is already given or planned today. Reverse: always start tomorrow.
- Planner decision: suggestions are not stored; dismissing one only hides it in this preview (a new preview shows it again).
