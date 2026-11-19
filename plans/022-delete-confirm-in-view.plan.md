# Plan 022 — Deleting from the timeline asks in a dialog the parent can see

Status: draft
Depends-on: none
Snapshot: 8789dbf1450cc045f174947f0b6baf4615804c9a
Source: the Human, 2026-11-19: "There is a problem removing items from my live render application … I'm trying to remove items from the timeline and it's not working. It's not responding." Reproduced by the Planner the same day on the production build of `8789dbf` (iPhone 13 size, 390×664 visible): after tapping `מחק אירוע` at the bottom of the edit sheet, the confirmation strip (`האם למחוק את האירוע הזה?` · `מחק` · `ביטול`) is drawn below the button at y = 709, outside the 664 px screen, and the sheet does not scroll to it — so nothing visible happens. Tapping `מחק` in the strip deletes correctly (server and refresh work; no console error).

## Problem Statement
On a phone, deleting a Tracker event from the timeline looks dead: the question it asks appears off screen. Delete itself works.

## Decisions
- **D-022-1 (Planner)** The question moves from the inline strip to the shared confirm dialog (`ConfirmDialogService.confirm({ destructive: true })`, rendered centred by the shell's `app-confirm-dialog`), as the `confirm-destructive-action` default (on since 2026-11-18) names. Title `האם למחוק את האירוע הזה?`, buttons `מחק` (danger) and `ביטול`. Cancel does nothing. After `מחק` the event is deleted and the existing toast with `ביטול` (undo) shows, as today.
- **D-022-2 (Planner)** Nothing else in the sheet changes.

## Goals & Success Criteria
**Primary:** on a phone, tapping `מחק אירוע` shows the question on screen, and confirming deletes the event.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0.
- [ui] `e2e/012-4-delete.spec.ts` at 390×664 (iPhone 13 visible height): open a timeline row, tap `מחק אירוע`; the dialog `האם למחוק את האירוע הזה?` is inside the viewport without scrolling; `ביטול` in the dialog keeps the row; tapping `מחק אירוע` again and `מחק` removes the row; the toast's `ביטול` brings it back. Screenshot `e2e/screens/012-4.png`.
- [ui] `e2e/016-1-sleep-conflict-named.spec.ts` still passes (it opens the same edit sheet).
- [human] the page with the delete button · press delete, then cancel · a confirmation appears and nothing is removed (here: `/timeline`, open an event, `מחק אירוע`; then delete for real and the event is gone)

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
src/app/pages/tracker/entry-sheet/**
e2e/012-4-delete.spec.ts
e2e/016-1-sleep-conflict-named.spec.ts
e2e/screens/012-4.png
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-5: preserves — the strip's styles are removed; no colour is added.
- INV-none: preserves — client-only change in one component; no server, route or domain file.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent on my phone, when I delete an entry I see the question and can confirm it.

## Functional Requirements

### Must Have (P0)
- [ ] The delete question is a centred dialog, visible on a phone without scrolling.

## Reuse Check
- none — uses the existing `ConfirmDialogService` and `app-confirm-dialog`; no new piece.

## Defaults
- confirm-destructive-action — applies — how: src/app/core/services/confirm-dialog.service.ts (ConfirmDialogService.confirm({ destructive: true }))

## UI/UX Notes
- Texts stay as they are (`HE.tracker…deleteStrip`, `deleteYes`, `deleteNo`); the strip's markup and its `es__confirm*` styles go.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] F1: Ask the delete question in the shared centred dialog so a phone shows it — askDelete awaits ConfirmDialogService.confirm with title deleteStrip, confirmLabel deleteYes, cancelLabel deleteNo, destructive true; on true run the existing delete; remove the deleteAsk signal, the strip markup and its styles — src/app/pages/tracker/entry-sheet/entry-sheet.ts, src/app/pages/tracker/entry-sheet/entry-sheet.html, src/app/pages/tracker/entry-sheet/entry-sheet.scss
- [ ] F2: Replay the phone bug in the delete test so it cannot come back — 012-4 at 390×664 with the in-viewport assertion, cancel then confirm, as in the success criteria; keep 016-1 passing — e2e/012-4-delete.spec.ts, e2e/016-1-sleep-conflict-named.spec.ts

## Technical Considerations
- Dependencies: the entry sheet already uses `ConfirmDialogService` for ending a sleep, so the dialog draws above the bottom sheet.
- New files needed: none.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none.
- Project checks: none (`docs/project/plan-checks.md` does not exist).

## Out of Scope
- Other inline confirmation strips elsewhere in the app.
- The look of the edit sheet.

## Critical Questions
- none

## Execution Notes
- none yet
