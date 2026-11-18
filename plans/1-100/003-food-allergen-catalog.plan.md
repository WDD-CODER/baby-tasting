# Plan 003 — Food and allergen catalog the parents can extend and edit

Status: done
Depends-on: 002
Snapshot: ebf1b1f24e30f84c61981a4b78904df83e192c8f
Source: docs/briefs/brief-3-catalog.md (the built-in allergen and food lists there are binding data; product rules: docs/briefs/00-program.md section 3, R8, R9, section 8)

## Problem Statement
Before anything can be placed on the calendar, the household needs a Hebrew catalog of foods and allergens that starts
complete enough to use and that the parents can add to, edit and archive freely.

## Goals & Success Criteria
**Primary:** on first use the household gets the 13 built-in allergens and the built-in foods; parents search, filter,
add, edit and archive them on the `מזונות` page.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0.
- [auto] `node --test server/test/catalog.test.js server/test/seed-catalog.test.js` exits 0, covering: the first catalog call seeds exactly 13 allergens and every built-in food of the brief (count asserted against the seed file); a second call adds nothing; an edited built-in food keeps the edit after another seed call; an archived built-in food stays archived after another seed call; a duplicate name (after trim) among non-archived foods is refused with 409 `duplicate_name`, and the same for allergens; `DELETE` of a food that a calendar item uses archives it (answer `{ "result": "archived" }`) and of an unused food deletes it (`{ "result": "deleted" }`); restore brings an archived food back; every route answers 401 without a session.
- [ui] On `/foods`, the list shows `בננה`; switching on `אלרגנים בלבד` hides `בננה` and still shows `טחינה` with the chip `שומשום`.
- [ui] On `/foods/new`, saving `קוסקוס` with category `דגנים`, emoji 🍚 and a new allergen `כוסמין` created inline shows `קוסקוס` in the list with the chip `כוסמין`.
- [ui] On `/foods/new`, typing a name and pressing back shows `יש שינויים שלא נשמרו`; on an existing food, `העברה לארכיון` asks `להעביר את {name} לארכיון?` before anything happens.
- [human] The emoji and names read well on a phone; the catalog feels complete enough to start.

## Execution Mode
- Parallel: no
- Concurrent plans: none (runs after 002)
- Isolated DB: no
- Reviewer: gate

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/app.js
server/routes/**
server/repositories/**
server/lib/**
server/seed/**
server/test/**
src/app/app.routes.ts
src/app/core/**
src/app/shared/**
src/app/pages/foods/**
src/app/dev/**
e2e/**
docs/project/current-state.md
src/app/app.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-2: preserves — foods, allergens and the seed go through `server/repositories/` (the seed calls repository functions, never the driver).
- INV-3: preserves — the new routes sit behind the existing auth middleware and read only `req.user` and `req.householdId`.
- INV-4: preserves — new routes under `/api/v1/`, plain JSON.
- INV-5: preserves — the foods page uses shared components and tokens; the allergen chip uses `app-chip`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, I open `מזונות` and find the common first foods already there with clear emoji.
- As a parent, I add a food my family eats, mark which allergen it contains, and it appears in the list.
- As a parent, I archive a food we will not use without losing the history of days it was given.

## Functional Requirements

### Must Have (P0)
- [ ] CRUD with archive and restore for allergens and foods; delete becomes archive once a calendar item uses it.
- [ ] Idempotent built-in seed per household; edits and archives of built-in entries are never overwritten.
- [ ] Foods page: search, category filter, "allergens only" filter, list (emoji, name, allergen chip, status `לא נוסה`), add / edit form, allergen management.

## UI/UX Notes
- `/foods`: sticky search field (`חיפוש מזון`), a horizontally scrolling row of category chips (`הכול` + the 8 categories), a toggle chip `אלרגנים בלבד`, then the list grouped by category in the order below. Each row: emoji (24px), name, allergen chip (`app-chip` tone `accent`), status text secondary colour (`לא נוסה`), warning icon ⚠️ when the food has a warning. Tap a row → `/foods/:id/edit` (plan 008 turns this into a detail page). A primary `app-button` `הוספת מזון` at the bottom above the navigation, and a secondary link `ניהול אלרגנים` → `/foods/allergens`.
- Categories (stored key → Hebrew label, display order): `vegetables` ירקות, `fruits` פירות, `grains` דגנים, `legumes` קטניות, `proteins` חלבונים, `dairy` חלב ומוצריו, `allergens` אלרגנים נוספים, `other` אחר. The brief's "אזהרות בלבד" foods (דבש, אגוזים שלמים) go to `other`.
- Food form (`/foods/new`, `/foods/:id/edit`): name, category `app-select`, emoji picker (a grid of 40 food emoji from the built-in list plus a free text field for any emoji), allergen `app-select` with `ללא` and `+ אלרגן חדש` (choosing it shows an inline `app-text-field` and a small `הוספה` button that creates the allergen and selects it), warning text, warning age in months (empty = always shown). Save, cancel, and on edit `העברה לארכיון` (danger, ghost). Unsaved-changes guard.
- `/foods/allergens`: list of allergens (name, number of foods), rename inline, `העברה לארכיון` with confirm, `הצגת ארכיון` toggle with restore, add field at the top.
- Empty states per product defaults; errors map server codes to Hebrew: `duplicate_name` → `כבר קיים פריט בשם הזה`.

## Atomic Sub-tasks

- [x] C1: Write the built-in catalog once as data — `server/seed/catalog.js` exports `BUILT_IN_ALLERGENS` (13, each `{ key, name }`, keys like `milk`, `egg`, `peanut`, `sesame`, `fish`, `wheat`, `soy`, `walnut`, `almond`, `hazelnut`, `cashew`, `pistachio`, `pecan`) and `BUILT_IN_FOODS` (every food of the brief exactly as written: `{ key, name, emoji, category, allergenKey | null, warning: { text, untilMonths | null } | null }`; warnings: ענבים `לחתוך לרבעים לאורך` 60; דג לבן and סלמון `לוודא שאין עצמות` null; חלב פרה לשתייה `לא כמשקה לפני גיל שנה` 12; חמאת בוטנים `מרוח דק או מדולל, לא בכפית` null; דבש `אסור לפני גיל שנה` 12; אגוזים שלמים `סכנת חנק — רק טחון` 60) — server/seed/catalog.js
- [x] C2: Store allergens and foods per household through repositories — `server/repositories/allergens-repository.js`, `foods-repository.js` on `BaseRepository` (documents carry `householdId`, `babyId`, `builtIn`, `builtInKey`, `archived`, audit fields; `listActive`, `listAll`, `findByName(householdId, name, excludeId)` among non-archived, `archive`, `restore`, `remove`); `server/repositories/calendar-items-repository.js` with only `countByFoodIds(householdId, foodIds)` on collection `calendarItems` (plan 004 extends this file); `server/lib/context.js` `requireBabyId(repos, householdId)` → the baby's id or `HttpError(409, 'no_baby')` — server/repositories/**, server/lib/context.js
- [x] C3: Seed the catalog once per household and never overwrite the parents' edits — `server/seed/seed-catalog.js` `ensureCatalog(repos, householdId, babyId, now)`: inserts each built-in allergen and food that has no document with the same `builtInKey` (insert-if-missing, `builtIn: true`), resolves `allergenKey` → `allergenId`, runs on the first catalog request of a household and is safe to call again; `server/test/seed-catalog.test.js` — server/seed/seed-catalog.js, server/test/seed-catalog.test.js
- [x] C4: Offer catalog routes with archive instead of delete once used — `server/routes/allergens.js` and `server/routes/foods.js`: `GET` (active; `?archived=1` includes archived), `POST`, `PATCH /:id`, `POST /:id/archive`, `POST /:id/restore`, `DELETE /:id` (in use by any calendar item, or an allergen with active foods → archive, `{ result: 'archived' }`; else delete, `{ result: 'deleted' }`); validation: name 1–40 trimmed, emoji 1–8 characters, category in the 8 keys, `allergenId` an active allergen of the household, warning text ≤ 120, `untilMonths` integer 1–120 or null; duplicate → 409 `duplicate_name`; mounted behind auth in `server/app.js`; `server/test/catalog.test.js` — server/routes/allergens.js, server/routes/foods.js, server/app.js, server/test/catalog.test.js
- [x] C5: Keep the catalog in one frontend service — `src/app/core/services/catalog.service.ts` (`foods`, `allergens` signals, `load()`, `saveFood`, `archiveFood`, `restoreFood`, `removeFood`, `saveAllergen`, `archiveAllergen`, `restoreAllergen`; `allergenById` computed map), models `src/app/core/models/food.ts`, `allergen.ts`, `food-category.ts` (keys + Hebrew labels from the dictionary); spec — src/app/core/**
- [x] C6: Build the foods page with search and filters — `src/app/pages/foods/foods-page/` per UI notes, filtering in `computed()` signals, empty, loading and error states; all text in `HE.foods.*` — src/app/pages/foods/**, src/app/core/i18n/he.ts, src/app/app.routes.ts
- [x] C7: Build the food form with an inline new-allergen option and an emoji picker — `src/app/pages/foods/food-form/` per UI notes, `HasUnsavedChanges`, route guard, archive confirm via `ConfirmDialogService` (`להעביר את {name} לארכיון?`); the emoji picker as a shared component `src/app/shared/ui/emoji-picker/` (also shown on the demo page `src/app/dev/components-demo/`) — src/app/pages/foods/food-form/**, src/app/shared/ui/emoji-picker/**, src/app/dev/**
- [x] C8: Let parents manage allergens — `src/app/pages/foods/allergens-manage/` at `/foods/allergens` per UI notes — src/app/pages/foods/allergens-manage/**
- [x] C9: Write the UI checks — `e2e/003-1-filter.spec.ts`, `e2e/003-2-add-food.spec.ts`, `e2e/003-3-guards.spec.ts` using `e2e/support/session.ts` (reset, sign in, baby), screenshots `e2e/screens/003-<n>.png` — e2e/**
- [x] C10: Note what now exists — `docs/project/current-state.md` — docs/project/current-state.md

## Technical Considerations
- Dependencies: none new.
- New files needed: listed per sub-task.
- Model changes: `Food`, `Allergen`, `FoodCategory` (frontend); collections `allergens`, `foods`.
- Backend / API: `/api/v1/allergens`, `/api/v1/foods` (list, create, update, archive, restore, delete-or-archive).
- Auth and validation: session required; inputs validated as in C4; household taken only from `req.householdId`.
- Security surface: new text inputs (name, warning) stored as text and rendered with Angular interpolation only (no `innerHTML`).
- Data / migration: new collections; seed is insert-if-missing by `builtInKey`, so it is safe for existing households.

## Backend Impact
- Collections affected: `calendarItems` (read-only count, collection created by plan 004)
- New collections: yes — `allergens`, `foods` (the catalog, per household)
- Server changes needed: yes — two routers, two repositories, the seed.

## Out of Scope
Calendar placement, any status beyond `לא נוסה`, locks, age-based recommendations, the food detail page (plan 008), the tasting queue (plan 006).

## Critical Questions
- none

## Execution Notes
- Planner decision (overnight pre-approval): `DELETE` decides between delete and archive on the server, so the UI has one remove action; built-in entries can be archived but are never deleted (`DELETE` on a built-in archives it).
- Planner decision (review fix): this plan may modify the existing `src/app/app.routes.ts` entries named in C6 (the `foods` entry now loads the foods page; `foods/new`, `foods/:id/edit`, `foods/allergens` are added before any `foods/:id`); the append-only rule is waived for those entries only.
- Builder evidence: `pnpm run build` → 0; `pnpm run lint` → 0; `node --test server/test/catalog.test.js server/test/seed-catalog.test.js` → 0 (16 pass); `pnpm run test:server` → 0 (38 pass); `node scripts/override-check.mjs` → 0.
- `pnpm run test` → 1: Karma 23 pass, 1 fail — `src/app/app.spec.ts` "renders the foods empty state on /foods" expects the old placeholder page and sees the new foods page loading. That file is outside this plan's scope: needs `approved: src/app/app.spec.ts` (stub `CatalogService` and expect the new page).
- `e2e/001-2-components.spec.ts` section count 13 → 14 (new emoji-picker demo section; inside `e2e/**`).
- `[ui]` items: `e2e/003-{1,2,3}-*.spec.ts` written, not run.
- Resume (answer 003-1 approved): `src/app/app.spec.ts` now stubs `CatalogService` and expects the add button of the new foods page; `pnpm run test` → 0 (24 pass), build → 0, lint → 0.
