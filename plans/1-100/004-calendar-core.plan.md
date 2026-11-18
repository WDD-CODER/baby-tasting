# Plan 004 — Calendar core: the home screen where parents plan and record every meal

Status: done
Depends-on: 003
Snapshot: ebf1b1f24e30f84c61981a4b78904df83e192c8f
Source: docs/briefs/brief-4-calendar-core.md (product rules: docs/briefs/00-program.md section 3 "Calendar item", section 5, R4, R5, R8, R9, section 8)

## Problem Statement
The calendar is the product: parents must see, for every day, what to give in each of three meals, and manage
everything by touching it — add, remove, drag between meals and days, mark given or skipped — for past and future dates.

## Goals & Success Criteria
**Primary:** the `יומן` page shows the week (default) or month, and every action of the brief works from it, with
allergen foods kept in meal 1.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0, including `src/app/pages/calendar/week-view/week-view.spec.ts` (the first rendered day column is Sunday and the host is inside `dir="rtl"`) and `src/app/pages/calendar/month-view/month-view.spec.ts` (a day with 6 items shows 4 emoji and `+2`, allergen items first).
- [auto] `node --test server/domain/calendar-rules.test.js server/test/calendar.test.js` exits 0, covering: listing a date range; create, move and delete; an allergen food in meal 2 refused on create and on move with 422 `allergen_meal_1`; the same food twice in one meal refused with 409 `duplicate_in_meal`; `given` on a future date refused with 422 `given_in_future`; past dates editable; the derived food status on `GET /api/v1/foods` counts only `given` items (`timesGiven`, `firstDate`, `liked`).
- [ui] On `/`, adding `בננה` to meal 2 of today and marking it `ניתן` with amount `טעימה` shows the item filled with ✓; then `/foods` shows `בננה` with `נוסה · 1`.
- [ui] On `/`, dragging an item from meal 2 of today to meal 3 of tomorrow keeps it there after a page reload.
- [ui] On `/`, dragging `טחינה` from meal 1 to meal 2 returns it to meal 1 and shows `אלרגן ניתן בארוחה הראשונה`.
- [ui] On `/`, adding `דבש` while the baby is under 12 months shows `אסור לפני גיל שנה` before the item is added.
- [ui] On `/` in month view, adding an item on a date last month and marking it `ניתן` shows its emoji on that day after reload.
- [human] Dragging on a real phone feels reliable; the week is readable at a glance; allergens stand out.

## Execution Mode
- Parallel: no
- Concurrent plans: none (runs after 003)
- Isolated DB: no
- Reviewer: gate

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
package.json
pnpm-lock.yaml
server/app.js
server/domain/**
server/routes/**
server/repositories/**
server/lib/**
server/test/**
src/app/app.routes.ts
src/app/core/**
src/app/shared/**
src/app/dev/**
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

- INV-1: preserves — the placement and status rules and the derived food status are pure functions in `server/domain/calendar-rules.js` that receive "today" as an argument.
- INV-2: preserves — calendar items are read and written only through `server/repositories/calendar-items-repository.js`.
- INV-3: preserves — the calendar router sits behind the existing auth middleware.
- INV-4: preserves — `/api/v1/calendar`, plain JSON, dates `YYYY-MM-DD`, no time of day for a meal.
- INV-5: preserves — item visuals use the DESIGN.md tokens (accent ring, badge, item states).
- INV-6: preserves — this plan implements R4: the server refuses an allergen food outside meal 1 on create and on move, and the calendar mirrors the refusal on drop.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, I open the app and see this week's three meals per day at a glance.
- As a parent, I tap a meal, pick a food, and later mark it given with how much was eaten.
- As a parent, I drag tomorrow's pear to Thursday when plans change.
- As a parent, I enter last month's tastings on their real dates.

## Functional Requirements

### Must Have (P0)
- [ ] Calendar API: range list, create, update (status, amount, note, liked), atomic move, delete; R4 on the server; duplicate food in a meal refused; `given` in the future refused.
- [ ] Derived food status (R9) on the foods list and the foods page.
- [ ] Week view (default), month view, day sheet, add-food sheet, item actions, drag and drop with touch, R8 warning notice, optimistic updates with rollback, refresh on focus.
- [ ] Named extension points for alerts, per-item badges and suggested items.

## UI/UX Notes
- Header: title of the visible range (`15–21 בנובמבר 2026` / `נובמבר 2026`), `‹` previous and `›` next (RTL: previous is on the right), `היום`, and a two-chip switch `שבוע` / `חודש`. Swiping the header area left/right changes week or month.
- Week view: 7 columns, Sunday on the right (natural order inside `dir="rtl"`), column header `א׳ 15` style (day letter + date), today's column with an accent background tint; 3 rows labelled `ארוחה 1`, `ארוחה 2`, `ארוחה 3` at the inline-start. Each cell lists its items as emoji tiles (32px, touch area 44px) and a faint `+` tile to add. At 360px the grid may scroll horizontally inside itself (minimum column width 56px); the page does not.
- Item tile states (DESIGN.md): planned = outline, given = filled surface + small ✓, skipped = 50% opacity + strike line, allergen = accent ring + badge slot (this plan shows a neutral badge dot; plan 005 fills state colours).
- Month view: 6×7 grid starting Sunday, each day shows up to 4 emoji (allergen items first, then by meal) and `+N`; tap opens the day sheet.
- Day sheet (`app-bottom-sheet`): date title, three meal sections each listing items (emoji, name, status, amount) with `הוספת מזון`.
- Add-food sheet: search field `חיפוש מזון`, `אחרונים` (the 8 most recently given foods) then all active foods alphabetically, archived foods hidden; `מזון חדש` → `/foods/new?returnTo=/`. Opening it for meal 2 or 3 still lists allergen foods but choosing one shows the R4 message and does not add.
- Item actions sheet (tap a tile): `ניתן` (one tap marks given; then optional amount chips `טעימה` / `כפית` / `מנה`, note field, `אהב/ה` toggle — each saved on change), `דילגנו`, `ביטול סימון` (back to planned, shown when given or skipped), `העברה לתאריך` (date input + meal select), `הסרה` (confirm `להסיר את {food} מהיומן?`).
- Drag and drop (`@angular/cdk/drag-drop`): every cell is a `cdkDropList` in one `cdkDropListGroup`; `cdkDragStartDelay` 250 ms on touch so scrolling still works; a drop that R4 refuses returns the tile and shows the toast `אלרגן ניתן בארוחה הראשונה`; a drop into a cell that already has the same food shows `המזון כבר נמצא בארוחה הזו`.
- R8: adding a food with a warning while the baby's age in months is under `untilMonths` (or `untilMonths` empty) opens a confirm dialog with the warning text, `להוסיף בכל זאת` / `ביטול`.
- Messages: `אי אפשר לסמן כ"ניתן" תאריך עתידי` for a future `ניתן`; failure of any write → rollback + toast `השינוי לא נשמר. נסו שוב.`

## Atomic Sub-tasks

- [x] D1: Write the calendar rules as pure functions — `server/domain/calendar-rules.js`: `checkPlacement({ food, meal })` → `null | 'allergen_meal_1'` (a food with `allergenId` only in meal 1), `checkDuplicate({ items, date, meal, foodId, excludeId })` → `null | 'duplicate_in_meal'`, `checkStatus({ status, date, today })` → `null | 'given_in_future'`, `deriveFoodStatus(items)` → map `foodId → { tried, firstDate, timesGiven, liked }` from `given` items only (`liked` = the latest given item's non-null mark); `isoAddDays`, `weekStartSunday(date)` in `server/domain/dates.js` (pure string math on `YYYY-MM-DD`); tests `server/domain/calendar-rules.test.js` (fixed dates only, so `server/test/domain-purity.test.js` still passes) — server/domain/**
- [x] D2: Store calendar items through the repository — extend `server/repositories/calendar-items-repository.js`: documents `{ householdId, babyId, date, meal, foodId, status: 'planned'|'given'|'skipped', amount: 'taste'|'teaspoon'|'portion'|null, note, liked: true|false|null, createdBy, givenBy, givenAt, audit fields }`; `listRange(householdId, from, to)`, `listForDay`, `listByFood`, `listGiven(householdId)`, `create`, `update`, `move` (one `findOneAndUpdate` on the item), `remove`; indexes `{ householdId, date }`, `{ householdId, foodId }` — server/repositories/calendar-items-repository.js, server/repositories/indexes.js
- [x] D3: Offer the calendar API with R4 enforced on the server — `server/routes/calendar.js`: `GET /api/v1/calendar?from=&to=` (both required, ≤ 62 days), `POST` `{ date, meal, foodId, status? }`, `PATCH /:id` `{ status?, amount?, note?, liked? }` (`given` sets `givenBy` = `req.user.username` and `givenAt`; back to `planned` clears amount, `givenBy`), `POST /:id/move` `{ date, meal }`, `DELETE /:id`; every rule from D1 with today from `server/lib/dates.js`; codes 400 `invalid`, 404 `not_found`, 409 `duplicate_in_meal`, 422 `allergen_meal_1` / `given_in_future`; archived foods can still be listed, not added; tests `server/test/calendar.test.js` — server/routes/calendar.js, server/app.js, server/test/calendar.test.js
- [x] D4: Show which foods were tried on the foods list — `GET /api/v1/foods` adds `status` per food from `deriveFoodStatus`; the foods page shows `לא נוסה` or `נוסה · {timesGiven}` (with ❤️ when liked) — server/routes/foods.js, src/app/pages/foods/**, src/app/core/models/food.ts
- [x] D5: Keep calendar state in one service with optimistic writes and refresh — `src/app/core/services/calendar.service.ts` (`items` signal for the loaded range, `loadRange(from, to)`, `add`, `update`, `move`, `remove` — each applies the change first, rolls back and toasts on failure, then reloads the range; reload on `window` focus and `visibilitychange`), `src/app/core/models/calendar-item.ts`, `src/app/core/utils/dates.ts` (Asia/Jerusalem today via `Intl.DateTimeFormat`, `addDays`, `weekStart`, `monthGrid`, Hebrew labels), specs — src/app/core/**
- [x] D6: Leave named places for alerts, badges and suggestions — `src/app/pages/calendar/calendar-extensions.service.ts`: `alerts = signal<AlertStripItem[]>([])` rendered by `app-alert-strip` above the calendar, `badgeFor = signal<(item) => ItemBadge | null>(() => null)`, `suggested = signal<SuggestedItem[]>([])` rendered as dashed tiles with accept/dismiss outputs; plans 005–007 only set these — src/app/pages/calendar/calendar-extensions.service.ts
- [x] D7: Build the calendar page with week and month views — `src/app/pages/calendar/calendar-page/`, `week-view/`, `month-view/`, `item-tile/` (shared tile used by both views and the day sheet; inputs `item`, `food`, `badge`), with the two component specs named in Done-when; route `''` now loads the calendar page instead of the empty state — src/app/pages/calendar/**, src/app/app.routes.ts
- [x] D8: Add, act on and move items from sheets — `src/app/pages/calendar/day-sheet/`, `add-food-sheet/`, `item-actions-sheet/` per UI notes; R8 notice through `ConfirmDialogService`; age from `baby.service.ts` + `core/utils/age.ts` — src/app/pages/calendar/**
- [x] D9: Drag items between meals and days, with touch — add `@angular/cdk` if plan 001 did not; CDK drag-drop in the week view and in the day sheet's meal lists; R4 and duplicate refusals mirrored before calling the server (the server stays the judge) — src/app/pages/calendar/**, package.json, pnpm-lock.yaml
- [x] D10: Write every string into the dictionary and the item-state rules into DESIGN.md — `HE.calendar.*`; DESIGN.md gets the tile sizes and states used here, and one `## Open design decisions` line per new choice — src/app/core/i18n/he.ts, DESIGN.md
- [x] D11: Write the UI checks — `e2e/004-1-given.spec.ts` … `e2e/004-5-past-month.spec.ts` (sign in, reset, baby aged 8 months via `e2e/support/session.ts`), screenshots `e2e/screens/004-<n>.png` — e2e/**
- [x] D12: Note what now exists — `docs/project/current-state.md` — docs/project/current-state.md

## Technical Considerations
- Dependencies: `@angular/cdk` (drag-drop), already approved in plan 001.
- New files needed: listed per sub-task.
- Model changes: `CalendarItem`, `FoodStatus`; collection `calendarItems`.
- Backend / API: `/api/v1/calendar` (5 routes); `GET /api/v1/foods` gains `status`.
- Auth and validation: session required; `date` real `YYYY-MM-DD`, `meal` 1–3, `foodId` an active food of the household, `amount` enum, `note` ≤ 200, `liked` boolean or null.
- Security surface: the note is free text, rendered with interpolation only.
- Data / migration: new collection `calendarItems` with two indexes.

## Backend Impact
- Collections affected: `foods` (read for rules), `calendarItems` (created)
- New collections: yes — `calendarItems`: one food on one date in one meal; a `given` item is the tasting record (program section 3)
- Server changes needed: yes — calendar router, rules, repository.

## Out of Scope
Allergen states and colours, alerts, locks, suggestions, reactions (plans 005–007); the food detail page (plan 008).

## Critical Questions
- none

## Execution Notes
- Planner decision (overnight pre-approval): the food-level `liked` mark is the latest given item's mark; parents set it per tasting in the item actions sheet.
- Planner decision: swipe changes week only on the header area, so it never fights with drag and drop in the grid.
- Planner decision (review fix): this plan may modify the existing `src/app/app.routes.ts` entries named in D7 (the `''` entry now loads the calendar page); the append-only rule is waived for those entries only.
- Planner decision (review fix): R8 warnings show only as the add-time confirm (brief 4), not in the alert strip (program §5 lists R8 there). Reverse: add a `food_warning` alert kind for planned items of a warning food while the baby is under its age.
- Evidence: `pnpm run build` → exit 0; `pnpm run lint` → exit 0; `ng test` → 31 of 31 SUCCESS (week-view and month-view specs included); `pnpm --dir server test` → pass 52, fail 0; `node --test server/domain/calendar-rules.test.js server/test/calendar.test.js` → pass 14, fail 0; `node scripts/override-check.mjs` → ok.
- behaviour: `אחרונים` (recent foods) is taken from the given items of the loaded range, not from a server query — reverse: add a `lastDate` to the food status and sort on it.
- behaviour: a refused add (allergen outside meal 1, duplicate) keeps the add-food sheet open and shows the toast — reverse: close the sheet in `pickFood`.
- behaviour: `/foods/new?returnTo=<path>` returns to an app-internal path after save and cancel — reverse: drop `returnTo` in `food-form.ts`.
- [ui] items: e2e/004-1 … 004-5 written, not run (no running app here).
