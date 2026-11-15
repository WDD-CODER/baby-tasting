# Plan 005 — Allergen rules engine, alerts on the calendar and the allergens page

Status: draft
Depends-on: 004
Snapshot: ebf1b1f24e30f84c61981a4b78904df83e192c8f
Source: docs/briefs/brief-5-allergen-engine.md (product rules: docs/briefs/00-program.md section 4 in full, M1, section 5 "Alerts")

## Problem Statement
The parents need the app to always know where each allergen stands — not started, being introduced, in maintenance,
finished — and to tell them on the calendar what is missing today, without ever resetting progress or deciding for them.

## Goals & Success Criteria
**Primary:** one pure engine computes every allergen's state, progress and alerts from the history; the calendar and
the `אלרגנים` page show exactly what the engine returns.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0.
- [auto] `node --test server/domain/allergen-engine.test.js server/domain/settings.test.js` exits 0, covering: given on days 1, 2, 3 → `maintenance` from day 3; given on days 1 and 3 only → on day 4 still `introducing`, progress 2/3, missing days `[day 2]`, one `intro_missing` alert; given late on day 5 → introduction completes on day 5, no restart; maintenance with last given 6 days ago → one `maintenance_gap` alert with `n = 6`; two given days this week with target 2 → no `maintenance_week` alert; baby aged 24 months with introduction complete → `finished` and no alerts; no birth date → never `finished`, no error; an archived allergen → no state and no alerts; `introDays: 4` turns the days-1-2-3 case back into `introducing` 3/4; out-of-range settings refused by `validateSettings`.
- [auto] `node --test server/test/domain-purity.test.js server/test/allergen-status.test.js server/test/settings.test.js` exits 0, covering: `GET /api/v1/allergens/status` and `GET /api/v1/alerts` return the engine output for the household; `GET /api/v1/settings` returns the defaults `{ introDays: 3, maintenancePerWeek: 2, maintenanceGapDays: 5, maintenanceUntilMonths: 24 }`; `PUT` accepts in-range values and refuses `introDays: 8`, `maintenanceGapDays: 1`, `maintenanceUntilMonths: 40` with 400 `invalid`; all three routes answer 401 without a session.
- [ui] With `טחינה` given 3 days ago and yesterday only, `/` shows `2/3` on yesterday's `טחינה` and the alert `חסר יום ברצף — כדאי לתת היום שומשום`.
- [ui] Tapping that alert opens the add-food sheet for today, meal 1, with `טחינה` preselected.
- [ui] With `שומשום` introducing, adding `ביצה קשה` to today's meal 1 asks `שומשום עדיין בחשיפה. להתחיל גם ביצה?`.
- [human] The alerts are helpful and not nagging; the `אלרגנים` page answers "where are we" in five seconds.

## Execution Mode
- Parallel: no
- Concurrent plans: none (runs after 004)
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
src/app/pages/allergens/**
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

- INV-1: preserves — the engine and the settings defaults/validation are pure functions in `server/domain/` that receive birth date, settings, allergens, foods, items and today as arguments; `server/test/domain-purity.test.js` keeps passing.
- INV-2: preserves — settings are stored through a new `server/repositories/settings-repository.js`; the routes gather inputs through repositories and call the engine.
- INV-3: preserves — the new routes sit behind the existing auth middleware.
- INV-4: preserves — `/api/v1/allergens/status`, `/api/v1/alerts`, `/api/v1/settings`, plain JSON, dates `YYYY-MM-DD`.
- INV-5: preserves — state colours are the DESIGN.md tokens (`--color-tier-okay` introducing, `--color-tier-good` maintenance, `--color-tier-bad` alert).
- INV-6: preserves — alert actions always open meal 1; nothing here places an allergen elsewhere.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, I see on the calendar that sesame is on day 2 of 3 and that a day was missed, and one tap lets me add it for today.
- As a parent, I open `אלרגנים` and see every allergen's state, last given date and this week's count.
- As a parent about to start egg while sesame is still being introduced, I get a gentle confirmation, not a block.

## Functional Requirements

### Must Have (P0)
- [ ] Pure engine (R1, R2, R3 inputs, R6) with a layer point for `locked` (plan 007).
- [ ] Status, alerts and settings API with validated ranges.
- [ ] Alert strip on the calendar with actions, state badges on allergen items, R3 confirmation, `אלרגנים` page and allergen detail page.

## UI/UX Notes
- Alert strip (the `alerts` extension point from plan 004): one compact row per alert, bad-colour inline-start bar, text, chevron; at most 3 visible then `+N נוספות` expands. Texts (`HE.alerts.*`, parameters filled in the template):
  - `intro_missing`: `חסר יום ברצף — כדאי לתת היום {allergen}`
  - `maintenance_gap`: `עברו {n} ימים בלי {allergen}`
  - `maintenance_week`: `השבוע: {allergen} ניתן {x} מתוך {y}`
  Tap on any of them → the add-food sheet for today, meal 1, with the allergen's most recently given active food preselected (or the first active food of that allergen).
- Badges (the `badgeFor` extension point): an `introducing` allergen's given item shows its ordinal among the allergen's given days (`1/3`, `2/3`, `3/3`) in the okay colour; a `maintenance` allergen's item shows a good-colour dot; other allergen items keep the neutral dot.
- R3: adding a food whose allergen is `not_started` while another allergen is `introducing` → `ConfirmDialogService` `{current} עדיין בחשיפה. להתחיל גם {new}?` with `להתחיל` / `ביטול` (current = the introducing allergen's name, new = the new food's allergen name).
- `/allergens`: one card per active allergen: name, state chip (`טרם התחיל`, `בחשיפה`, `בתחזוקה`, `הסתיים`), progress (`2/3 ימים`) while introducing, `ניתן לאחרונה: {date}` (Hebrew short date), `השבוע: {x}/{y}` in maintenance, and its alert text in bad colour when present. Order: introducing, then with alerts, maintenance, not started, finished. Tap → `/allergens/:id`.
- `/allergens/:id`: header with state, then the history: every given day (newest first) with the foods given that day and amounts.

## Atomic Sub-tasks

- [ ] E1: Put the rule values and their ranges in one pure module — `server/domain/settings.js`: `DEFAULT_SETTINGS` (`introDays` 3, `maintenancePerWeek` 2, `maintenanceGapDays` 5, `maintenanceUntilMonths` 24), `SETTING_RANGES` (1–7, 1–7, 2–14, 6–36, integers), `validateSettings(partial)` → `{ ok, errors }`, `withDefaults(stored)`; tests `server/domain/settings.test.js` — server/domain/settings.js, server/domain/settings.test.js
- [ ] E2: Compute every allergen's state and alerts from the history in one pure function — `server/domain/allergen-engine.js` `computeAllergens({ birthDate, settings, allergens, foods, items, today, locks = [] })` → `{ allergens: [{ allergenId, state, givenDays, intro: { daysGiven, required, firstDay, completedOn, missingDays }, lastGivenDate, weekCount, weekTarget }], alerts: [{ id, kind, allergenId, n?, x?, y? }] }`. Rules: a given day = a date with at least one `given` item of any food (archived included) of that allergen; `introducing` from the first given day until `introDays` distinct given days (R1, never reset); `missingDays` = dates after the first given day and before today without it, while introducing; `intro_missing` alert while introducing, `missingDays` not empty and not given today (R2); `maintenance` after completion until the baby's age in whole months ≥ `maintenanceUntilMonths`, then `finished` (no birth date → never finished); `maintenance_gap` when days since the last given day > `maintenanceGapDays` with `n` = those days; otherwise `maintenance_week` from Thursday when `weekCount` (distinct given days Sunday–Saturday, Asia/Jerusalem dates) < `maintenancePerWeek`, only for an allergen whose maintenance began before this week's Sunday (R6); archived allergens are left out; `locks` is applied last through a separate `applyLocks(result, locks)` stub that returns the result unchanged (plan 007 fills it); age through a pure `ageInMonths(birthDate, today)` in `server/domain/dates.js`; stable ids (`${kind}:${allergenId}`) and stable order — server/domain/allergen-engine.js, server/domain/dates.js, server/domain/allergen-engine.test.js
- [ ] E3: Store the household's rule values — `server/repositories/settings-repository.js` (`get(householdId)` → stored or `{}`, `save(householdId, values, user)`) — server/repositories/settings-repository.js
- [ ] E4: Serve states, alerts and settings — `server/routes/allergen-status.js` (`GET /api/v1/allergens/status`, `GET /api/v1/alerts`: loads baby, settings, allergens, foods, given items through repositories, calls the engine with today from `server/lib/dates.js`; alerts carry `allergenName`), `server/routes/settings.js` (`GET`, `PUT` with `validateSettings`, 400 `invalid` with the field and its range in `message`); mount the status route before the `/allergens/:id` routes; tests `server/test/allergen-status.test.js`, `server/test/settings.test.js` — server/routes/**, server/app.js, server/test/**
- [ ] E5: Load states and alerts in one frontend service — `src/app/core/services/allergen-status.service.ts` (`status`, `alerts` signals, `load()`, reloaded after every calendar write and on focus together with the calendar), `src/app/core/services/settings.service.ts` (`settings` signal, `load`, `save` — plan 008 builds its UI), models — src/app/core/**
- [ ] E6: Show alerts and state badges on the calendar — set `CalendarExtensionsService.alerts` and `badgeFor` from the status service; alert tap opens the add-food sheet with `{ date: today, meal: 1, preselectFoodId }` (extend the sheet's inputs); the R3 confirm in the add flow, reading only the API states — src/app/pages/calendar/**
- [ ] E7: Build the allergens page and the allergen detail page — `src/app/pages/allergens/allergens-page/`, `src/app/pages/allergens/allergen-detail/` per UI notes; routes `allergens` and `allergens/:id`; `HE.allergens.*`, `HE.alerts.*` — src/app/pages/allergens/**, src/app/app.routes.ts, src/app/core/i18n/he.ts
- [ ] E8: Record the state colours and badge shapes — DESIGN.md (badge ordinal style, state chips) and `## Open design decisions` lines for new choices — DESIGN.md
- [ ] E9: Write the UI checks — `e2e/005-1-badge-alert.spec.ts`, `e2e/005-2-alert-action.spec.ts`, `e2e/005-3-second-intro.spec.ts` (data created through the API in the test with `request`), screenshots `e2e/screens/005-<n>.png` — e2e/**
- [ ] E10: Note what now exists — `docs/project/current-state.md` — docs/project/current-state.md

## Technical Considerations
- Dependencies: none new.
- New files needed: listed per sub-task.
- Model changes: `AllergenStatus`, `Alert`, `Settings` (frontend); collection `settings`.
- Backend / API: `GET /api/v1/allergens/status`, `GET /api/v1/alerts`, `GET`/`PUT /api/v1/settings`.
- Auth and validation: session required; settings ranges enforced on the server.
- Security surface: none new beyond validated integers.
- Data / migration: new collection `settings` (one document per household); nothing stored is derived — states are computed on every call, so a settings change applies immediately.

## Backend Impact
- Collections affected: `calendarItems`, `foods`, `allergens`, `babies` (read)
- New collections: yes — `settings` (rule values per household)
- Server changes needed: yes — engine, settings module, two routers, settings repository.

## Out of Scope
Locks and reactions (plan 007), suggestions (plan 006), the settings UI (plan 008).

## Critical Questions
- none

## Execution Notes
- Planner decision (overnight pre-approval): the brief's `[ui]` example "given today and the day before yesterday" contradicts R2's "the alert clears when it is given" (given today = cleared). The card uses "3 days ago and yesterday, not today" instead; the domain test keeps the brief's day-1/day-3/day-4 case. Reverse: make the alert ignore today's given item.
- Planner decision: when both apply, the gap alert replaces the weekly alert for the same allergen (one alert per allergen, less nagging). Reverse: emit both.
- Planner decision: the weekly alert starts only for allergens whose maintenance began before this week's Sunday, so the week an introduction completes never nags.
