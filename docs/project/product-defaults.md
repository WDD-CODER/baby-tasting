# Product defaults — standing behaviours on every screen

Source: `docs/briefs/00-program.md` section 8. Each item names the shared piece that implements it; a plan uses the piece and never rebuilds it.

- [ ] **Unsaved changes ask before leaving.** A form page implements `HasUnsavedChanges` and registers `unsavedChangesGuard` (`src/app/core/guards/unsaved-changes.guard.ts`) as `canDeactivate`; for closing the tab use `warnBeforeUnload`.
- [ ] **Destructive actions ask first.** Delete, archive and releasing a lock call `ConfirmDialogService.confirm({ destructive: true })` (`src/app/core/services/confirm-dialog.service.ts`), rendered by the shell's `app-confirm-dialog`.
- [ ] **Every create / update / delete records who and when.** The server uses `server/lib/audit.js` (`withCreateAudit`, `withUpdateAudit`) through `BaseRepository`; no repository writes without it.
- [ ] **Every list has an empty state with one action.** Use `app-empty-state`.
- [ ] **Every request has loading and error states in Hebrew.** Use `app-loading-state` and `app-error-state`; errors come from `ApiService` as `ApiError` with a Hebrew `message` for network failures.
- [ ] **Every screen works at 360px.** Layout at 360px first; nothing scrolls horizontally except the week view when it must; touch targets are at least 44px (`--touch-target`).
- [ ] **All UI strings live in one dictionary.** `src/app/core/i18n/he.ts` (`HE`); templates read it through a component field, never inline text.
- [ ] **Colours only from tokens.** `src/styles/tokens.scss`; `tools/check-no-hex.mjs` runs inside `pnpm run lint`.
- [ ] **Short feedback uses the toast.** `ToastService.show(text, tone)`, rendered by `app-toast` in the shell.
