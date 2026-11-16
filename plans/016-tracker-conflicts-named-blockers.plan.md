# Plan 016 — Event conflicts that name what blocks them, awake-only events refused during sleep, calendar drag during a refresh

Status: draft
Depends-on: 015
Snapshot: 5663ba228c064ab63c626147daf07b23fee78e15
Source: the Human's validation of plan 015 (2026-11-16, card ⑤: "we need to let the user know what is blocking it, not only that something is blocking it; it can't be eating and sleeping at the same time, and other things"); the drag bug found in the same e2e run.

## Problem Statement
A refused sleep says only `השינה חופפת לשינה אחרת`; the parent cannot see which entry blocks it. Feeding, activity or weighing can be logged inside a sleep, which cannot be true. In the Tasting calendar, a drag that starts while the calendar is refreshing makes the tile disappear until a reload (Angular NG05106).

## Decisions (Planner, from the Human's request — the Human can change them at validation)
- **D-016-1 Awake-only events.** `NUTRITION` (every feed type; breastfeeding covers `timestamp` … `timestamp + durationMinutes`), `ACTIVITY` and `WEIGHT` cannot fall inside a sleep. `DIAPER`, `VOMITING`, `PUMPING` (the parent) and `SUPPLEMENT` are allowed during a sleep.
- **D-016-2 Conflicts always name the blocker.** Every refusal for overlap (sleep vs sleep, awake-only event vs sleep, sleep vs awake-only event) returns 409 `event_conflict` with `conflict: { id, eventType, startAt, endAt | null }` of the first blocking event. The client shows one line naming it, in Hebrew, with times in Asia/Jerusalem, for example:
  - `השינה חופפת לשינה מ-14:10 עד 15:40 (16/11)`
  - `השינה חופפת לשינה הפעילה שהתחילה ב-16:49`
  - `התינוק ישן אז: שינה מ-14:10 עד 15:40`
  - `בזמן הזה יש האכלה ב-14:30` (a sleep that would cover a feed, activity or weigh-in; the event's Hebrew type name is used)
  and a button `הצג` that opens the blocking event in the shared edit sheet (so the parent can fix whichever entry is wrong). The old `sleep_overlap` code is replaced by `event_conflict` everywhere (server, client, tests).
- **D-016-3 Open sleep vs a new awake-only event.** Logging a feed, activity or weigh-in (quick tap or sheet) at a time after the start of the open sleep does not refuse: it asks `התינוק ישן מאז HH:MM. לסיים את השינה ולתעד?` with `לסיים ולתעד` (ends the sleep at the event's time, then saves the event) and `ביטול`. A time before the open sleep's start is a normal save (if no other conflict).
- **D-016-4 Calendar drag during a refresh.** While a drag is in progress the calendar does not replace its rendered items; a refresh that arrives during the drag is applied after the drop. An item that has no server id yet (still being created) cannot be dragged or opened until the server confirms it.

## Goals & Success Criteria
**Primary:** every overlap refusal names its blocker and lets the parent open it; awake-only events cannot be logged inside a sleep; the calendar drag survives a refresh.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0 (Karma and every server test).
- [auto] `node --test server/domain/tracker/conflicts.test.js server/domain/tracker/sleep.test.js server/test/tracker-events.test.js server/test/tracker-sleep.test.js` exits 0, covering: a past sleep over another sleep → 409 `event_conflict` with that sleep's id and times; a bottle inside a closed sleep → 409 with the sleep; a breastfeed whose duration runs into a sleep → 409; a sleep recorded over an existing feed → 409 naming the feed; a diaper, a pump, a spit-up and a supplement inside a sleep are saved; a feed after the open sleep's start with `endOpenSleep: true` ends the sleep at the feed time and saves the feed; without it → 409 naming the open sleep.
- [auto] A Karma spec for the conflict message formatter: each example line of D-016-2 from a fixed conflict.
- [ui] Recording a past sleep that overlaps an earlier sleep shows `השינה חופפת לשינה מ-<start> עד <end>` and `הצג` opens that sleep in the edit sheet.
- [ui] Adding a bottle at a time inside an earlier closed sleep shows `התינוק ישן אז: שינה מ-<start> עד <end>` and nothing is saved.
- [ui] During a running sleep, a quick meal asks `התינוק ישן מאז` …; `לסיים ולתעד` ends the sleep and the timeline shows the meal after it.
- [ui] In the Tasting calendar, dragging a tile right after adding it keeps it (no disappearing tile).
- [ui] The e2e specs 003-2 and 008-1 pass against the current app (updated to what the app shows today, without weakening what they check).
- [human] The conflict messages read clearly and the `הצג` button helps fix the wrong entry.

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
server/domain/tracker/conflicts.test.js
server/routes/**
server/lib/**
server/repositories/**
server/test/**
src/app/core/**
src/app/shared/**
src/app/dev/**
src/app/pages/**
e2e/**
DESIGN.md
docs/project/current-state.md
```

## Read Scope

Entire repo. The Tracker specs in `docs/briefs/tracker/spec-*.md` stay binding except where plan 015 and the Decisions above change them.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — conflict detection is a pure function `server/domain/tracker/conflicts.js` (events in, first blocker out); "now" and the time zone are arguments.
- INV-2: preserves — the routes load the candidate events through the tracker events repository (a time-window query).
- INV-3: preserves — no auth change.
- INV-4: preserves — `/api/v1/tracker/*`; `event_conflict` is a 409 body like the other error codes.
- INV-5: preserves — the message line and `הצג` use shared components and tokens.
- INV-6: preserves — calendar placement rules are not touched; only the drag/refresh timing changes.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, when a save is refused I see exactly which entry is in the way and can open it.
- As a parent, I cannot log a feed during a time the app says the baby slept.
- As a parent who forgot to end the sleep, logging a feed offers to end it at the feed time.

## Functional Requirements

### Must Have (P0)
- [ ] D-016-1 and D-016-2 on the server for create, edit, sleep toggle, sleep start fix and the past-sleep record.
- [ ] D-016-2 client message + `הצג` in the entry sheet, the edit sheet and the quick actions.
- [ ] D-016-3 end-and-log question.
- [ ] D-016-4 calendar drag fix.
- [ ] e2e 003-2 and 008-1 current.

## UI/UX Notes
- The conflict line sits where the sheet shows its save error today, with `הצג` as a small text button after it; from a quick action it is a toast with the same `הצג` action.
- The end-and-log question is the shared confirm dialog (same pattern as plan 015's end-or-keep).

## Atomic Sub-tasks

- [x] O1: Pure conflict rules — `server/domain/tracker/conflicts.js` + `server/domain/tracker/conflicts.test.js` (`findConflict(candidate, events, { now })` → `{ id, eventType, startAt, endAt } | null`, D-016-1 intervals); sleep rules in `sleep.js` use it — server/domain/**
- [x] O2: Routes return `event_conflict` with the blocker and accept `endOpenSleep` on event create — `server/routes/tracker-events.js`, `server/routes/tracker-sleep.js`, repository window query, tests — server/**
- [x] O3: Client message formatter + `הצג` + end-and-log question — `src/app/pages/tracker/**` (entry sheet, edit sheet, quick grid), `src/app/core/**` (formatter, Hebrew texts in `he.ts`), Karma spec — src/app/**
- [x] O4: Calendar drag during refresh — the calendar page / store under `src/app/pages/calendar/**` and `src/app/core/**` per D-016-4, with a Karma test where possible — src/app/**
- [x] O5: UI checks — `e2e/016-1-sleep-conflict-named.spec.ts`, `e2e/016-2-feed-in-sleep.spec.ts`, `e2e/016-3-end-and-log.spec.ts`, `e2e/016-4-drag-after-add.spec.ts`; update 003-2 and 008-1 and any spec that expected `sleep_overlap` / `השינה חופפת לשינה אחרת`; `docs/project/current-state.md` — e2e/**, docs/project/current-state.md

## Technical Considerations
- e2e: one spec file at a time (login rate limit). `addFood` in `e2e/support/calendar.ts` already waits for the create and a quiet page; 016-4 must NOT use that wait (it tests the drag right after the add) — call the add-food sheet directly in the spec.
- `E2E_EXPECT_TIMEOUT` exists for runs against a remote database.

## Out of Scope
Deploy, the Firestore copy (T7), overlap rules between two feeds.

## Critical Questions
- none

## Execution Notes
- pnpm run build -> exit 0; pnpm run lint -> exit 0; pnpm run test -> exit 0 (Karma TOTAL: 83 SUCCESS, server # pass 215 # fail 0)
- node --test conflicts.test.js sleep.test.js tracker-events.test.js tracker-sleep.test.js -> exit 0, # pass 36 # fail 0; node scripts/override-check.mjs -> ok
- e2e 016-1..016-4, 003-2, 008-1: written, not run (no running app, no QA login). 003-2 and 008-1 only got stricter locators (exact label, first match) because I could not run them to see what fails.
- scope extended: none. server/routes/catalog-helpers.js carries the 409 conflict body (server/middleware is outside the scope).
- behaviour: tapping הצג closes the open sheet first (unsaved input is lost) — reverse: drop the beforeShow callback in SaveErrorService.show callers.
