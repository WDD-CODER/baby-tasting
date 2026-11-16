# Plan 015 — Validation fixes: sleep sheet modes, averages over days with data, typed time picker, allergen in any meal

Status: draft
Depends-on: 014
Snapshot: 0864ab6608ce50817c876d8f6731e3780ffd608c
Source: the Human's validation of plans 009–014 (2026-11-16, cards ⑨ and ⑮ plus two extra notes); decisions logged below.

## Problem Statement
The parents validated the Tracker rebuild and found four things to change: holding the sleep button during a running sleep cannot fix the real start time or log an earlier sleep without touching the running one; dashboard averages divide by the chosen 3/7/14 days even when data exists only from today, so averages drop when the range grows; the time picker is hard to use (scroll only, no typing); and the Tasting calendar refuses to move an allergen food from meal 1 to a later meal of the same day.

## Decisions (Human, 2026-11-16)
- **D-015-1 Sleep sheet while a sleep runs.** Holding `השכבה לישון` (or `להעיר תינוק ⏰`) while a sleep is open offers two modes:
  1. **Fix the current sleep's start** — a time field only (no date, no `אתמול`, no calendar). Saving moves the open sleep's start to that time; the sleep stays open and the timer keeps running from the new start. The start must not be in the future and must not overlap an earlier sleep (`השינה חופפת לשינה אחרת`).
  2. **Record a sleep that already happened** (`📅 תיעוד שינה שהסתיימה`) — date, start and end as today. After a valid save, ask: `לסיים את השינה הנוכחית או להשאיר אותה פעילה?` with `לסיים עכשיו` and `להשאיר פעילה` (default focus: `להשאיר פעילה`). `להשאיר פעילה` keeps the open sleep exactly as it was. A recorded sleep that overlaps the open sleep is refused with `השינה חופפת לשינה אחרת` (no question asked).
  Editing an existing (closed) sleep from the timeline keeps its own date+time fields; editing the **open** sleep from the timeline or the banner shows time only, like mode 1.
- **D-015-2 Averages over days with data.** Every "per day" / average figure on `/stats` (and the same server functions) divides by the number of baby days from the **first day in the range that has any Tracker event (any type)** to the last day of the range (capped at today), not by the length of the range. Days in between with no events still count. With no events in the range, the averages are 0. The number of days used is returned as `daysWithData` next to `rangeDays`, and any on-screen text that names the day count uses `daysWithData`. Bar charts still show one bar per day of the range.
- **D-015-3 Time picker.** One shared picker replaces the scroll-only `app-datetime24` everywhere it is used: a typed `HH:MM` field (24 h, numeric keyboard on phones via `inputmode="numeric"`, auto-inserts `:`, validates 00:00–23:59 with an inline error) **plus** the existing scroll/list choice as a secondary way, quick chips `עכשיו`, `−5`, `−15`, `−30` (minutes, relative to the current value), and — only where a date is allowed — date chips `היום`, `אתמול` and a calendar button. A `dateMode: 'none' | 'date'` input controls the date part (mode 1 of D-015-1 uses `none`).
- **D-015-4 Allergen in any meal (changes R4 / INV-6).** An allergen food may be placed, dropped or moved into **any meal** of a day. The rule limits on allergens across days (introduction days, how many allergens, the 3-day windows) stay exactly as they are. When an allergen food ends up in meal 2 or 3, the calendar shows a soft note (toast, not a refusal): `שימו לב: אלרגן מחוץ לארוחה הראשונה`. Suggestions keep placing allergens in meal 1. R4 in `docs/briefs/00-program.md` and INV-6 in `docs/brain/invariants.md` are rewritten to say this.

## Goals & Success Criteria
**Primary:** the four decisions above work and are covered by tests; the four Tasting e2e specs that went out of date are current.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0 (Karma and every server test).
- [auto] `node --test server/domain/tracker/stats.test.js server/domain/tracker/sleep.test.js server/domain/calendar-rules.test.js server/test/tracker-stats.test.js server/test/tracker-sleep.test.js server/test/calendar.test.js` exits 0, covering: averages with data only today give the same value for ranges 1, 3, 7, 14 and `daysWithData` 1; a gap day inside the data counts; empty range gives 0; moving the open sleep's start keeps it open and refuses a future start or an overlap; a recorded past sleep overlapping the open one gets 409 `sleep_overlap`; an allergen food in meal 2 or 3 is accepted (no `allergen_meal_1`).
- [auto] `src/app/shared/ui/datetime24/datetime24.spec.ts`: typing `0730` gives `07:30`; `25:10` shows the error; `−15` from 10:05 gives 09:50; `dateMode: 'none'` renders no date chips.
- [ui] During a running sleep, holding the sleep button and setting the start 20 minutes earlier keeps `שינה פעילה` and the timer shows at least 20 minutes.
- [ui] During a running sleep, recording a past sleep from 2 hours ago to 1 hour ago and choosing `להשאיר פעילה` leaves the running sleep open, and the timeline shows both.
- [ui] On `/stats`, with events from today only, switching from `היום` to `7 ימים` leaves the nutrition average unchanged.
- [ui] In the Tasting calendar, dragging an allergen food from meal 1 to meal 3 of the same day keeps it in meal 3 after a reload and shows `שימו לב: אלרגן מחוץ לארוחה הראשונה`.
- [ui] The e2e specs 001-1, 003-2, 003-3 and 008-1 pass (updated to the current app, not by weakening what they check).
- [human] Typing a time on the phone is quick and clear.

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
server/domain/**
server/routes/**
server/lib/**
server/repositories/**
server/test/**
src/app/core/**
src/app/shared/**
src/app/dev/**
src/app/pages/**
e2e/**
docs/briefs/00-program.md
docs/brain/invariants.md
docs/brain/decisions/0016-allergen-any-meal.md
src/app/shared/ui/datetime24/datetime24.spec.ts
e2e/015-*.spec.ts
DESIGN.md
docs/project/current-state.md
```

## Read Scope

Entire repo. The Tracker specs in `docs/briefs/tracker/spec-*.md` stay binding except where the Decisions above change them. The old Tracker code is at `C:\coding projects\Cursor/baby-tracker` (read only).

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — averaging (`daysWithData`), sleep start moves and the overlap checks stay pure in `server/domain/tracker/`; the routes pass the first event date in.
- INV-2: preserves — the first-event-date lookup is a repository method.
- INV-3: preserves — no auth change.
- INV-4: preserves — any new route or field stays under `/api/v1/tracker/*`.
- INV-5: preserves — the picker and the note use tokens only.
- INV-6: changes — ADR docs/brain/decisions/0016-allergen-any-meal.md (Human decision D-015-4, Arch-approved: Human): allergen foods may be in any meal; the rule text in `docs/brain/invariants.md` and R4 in `docs/briefs/00-program.md` are rewritten in this plan; the server and the UI mirror (`server/domain/calendar-rules.js`, `src/app/core/utils/calendar-rules.ts`) drop the meal check together.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent who forgot to tap when the baby fell asleep, I set the real start and the timer keeps going.
- As a parent who forgot to log an earlier nap, I add it without stopping the current sleep.
- As a parent who started tracking today, the 7-day averages are not diluted by empty days before I started.
- As a parent with one hand free, I type `0730` instead of scrolling.
- As a parent, I move today's allergen food to lunch or dinner when that suits the day.

## Functional Requirements

### Must Have (P0)
- [ ] D-015-1 sleep sheet modes (with the server support: change the open sleep's start, overlap checks against the open sleep).
- [ ] D-015-2 `daysWithData` averaging in all six stats functions and the page texts.
- [ ] D-015-3 shared typed time picker, used by every current `app-datetime24` user.
- [ ] D-015-4 allergen placement in any meal with the soft note; R4 and INV-6 rewritten.
- [ ] e2e 001-1, 003-2, 003-3, 008-1 current.

## UI/UX Notes
- Sleep sheet: the two modes as two segmented buttons at the top of the sheet when a sleep is open (`⏱️ תיקון שעת ההירדמות` / `📅 תיעוד שינה שהסתיימה`); without an open sleep the sheet stays as today.
- The end-or-keep question is the shared confirm dialog, not a browser dialog.
- Picker: the typed field is the first, large control; chips under it; the list/scroll choice opens from a small `בחירה מרשימה` link.

## Atomic Sub-tasks

- [x] O1: Average over days with data — `server/domain/tracker/stats.js` (`daysWithData`, every per-day figure), the repository method for the first event date in a range, `server/routes/tracker-stats.js`, tests; the stats page texts use `daysWithData` — server/**, src/app/pages/tracker/**
- [x] O2: Sleep start fix and past sleep beside an open one — `server/domain/tracker/sleep.js` + route (move the open sleep's start; overlap refusal against the open sleep), tests — server/**
- [x] O3: The shared typed time picker — rebuild `src/app/shared/ui/datetime24/` per D-015-3 (keep the selector or rename and update every user), spec, demo page — src/app/shared/**, src/app/dev/**, src/app/pages/**
- [x] O4: Sleep sheet modes and the end-or-keep question — `src/app/pages/tracker/entry-sheet/**`, the edit sheet for the open sleep (time only), Hebrew texts in `src/app/core/i18n/he.ts` — src/app/pages/tracker/**, src/app/core/**
- [x] O5: Allergen in any meal — `server/domain/calendar-rules.js`, `server/lib/calendar-create.js`, `server/routes/calendar.js`, `src/app/core/utils/calendar-rules.ts`, the calendar page note, tests; rewrite R4 in `docs/briefs/00-program.md` and INV-6 in `docs/brain/invariants.md`, write the ADR `docs/brain/decisions/0016-allergen-any-meal.md` (context, decision D-015-4, consequences) — server/**, src/app/**, docs/briefs/00-program.md, docs/brain/invariants.md
- [x] O6: UI checks — `e2e/015-1-sleep-start-fix.spec.ts`, `e2e/015-2-past-sleep-keep.spec.ts`, `e2e/015-3-averages.spec.ts`, `e2e/015-4-allergen-any-meal.spec.ts`; update 001-1, 003-2, 003-3, 008-1 and any spec that used the old picker; `docs/project/current-state.md` — e2e/**, docs/project/current-state.md

## Technical Considerations
- Tests: mind the login rate limit (10 per 15 min) when running e2e — one spec file at a time.
- The e2e 004-3 spec expects the old meal-1 refusal: rewrite it to the new behaviour (note shown, move kept).

## Out of Scope
Deploy, the Firestore copy (T7), changes to the export.

## Critical Questions
- none

## Execution Notes
- Builder (orch tracker-2, round 0, branch feat/015-tracker-feedback-sleep-averages). `scope-check --drift` → `REALITY: clean`, no Step 0.
- O1: `daysWithData(events, opts)` + `rangeBounds(opts)` in `server/domain/tracker/stats.js`; every average divides by it (0 with no events); `TrackerEventsRepository.firstTimestamp` gives the first event of any type in the exact 06:00 range and the route passes it as `firstEventAt`. Weight totals carry `rangeDays` / `daysWithData` too. No `/stats` text names a day count today, so the page needed only the model field.
- O2: `moveOpenSleepStart` (pure) + `POST /api/v1/tracker/sleep/open/start`; `PUT /tracker/events/:id` refuses a future start of an open sleep. A recorded sleep overlapping the open one was already 409 `sleep_overlap` (open = runs to infinity); covered by tests.
- O3: `app-datetime24` kept its selector; new `dateMode` input, typed field, chips −5/−15/−30, `בחירה מרשימה`; spec rewritten; demo page shows `dateMode="none"`.
- O4: with a sleep open the TIMER segment reads `⏱️ תיקון שעת ההירדמות`; end-or-keep uses `ConfirmDialogService` (cancel = `להשאיר פעילה` is first, so the dialog's focus trap focuses it).
- O5: `checkPlacement` removed (server and UI mirror); `isAllergenOutsideMeal1` drives the toast; `server/test/suggestions.test.js` accept expectation updated (an allergen in meal 2 is now created). R4, INV-6, ADR 0016 written.
- O6: e2e 015-1…015-4 written, not run (no app in the worktree); 001-1 (foods are seeded, so the list replaces the empty state), 003-3 (archive is on the edit page since plan 008), 008-1 (scoped to the rules form, waits for `נשמר` before leaving), 003-2 (exact button names, waits for the new allergen to be selected), 004-3 (new behaviour) updated. `npx playwright test --list` → 9 tests in 9 files, exit 0. No spec used the old picker controls.
- `pnpm run build` → exit 0 (existing budget warning on stats-page.scss, untouched).
- `pnpm run lint` → exit 0, "All files pass linting."
- `pnpm run test` → exit 0, Karma TOTAL: 77 SUCCESS; server `# pass 207, # fail 0`.
- `node --test server/domain/tracker/stats.test.js server/domain/tracker/sleep.test.js server/domain/calendar-rules.test.js server/test/tracker-stats.test.js server/test/tracker-sleep.test.js server/test/calendar.test.js` → exit 0, tests 52, pass 52, fail 0.
