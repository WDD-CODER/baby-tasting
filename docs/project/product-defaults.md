# Product defaults — standing behaviours on every screen

Source: `docs/briefs/00-program.md` section 8. Each default names the shared piece that implements it; a plan uses the
piece and never rebuilds it.

This project owns this file: the kit never updates it. Only the Human turns a default `on`. A `proposed` or `off` default
is ignored by every check; an `on` default is added to every plan that triggers it, built through the piece in `how`,
and checked by its `check` (a card, or a rule `node scripts/kit-checks.mjs` runs on the diff). Before turning one on,
record the existing gaps: `node scripts/debt-baseline.mjs --add-kind default.<id>`.

Fields per default: `status` (`proposed` | `on` | `off`), `rule`, `applies when` (`editable-form`, `write-endpoint`,
`list`, `destructive-action` or `screen`), `how`, `check`, `card`, `exceptions` (a plan declares one under
`## Defaults` as `- <id> — exception — why: <one line>`).

### unsaved-changes-on-leave

- status: proposed
- rule: A form page with changes asks before the user leaves it, and also warns before the tab is closed.
- applies when: editable-form
- how: src/app/core/guards/unsaved-changes.guard.ts (the page implements HasUnsavedChanges and registers unsavedChangesGuard as canDeactivate; warnBeforeUnload for closing the tab)
- check: card
- card: the form's page · change one field, then follow a link out of the page · a question asks whether to leave or stay
- check: files: src/app/**/*.ts; trigger: \b(?:FormGroup|FormBuilder|FormControl|NgForm|ngModel)\b; evidence: {stem}[\s\S]{0,300}canDeactivate\s*:; in: src/app/app.routes.ts; exclude: **/*.spec.ts
- exceptions: a read-only form, a search box or a filter bar; declare `exception — why: <one line>`

### confirm-destructive-action

- status: on
- rule: Delete, archive and releasing a lock ask the user to confirm first, and do nothing on cancel.
- applies when: destructive-action
- how: src/app/core/services/confirm-dialog.service.ts (ConfirmDialogService.confirm({ destructive: true }), rendered by the shell's app-confirm-dialog)
- check: card
- card: the page with the delete button · press delete, then cancel · a confirmation appears and nothing is removed
- exceptions: an undo that restores the item at once; declare `exception — why: <one line>`
- turned on: the Human, 2026-11-18

### audit-on-write

- status: on
- rule: Every create, update and delete records who made it and when.
- applies when: write-endpoint
- how: server/lib/audit.js (withCreateAudit, withUpdateAudit) through BaseRepository in server/repositories/base-repository.js; no repository writes without it
- check: files: server/repositories/*-repository.js; trigger: \bclass\s+\w+Repository\b; evidence: \bextends\s+(?:BaseRepository|CatalogRepository)\b|\bwith(?:Create|Update)Audit\b; exclude: server/repositories/base-repository.js
- exceptions: a repository that only reads, or a system record with no user; declare `exception — why: <one line>`
- turned on: the Human, 2026-11-18

### empty-state-on-list

- status: proposed
- rule: Every list with no items shows an empty state with one action, never a blank area.
- applies when: list
- how: app-empty-state
- check: card
- card: the list's page with no items · open the page · a message says the list is empty and offers one action
- exceptions: a list that is never empty; declare `exception — why: <one line>`

### loading-and-error-states

- status: proposed
- rule: Every request shows a loading state, and a readable Hebrew error when it fails.
- applies when: screen
- how: app-loading-state and app-error-state; errors come from ApiService as ApiError with a Hebrew message for network failures
- check: card
- card: the screen's page with the data request failing · open the page · a Hebrew error appears, not a blank page
- exceptions: a static screen with no data request; declare `exception — why: <one line>`

## Standing rules no trigger covers

These hold on every screen. The kit's defaults have no trigger for them, so they are not added to plans automatically;
the plan reviewer and the project's own checks keep them.

- **Every screen works at 360px.** Layout at 360px first; nothing scrolls horizontally except the week view when it must; touch targets are at least 44px (`--touch-target`).
- **All UI strings live in one dictionary.** `src/app/core/i18n/he.ts` (`HE`); templates read it through a component field, never inline text.
- **Colours only from tokens.** `src/styles/tokens.scss`; `tools/check-no-hex.mjs` runs inside `pnpm run lint`.
- **Short feedback uses the toast.** `ToastService.show(text, tone)`, rendered by `app-toast` in the shell.

### icon-slots

- status: on
- rule: Every icon in the app sits in a named slot that parents can change in Settings, icons; a fixed icon needs a written reason.
- applies when: custom
- plan words: \bicons?\b|app-icon
- how: src/app/shared/ui/icon/icon.ts with a slot from src/app/core/icons/icon-slots.ts (then node server/lib/gen-icon-names.mjs); a fixed icon carries an icon-slot-exception comment in its template
- check: files: src/app/**/*.html; trigger: <app-icon\b(?![^>]*\bslot\b); evidence: icon-slot-exception; exclude: src/app/pages/settings/icon-picker-sheet/**
- exceptions: the icon picker itself, which shows every icon by name; a control icon such as show-password, with an icon-slot-exception comment
- turned on: the Human, 2026-11-18

### undo-instead-of-confirm

- status: on
- rule: A quick record or quick change saves at once and shows a toast with an undo button instead of asking first; only deleting, archiving or releasing a lock asks for confirmation.
- applies when: custom
- plan words: \bquick[- ]?(?:log|record|action|add)\b|\bone tap\b|\bbulk\b|\bmark(?:s|ed)?\b.{0,40}\bgiven\b
- how: ToastService.show(text, tone, { label, run }) in src/app/core/services/toast.service.ts, as TrackerEventsService.showUndo does
- check: card
- card: the page with the quick action · tap it, then tap the undo button in the toast · it is saved at once, and after undo it is gone again
- exceptions: a change that cannot be undone safely; declare exception — why: <one line>
- turned on: the Human, 2026-11-18
