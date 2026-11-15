# Plan 008 — Food detail, progress summary, the settings page and the activity log

Status: draft
Depends-on: 007
Snapshot: ebf1b1f24e30f84c61981a4b78904df83e192c8f
Source: docs/briefs/brief-8-status-settings.md (product rules: docs/briefs/00-program.md R9, section 4 setting names, section 8)

## Problem Statement
The pages around the calendar are not complete yet: parents cannot read a food's full history, see overall progress,
or change the rule values themselves, and nobody can see who changed what.

## Goals & Success Criteria
**Primary:** food detail, progress summary, a complete `הגדרות` page with every rule value, sign out, the medical
disclaimer and a read-only activity log, plus a one-time calendar hint.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0, including `src/app/pages/settings/rules-form/rules-form.spec.ts` (a value outside its range disables `שמירה` and shows the range, e.g. `1–7`).
- [auto] `node --test server/test/activity.test.js server/test/settings.test.js` exits 0, covering: `GET /api/v1/activity` returns the latest changes newest first, at most 100, each `{ at, user, kind, summary }`, only for the caller's household (a second household's change never appears); `POST /api/v1/settings/reset` returns `{ introDays: 3, maintenancePerWeek: 2, maintenanceGapDays: 5, maintenanceUntilMonths: 24, maxAllergensPerMeal: 2, newFoodsPerWeek: 3 }`; `PUT /api/v1/users/me/hints` stores `calendarHintSeen` per user.
- [ui] On `/settings`, changing `introDays` from 3 to 4 and saving makes an allergen that showed `3/3` show `3/4` and `בחשיפה` on `/allergens`.
- [ui] On `/foods/:id` for `בננה`, each given date is listed; `הוספה ליומן` opens the add-food sheet on `/` with `בננה` preselected.
- [ui] On `/settings`, the activity log's first row names the user `parent-a` and the change just made.
- [human] The settings explanations are clear to a parent who did not build the app.

## Execution Mode
- Parallel: no
- Concurrent plans: none (runs after 007, last plan of the run)
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
src/app/app.routes.ts
src/app/core/**
src/app/shared/**
src/app/pages/calendar/**
src/app/pages/foods/**
src/app/pages/allergens/**
src/app/pages/settings/**
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

- INV-1: preserves — the progress summary is computed by a pure `server/domain/progress.js`; settings defaults stay in `server/domain/settings.js`.
- INV-2: preserves — the activity log reads audit fields through a new `server/repositories/activity-repository.js`; hints are stored through a repository.
- INV-3: preserves — new routes sit behind the existing auth middleware; the hint is stored for `req.user.username`.
- INV-4: preserves — new routes under `/api/v1/`, plain JSON, `at` is an ISO timestamp.
- INV-5: preserves — new pages use shared components and tokens.
- INV-6: preserves — `הוספה ליומן` of an allergen food always targets meal 1.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, I open banana and see every day it was given, how much, and whether the baby liked it.
- As a parent, I see at the top of `מזונות` how many foods we tried per category and where the allergens stand.
- As a parent, I change the number of introduction days and the app follows at once.
- As a parent, I see that my partner changed something yesterday.

## Functional Requirements

### Must Have (P0)
- [ ] Food detail page with status, history, reactions, lock, allergen and the three actions.
- [ ] Progress summary on the foods page.
- [ ] Settings page: baby form, six rule values with explanation, range and reset, fixed disclaimer, sign out, activity log (latest 100).
- [ ] One-time calendar hint per user.

## UI/UX Notes
- `/foods/:id` (tapping a row on `/foods` now opens this page; editing moves behind `עריכה`): header with emoji, name, allergen chip, lock chip; status line (`לא נוסה` / `נוסה · {n} פעמים · לראשונה {date}` + ❤️); actions `הוספה ליומן` (→ `/` with the add-food sheet for today, meal 1 for an allergen food, meal 2 otherwise, food preselected), `בתור לטעימה` toggle, `עריכה`; list `היסטוריה`: each given date (newest first) with amount, note, liked; list `תגובות` (from plan 007's reactions, filtered by food) linking to each reaction. Calendar item actions get `לפרטי המזון`.
- Progress summary (top of `/foods`, a collapsible card): `נוסו {tried} מתוך {total}` and one row per category with a thin bar (`--color-cat-nutrition`), then allergen counts by state as chips.
- `/settings` sections in order: `התינוק/ת` (existing form), `כללי מעקב` (rules form), `יומן שינויים`, a fixed line `האפליקציה היא כלי מעקב ותכנון ואינה מחליפה ייעוץ רפואי`, `יציאה`. The rules form is one form with the unsaved-changes guard; each value is a number field with a one-line explanation and the range; out-of-range shows `טווח מותר: {min}–{max}` and disables save; `איפוס לברירת מחדל` (confirm) resets all six. Explanations (`HE.settings.rules.*`): `introDays` `כמה ימים שונים צריך לתת אלרגן כדי לסיים חשיפה`; `maintenancePerWeek` `כמה פעמים בשבוע לתת אלרגן בתחזוקה`; `maintenanceGapDays` `אחרי כמה ימים בלי אלרגן בתחזוקה להתריע`; `maintenanceUntilMonths` `עד איזה גיל (בחודשים) ממשיכים תחזוקה`; `maxAllergensPerMeal` `כמה אלרגנים לכל היותר בארוחה הראשונה בהצעות`; `newFoodsPerWeek` `כמה מזונות חדשים מהתור להציע בשבוע`.
- Activity log: rows `{user} · {relative time} · {summary}`, e.g. `parent-a · לפני 2 דקות · סימן/ה בננה כניתן`; 20 shown, `הצגת עוד` up to 100.
- Calendar hint: a dismissible card above the calendar, shown once per user: `לחצו על + כדי להוסיף מזון לארוחה` / `גררו מזון כדי להעביר אותו לארוחה או ליום אחר` / `לחצו על מזון כדי לסמן שניתן`, button `הבנתי`.

## Atomic Sub-tasks

- [ ] H1: Compute the progress summary as a pure function — `server/domain/progress.js` `summarize({ foods, statuses, allergenStates })` → `{ tried, total, byCategory: [{ category, tried, total }], allergensByState }` (active foods only); `GET /api/v1/progress`; tests `server/domain/progress.test.js` — server/domain/progress.js, server/domain/progress.test.js, server/routes/**
- [ ] H2: Read the latest changes from the audit fields — `server/repositories/activity-repository.js` `latest(householdId, limit = 100)`: merges, newest first by `updatedAt`, the household's calendar items, foods, allergens, reactions, locks (lock and release), baby and settings documents into `{ at, user, kind, summary }` (summary built from a small template table in `server/lib/activity-summary.js`, Hebrew text keys resolved on the frontend: `{ kind: 'calendar.given', foodName }`); `GET /api/v1/activity`; tests `server/test/activity.test.js` with two households — server/repositories/activity-repository.js, server/lib/activity-summary.js, server/routes/activity.js, server/app.js, server/test/activity.test.js
- [ ] H3: Reset rule values and remember the hint per user — `POST /api/v1/settings/reset` (stores defaults, returns them); `server/repositories/user-prefs-repository.js` and `GET`/`PUT /api/v1/users/me/hints` `{ calendarHintSeen }`; tests in `server/test/settings.test.js` — server/routes/settings.js, server/routes/users.js, server/repositories/user-prefs-repository.js, server/app.js, server/test/settings.test.js
- [ ] H4: Build the food detail page — `GET /api/v1/foods/:id/history` → `{ items: [{ id, date, meal, amount, note, liked }] }` given items newest first (in `server/routes/foods.js`, tested in `server/test/catalog.test.js`); the lock chip has a `שחרור` action (same confirm as plan 007); `src/app/pages/foods/food-detail/` at `foods/:id` per UI notes (the edit form moves to `foods/:id/edit`, already its route); `לפרטי המזון` in the calendar item actions; the add-food sheet accepts a `preselectFoodId` query param on `/` (`/?add=<foodId>`) — server/routes/**, server/test/**, src/app/pages/foods/**, src/app/pages/calendar/**, src/app/app.routes.ts
- [ ] H5: Show the progress summary on the foods page — collapsible card per UI notes, `ProgressService` or a method on `CatalogService` — src/app/pages/foods/**, src/app/core/**
- [ ] H6: Complete the settings page — `src/app/pages/settings/rules-form/` (spec named in Done-when), activity log component `src/app/pages/settings/activity-log/`, disclaimer, order per UI notes; one `HasUnsavedChanges` for the page covering both forms — src/app/pages/settings/**, src/app/core/**
- [ ] H7: Show the calendar hint once per user — `src/app/pages/calendar/calendar-hint/` reading and writing the hint through `src/app/core/services/user-prefs.service.ts` — src/app/pages/calendar/**, src/app/core/**
- [ ] H8: Dictionary and design notes — `HE.foodDetail.*`, `HE.settings.*`, `HE.activity.*`, `HE.hint.*`; DESIGN.md progress bar and `## Open design decisions` lines — src/app/core/i18n/he.ts, DESIGN.md
- [ ] H9: Write the UI checks — `e2e/008-1-intro-days.spec.ts`, `e2e/008-2-food-detail.spec.ts`, `e2e/008-3-activity.spec.ts`, screenshots `e2e/screens/008-<n>.png` — e2e/**
- [ ] H10: Note what now exists — `docs/project/current-state.md` — docs/project/current-state.md

## Technical Considerations
- Dependencies: none new.
- New files needed: listed per sub-task.
- Model changes: `Progress`, `ActivityEntry`, `UserPrefs`; collection `userPrefs`.
- Backend / API: `GET /api/v1/progress`, `GET /api/v1/activity`, `POST /api/v1/settings/reset`, `GET`/`PUT /api/v1/users/me/hints`.
- Auth and validation: session required; activity strictly filtered by `req.householdId`.
- Security surface: activity shows usernames of the household's own members only (they are already known to each other); it never lists `APP_USERS`.
- Data / migration: new collection `userPrefs` (`{ householdId, username, calendarHintSeen }`).

## Backend Impact
- Collections affected: every household collection (read for the activity log), `settings` (reset)
- New collections: yes — `userPrefs` (per-user hint flag)
- Server changes needed: yes — progress, activity, reset, hints.

## Out of Scope
Export, backup, charts, notifications, themes, language switch, deploying (plan for brief 9 later).

## Critical Questions
- none

## Execution Notes
- Planner decision (overnight pre-approval): the activity log is built from the audit fields already on every document (latest state per document), not from a separate event log; a document edited twice shows once with its latest change. Reverse: add an append-only `activity` collection written by the base repository.
- Planner decision (review fix): this plan may modify the existing `src/app/app.routes.ts` entries named in H4 (`foods/:id` now loads the food detail page); the append-only rule is waived for those entries only.
