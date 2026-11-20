# Plan checks — baby-tasting

Read by `/plan`'s Architect + PM review through `paths.planChecks` in `kit.config.json`. Apply each line to a draft plan; a line that fails is a finding. Each line names its proof.

## Success criteria
- A plan that touches UI has at least one `[ui]` item (one page, one action, a quoted Hebrew text, a screenshot under `e2e/screens/<NNN>-<n>.png`) and one `[human]` item for how it feels on the phone.
- Checks are `pnpm run build`, `pnpm run lint`, `pnpm run test` and `node --test server/test/<file>`; never `npx`.

## Phone and RTL
- Every touched page fits 360 × 780 with no sideways scroll; proof: `document.documentElement.scrollWidth` equals the screen width.
- A fixed overlay, modal or sheet is centred with `inset: 0` + `margin: auto` (or the shared confirm dialog / sheet), never `translate(-50%)` on an inline axis (it sits off screen in RTL; run-023).
- Touch targets are at least `--touch-target`; CSS uses logical properties only.

## Hebrew text and icons
- Every new string is a key in `src/app/core/i18n/he.ts`, named in the plan's UI/UX Notes.
- Every icon is a slot in `src/app/core/icons/icon-slots.ts` (the `icon-slots` default).
- Colours come only from tokens; proof: `tools/check-no-hex.mjs` (runs in `pnpm run lint`).

## Data and API
- A new persisted field follows `docs/agent/standards-backend.md` and is validated and reconciled in `server/domain/tracker/settings.js` (or its domain file), with a `server/test` case for save, refuse and the default.
- A new `TrackerSettings` field lists in scope every spec that builds a settings object; find them by searching for `quickActionOrder:` in `src/**/*.spec.ts` (run-023: `timeline-row.spec.ts` broke).
- Times are Asia/Jerusalem; routes sit under `/api/v1/`.

## Tests and routes
- e2e specs are named `e2e/<NNN>-<n>-<slug>.spec.ts`, start with the `openLog` helper from `e2e/support/tracker.ts`, and use the real route path from `src/app/app.routes.ts` (tasting pages sit under `/tasting/…`; run-023 opened `/reactions/new` by mistake).
- A moved or renamed control lists every e2e spec that clicks it.

## Reuse Check
- One row per new piece: `- <piece> — family: <id|none> — rung: <1-4> — why: <…>`, or `- none — <why>`; gate: `node scripts/scope-check.mjs --reuse --plan=<path>`.
- Look in `docs/brain/inventory.md` first: the shared confirm dialog (`ConfirmDialogService`), the time picker (`app-datetime24`), sheets, chips and `app-icon` already exist.

## Hotspots
- `src/styles.scss` and `src/app/app.routes.ts` are append-only: a plan adds to them and never rewrites an existing entry.
