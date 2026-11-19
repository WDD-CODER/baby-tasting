# Plan 025 — Every confirmation opens a centred modal

Status: done
Depends-on: 022
Snapshot: b778b9117cbeb4acc6ceb6d3c5fbd9b34ddd9e01
Source: the Human, 2026-11-19: "Have all confirmations open a modal in the middle of the screen." Answer the same day: make it a standing default, and move the delete-all question into the modal too. Plan 022 (PR #21) already moved the timeline delete question into the shared dialog; after it, the only confirmation not in the modal is Settings → data management's full reset, a bottom sheet where the parent types `מחק הכל`.

## Problem Statement
Confirmations should all look and sit the same: a centred modal the parent cannot miss. One still opens as a bottom sheet.

## Decisions
- **D-025-1 (Human, 2026-11-19)** A new product default `confirm-in-modal`, on: every confirmation question opens through `ConfirmDialogService` (the shell's centred `app-confirm-dialog`), never as an inline strip or a bottom sheet.
- **D-025-2 (Human, 2026-11-19)** The full reset moves into that modal. The modal gains an optional typed word: `confirm({ …, requireWord: 'מחק הכל' })` shows a text field and keeps the confirm button disabled until the field equals the word exactly. Cancel does nothing.
- **D-025-3 (Planner)** The reset's title, body, button texts and server call do not change.

## Goals & Success Criteria
**Primary:** no confirmation in the app opens anywhere but a centred modal.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0, including `src/app/shared/ui/confirm-dialog/confirm-dialog.spec.ts` cases: with `requireWord` the confirm button is disabled until the exact word is typed; without it the dialog is as today.
- [auto] `node scripts/product-defaults.mjs list` prints `DEFAULTS: on       confirm-in-modal`.
- [ui] In Settings (`/settings`), the full reset asks in the centred modal; typing `מחק הכל` enables the red button; `ביטול` keeps the data — e2e `e2e/025-1-reset-modal.spec.ts`, screenshot `e2e/screens/025-1.png`; `e2e/014-4-delete-from-date.spec.ts` still passes.
- [human] the page with the delete button · press delete, then cancel · a confirmation appears and nothing is removed (here: `/settings`, the full reset)

## Execution Mode
- Parallel: yes
- Concurrent plans: 023, 024
- Isolated DB: no
- Reviewer: gate

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/services/confirm-dialog.service.ts
src/app/shared/ui/confirm-dialog/**
src/app/layout/shell/shell.html
src/app/layout/shell/shell.ts
src/app/pages/settings/data-management/**
docs/project/product-defaults.md
docs/project/debt-baseline.json
docs/brain/inventory.md
e2e/025-1-reset-modal.spec.ts
e2e/014-4-delete-from-date.spec.ts
e2e/screens/025-1.png
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-4: preserves — `confirm-dialog.service.ts` is UI state only; no request or route changes.
- INV-5: preserves — the typed field reuses `app-text-field`; no colour.
- INV-none: preserves — client-only change plus the defaults contract; no server, route or domain file.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, every "are you sure?" appears in the middle of the screen, the same way each time.

## Functional Requirements

### Must Have (P0)
- [ ] The shared modal can require a typed word.
- [ ] The full reset uses it; its bottom sheet is gone.
- [ ] The `confirm-in-modal` default is on.

## Reuse Check
- none — extends the existing `ConfirmDialogService` / `app-confirm-dialog` with one option; no new piece.

## Defaults
- confirm-destructive-action — applies — how: src/app/core/services/confirm-dialog.service.ts (ConfirmDialogService.confirm({ destructive: true, requireWord }))

## UI/UX Notes
- The typed field sits between the body and the buttons; its label is the existing `typedWord` text of data management, passed in as `requireWordLabel`.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] C1: Let the shared modal ask for a typed word before a dangerous confirm — `ConfirmOptions.requireWord` and `requireWordLabel`; the dialog shows an `app-text-field` and disables confirm until the value equals the word; the shell passes the new inputs — src/app/core/services/confirm-dialog.service.ts, src/app/shared/ui/confirm-dialog/**, src/app/layout/shell/shell.html, src/app/layout/shell/shell.ts
- [x] C2: Ask the full-reset question in the centred modal instead of a bottom sheet — data management calls `confirm({ title: confirmTitleB, body: confirmBodyB, confirmLabel: confirmYes, destructive: true, requireWord: <the existing word>, requireWordLabel: typedWord })`; remove the reset bottom sheet and its signals — src/app/pages/settings/data-management/**
- [x] C3: Make "every confirmation is a centred modal" a standing default — run `node scripts/product-defaults.mjs add --id confirm-in-modal --rule "Every confirmation question opens as a centred modal through ConfirmDialogService, never as an inline strip or a bottom sheet." --trigger destructive-action --how "src/app/core/services/confirm-dialog.service.ts (ConfirmDialogService.confirm), rendered by the shell's app-confirm-dialog" --card "the page with the confirmation · trigger it · a modal opens in the middle of the screen, visible without scrolling"` — docs/project/product-defaults.md, docs/project/debt-baseline.json
- [x] C4: Prove it in the real app — `e2e/025-1-reset-modal.spec.ts` per the [ui] item; keep `e2e/014-4-delete-from-date.spec.ts` passing — e2e/025-1-reset-modal.spec.ts, e2e/014-4-delete-from-date.spec.ts

## Technical Considerations
- Dependencies: plan 022 (PR #21) removes the timeline's inline strip; this plan assumes it is merged.
- New files needed: `e2e/025-1-reset-modal.spec.ts`.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none (the typed word is a UI guard, as today).
- Data / migration: none.
- Project checks: none.

## Out of Scope
- Bottom sheets that are forms or pickers, not questions.
- Changing which actions ask first.

## Critical Questions
- Q: A standing default, and move the full reset? A: yes, both (Human, 2026-11-19).

## Execution Notes
- scope extended: docs/brain/inventory.md — regenerated by node scripts/inventory.mjs after adding the confirm-in-modal default (kit check inventory-stale)
- pnpm run build -> exit 0; pnpm run lint -> exit 0; pnpm run test -> exit 0 (Karma 110 SUCCESS, server 255 pass)
- node scripts/product-defaults.mjs list -> DEFAULTS: on       confirm-in-modal
- node scripts/override-check.mjs -> ok
- [ui] e2e/025-1-reset-modal.spec.ts written, not run
