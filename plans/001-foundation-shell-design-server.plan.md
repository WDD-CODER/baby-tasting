# Plan 001 — Foundation: app shell, design system, server base and Render file

Status: draft
Depends-on: none
Snapshot: e03b27cb0e8714242e89b859d9030fb2acb4e8d9
Source: docs/briefs/brief-1-foundation.md (product rules: docs/briefs/00-program.md — it wins on any conflict)

## Problem Statement
Every later plan (002–008) builds on one shared shell, one design system and one server base. Without them each plan
would invent its own layout, component, token, error format or database access, and the product could not be merged
into Baby Tracker later (program section 7).

## Goals & Success Criteria
**Primary:** the app opens on a dark RTL shell with four Hebrew tabs, every shared visual piece exists once, and the
server has config validation, a MongoDB repository base, one error format and serves the Angular build.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0 (it now also runs the hex-colour check).
- [auto] `pnpm run test` exits 0 — it now runs the Karma tests and then every server test (`test:server`).
- [auto] `node --test server/test/config.test.js server/test/app.test.js server/test/domain-purity.test.js` exits 0 (run from the repo root; tests resolve paths from `import.meta.url`, never from the working directory): `server/test/config.test.js` (missing `MONGODB_URI` → `loadConfig` throws a message containing `MONGODB_URI`), `server/test/app.test.js` (unknown `GET /api/v1/x` → 404 with body `{ "error": { "code": "not_found", … } }`; `GET /some/page` → the `index.html` of a temporary static folder; `GET /api/v1/health` → `{ "status": "ok", "db": "up" }`) and `server/test/domain-purity.test.js`.
- [auto] `node tools/check-no-hex.mjs --self-test` exits 0 (it proves a hex literal in a temporary `*.scss` and `*.ts` file under a fake `src/app/` fails the check).
- [ui] At 360px width the shell shows the top bar `טעימות` and the four bottom entries `יומן`, `מזונות`, `אלרגנים`, `הגדרות`; tapping `מזונות` opens `/foods` and shows its empty state text `עוד אין כאן כלום`; `html` has `dir="rtl"`.
- [ui] `/dev/components` (development build) shows the heading `רכיבים משותפים` and one section per shared component.
- [human] The look matches Baby Tracker's feel (dark slate, Heebo, indigo accent).

## Execution Mode
- Parallel: no
- Concurrent plans: none (plans 002–008 run after it in the same orchestrator run)
- Isolated DB: no
- Reviewer: gate

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).
This plan is the one that creates `src/styles.scss` content and the route skeleton, so it may rewrite both freely.

```scope
DESIGN.md
render.yaml
docs/brain/invariants.md
docs/project/product-defaults.md
docs/project/current-state.md
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
angular.json
kit.config.json
.gitignore
playwright.config.ts
e2e/**
tools/**
src/index.html
src/styles.scss
src/styles/**
src/environments/**
src/app/**
server/**
server/test/**
src/app/app.spec.ts
e2e/screens/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

`docs/brain/invariants.md` holds only the kit's template today; this plan writes the real invariants (A3).

- INV-none: preserves — no invariant exists yet; this plan creates INV-1 … INV-6 and follows each of them from the start.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, I open the app on my phone and see a calm dark Hebrew screen with four clear tabs.
- As a later plan's builder, I find every visual piece, the API client, the dictionary and the server base already in
  place, so I only add my feature.

## Functional Requirements

### Must Have (P0)
- [ ] Playwright harness from branch `origin/chore/e2e-harness` merged in (it is approved work that did not reach `main`).
- [ ] `DESIGN.md`, `docs/brain/invariants.md`, `docs/project/product-defaults.md` written as below.
- [ ] Tokens, Heebo font, shell, four routes with empty states, Hebrew dictionary, 13 shared components, unsaved-changes guard, API client, toast and confirm services.
- [ ] Server: config module, MongoDB connection + repository base, error format, request log, audit helper, static serving with SPA fallback, CORS for local dev, health with DB status, `render.yaml`, `.env.example`.
- [ ] Hex-colour check wired into `pnpm run lint`.

## UI/UX Notes
- Hebrew only, RTL, dark only. Every string comes from `src/app/core/i18n/he.ts`.
- Layout at 360px first; logical CSS properties only (`margin-inline-start`, `padding-block`, `inset-inline-end`, …).
- Touch targets ≥ 44px; card radius 16px, sheet radius 24px.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Bring in the approved end-to-end test harness so every later plan can write its UI checks — run `git fetch origin chore/e2e-harness` and `git merge --no-ff origin/chore/e2e-harness` (adds `playwright.config.ts`, `e2e/smoke.spec.ts`, `e2e/README.md`, scripts `e2e` and `test:server`, `commands.e2e` in `kit.config.json`, `serve.defaultConfiguration: local` in `angular.json`, `.gitignore` lines); resolve nothing by hand — it merges cleanly on `main`; if it does not, ESCALATE — package.json, pnpm-lock.yaml, angular.json, kit.config.json, .gitignore, playwright.config.ts, e2e/**
- [ ] A2: Write the design rule book every reviewer checks against — `DESIGN.md` from program section 6: the token table (name → value → use), typography (Heebo 400/500/700/800 via `@fontsource/heebo`, sizes as tokens), spacing scale tokens (`--space-1` 4px … `--space-8` 48px), radius (`--radius-card` 16px, `--radius-sheet` 24px, `--radius-pill` 999px), touch target 44px, allergen marking (accent ring = 2px `--color-accent-border`; badge = 18px circle at the item's inline-end top corner; introducing = `--color-tier-okay`, maintenance = `--color-tier-good`, locked = `--color-tier-bad` with 🔒, alert = `--color-tier-bad`), item states (planned outline, given filled + ✓, skipped 50% opacity + line-through, suggested dashed outline), the shared component list with their inputs, do/don't list, and a section `## Open design decisions` where each choice this plan makes that section 6 does not cover gets one line `- D-n: <choice> — reverse: <how>` (the Human reviews these) — DESIGN.md
- [ ] A3: Record the architecture rules the gate enforces — replace the template section of `docs/brain/invariants.md` (keep the header text and the parsed shape `## INV-n — title` + five `- Field:` lines) with: INV-1 domain rules are pure functions in `server/domain/` (no express/mongodb/repository/clock import; Touches `server/domain/**`; Test `server/test/domain-purity.test.js`); INV-2 database access only through `server/repositories/` (Touches `server/routes/**`, `server/domain/**`, `server/middleware/**`, `server/repositories/**`; Test `server/test/domain-purity.test.js` also asserts no file under `server/routes/` or `server/middleware/` imports `mongodb`); INV-3 one authentication middleware sets `req.user` and `req.householdId` (Touches `server/middleware/**`, `server/routes/**`; Test none until plan 002); INV-4 REST under `/api/v1/`, plain JSON, calendar days `YYYY-MM-DD`, moments ISO timestamps (Touches `server/routes/**`, `src/app/core/services/**`; Test `server/test/app.test.js`); INV-5 design tokens keep the Baby Tracker names and no colour literal outside `src/styles/tokens.scss` (Touches `src/styles/**`, `src/styles.scss`, `src/app/**/*.scss`; Test `tools/check-no-hex.mjs`); INV-6 an allergen food is only ever in meal 1 (R4) — enforced on the server, mirrored in the UI (Touches `server/domain/**`, `server/routes/calendar*`, `src/app/pages/calendar/**`; Test none until plan 004). Source line for each: `docs/briefs/00-program.md §7` or `§4 R4` — docs/brain/invariants.md
- [ ] A4: Write the standing product behaviours once so no plan repeats them — `docs/project/product-defaults.md` = program section 8 as a checklist, each item naming the shared piece that implements it (unsaved changes → `unsavedChangesGuard` + `HasUnsavedChanges`; destructive → `ConfirmDialogService.confirm({ destructive: true })`; audit → `server/lib/audit.js`; empty/loading/error → `app-empty-state`, `app-loading-state`, `app-error-state`; 360px; one dictionary `src/app/core/i18n/he.ts`); also refresh `docs/project/current-state.md` to say what now exists — docs/project/product-defaults.md, docs/project/current-state.md
- [ ] A5: Define every colour, size and font once as tokens so screens never hard-code a value — `src/styles/tokens.scss` with `:root` custom properties: `--color-canvas #020617`, `--color-surface #0f172a`, `--color-surface-raised #1e293b`, `--color-text #f1f5f9`, `--color-text-secondary #94a3b8`, `--color-border #334155`, `--color-accent #4f46e5`, `--color-accent-border` (= `#6366f1` at 30% opacity), `--color-tier-bad #E5484D`, `--color-tier-okay #F5A623`, `--color-tier-good #46A758`, `--color-tier-great #30A46C`, `--color-cat-nutrition #F6C9A8`, `--font-family` (`'Heebo', system-ui, sans-serif`), font-size tokens, spacing, radius, `--touch-target 44px`, `--shadow-sheet`; `src/styles.scss` imports `@fontsource/heebo/{400,500,700,800}.css` and the tokens, sets `body` background/colour/font, `color-scheme: dark`, and keeps the conventions' breakpoint Sass variables; add `@fontsource/heebo` to `package.json` — src/styles/tokens.scss, src/styles.scss, package.json
- [ ] A6: Fail the lint when a colour literal sneaks into a screen — `tools/check-no-hex.mjs`: scans `src/app/**/*.{scss,ts,html}` for `#[0-9a-fA-F]{3,8}\b` used as a colour (and `rgb(`/`hsl(` literals), prints `file:line` per hit and exits 1; `--self-test` builds a temp tree with one bad `.scss` and one bad `.ts` and asserts exit 1, and a clean tree exit 0; change the `lint` script to `ng lint && node tools/check-no-hex.mjs` — tools/check-no-hex.mjs, package.json
- [ ] A7: Put all Hebrew text in one dictionary file so no template holds an inline string — `src/app/core/i18n/he.ts` exporting `export const HE = { app: { name: 'טעימות' }, nav: { calendar: 'יומן', foods: 'מזונות', allergens: 'אלרגנים', settings: 'הגדרות' }, common: { save: 'שמירה', cancel: 'ביטול', confirm: 'אישור', delete: 'מחיקה', archive: 'העברה לארכיון', retry: 'לנסות שוב', loading: 'טוען…', errorGeneric: 'משהו השתבש. נסו שוב.', errorNetwork: 'אין חיבור לשרת', empty: 'עוד אין כאן כלום', unsavedTitle: 'יש שינויים שלא נשמרו', unsavedBody: 'לצאת בלי לשמור?', unsavedLeave: 'לצאת', unsavedStay: 'להישאר' }, pages: { … one `emptyTitle` and `emptyAction` per page }, dev: { componentsTitle: 'רכיבים משותפים' } } as const` and a typed accessor if useful; templates read `HE.*` through a component field — src/app/core/i18n/he.ts
- [ ] A8: Build the shared visual pieces once, each with inputs for its variants — standalone components under `src/app/shared/ui/<name>/` (`<name>.ts`, `.html`, `.scss`, selector `app-<name>`), signal inputs (`input()`, `output()`, no decorators): `button` (variant primary|secondary|ghost|danger, size md|lg, disabled, loading, full-width), `icon-button` (icon text/emoji, aria-label required, variant), `card`, `bottom-sheet` (open signal, title, closes on backdrop and Escape, focus trap, 24px top radius, slides from block-end), `chip` (tone neutral|accent|okay|good|bad, selected, removable), `alert-strip` (list of `{ id, tone, text, actionLabel? }`, emits `act(id)`; compact, horizontally scrolls inside itself only), `confirm-dialog` (title, body, confirmLabel, cancelLabel, destructive), `empty-state` (icon, title, one action label → output), `loading-state` (skeleton or spinner + `HE.common.loading`), `error-state` (message + retry output), `text-field` (label, hint, error, type, `ControlValueAccessor`), `select` (label, options, `ControlValueAccessor`), `toast` (host that renders `ToastService` messages, tone, auto-hide 4 s) — src/app/shared/ui/**
- [ ] A9: Give confirmation, toasts and leave-protection one code path each — `src/app/core/services/confirm-dialog.service.ts` (`confirm(opts): Promise<boolean>`, renders the shared `confirm-dialog` through one host in the shell), `toast.service.ts` (signal list, `show(text, tone)`), `src/app/core/guards/unsaved-changes.guard.ts` (`export interface HasUnsavedChanges { hasUnsavedChanges(): boolean }`, `unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges>` asking with `HE.common.unsaved*`; also a `beforeunload` helper) with specs — src/app/core/services/**, src/app/core/guards/**
- [ ] A10: Talk to the server through one client with one error path — `src/app/core/services/api.service.ts`: `get/post/put/patch/delete<T>(path, body?)` on `HttpClient` with base `environment.apiUrl + '/api/v1'` and `withCredentials: true`; every failure becomes `ApiError { status, code, message }` (server `{ error: { code, message } }`, or `network` with `HE.common.errorNetwork`); `provideHttpClient(withFetch())` in `app.config.ts`; spec with `HttpTestingController` — src/app/core/services/api.service.ts, src/app/core/models/api-error.ts, src/app/app.config.ts
- [ ] A11: Build the app shell and the four empty pages so the app has its final navigation — `src/app/layout/shell/` (top bar: `HE.app.name` and a baby slot fed by `ShellService.babyLabel` signal, empty for now; bottom navigation with the four `HE.nav` entries, `routerLinkActive`, emoji icons 📅 🍎 ⚠️ ⚙️, safe-area padding; hosts toast + confirm dialog); `src/app/core/services/shell.service.ts`; routes in `src/app/app.routes.ts`: `''` → `pages/calendar`, `foods` → `pages/foods`, `allergens` → `pages/allergens`, `settings` → `pages/settings`, each lazy (`loadComponent`) and rendering `app-empty-state` with its `HE.pages.*` text; wildcard → `''`; remove `pages/placeholder`; update `src/app/app.spec.ts` — src/app/layout/**, src/app/pages/**, src/app/app.routes.ts, src/app/app.ts, src/app/app.html, src/app/app.spec.ts
- [ ] A12: Add a development-only page that shows every shared piece in every variant — `src/app/dev/components-demo/components-demo.ts` at route `dev/components`, registered only when `!environment.production` (environment files get `production` already); heading `HE.dev.componentsTitle`, one `<section>` per component with every variant — src/app/dev/**, src/app/app.routes.ts, src/environments/**
- [ ] A13: Move the server to its final layout and validate its environment at start — move `server/src/app.js` → `server/app.js`, `server/src/index.js` → `server/index.js` (update `server/package.json` scripts `dev`, `start`); in the root `package.json` set `"test": "ng test --watch=false --browsers=ChromeHeadless && pnpm run test:server"` and `"test:server": "pnpm --dir server install --frozen-lockfile --prefer-offline && pnpm --dir server test"`, so the gate's `pnpm run test` also runs every server test of every plan; `server/config.js` `loadConfig(env = process.env)` returns `{ port, nodeEnv, mongodbUri, sessionSecret, appUsers[], allowedOrigins[], staticDir, cloudinary: { cloudName, apiKey, apiSecret } | null }`; required: `MONGODB_URI` always, `SESSION_SECRET` and `APP_USERS` when `NODE_ENV=production`; throws `ConfigError` whose message names every missing variable; `index.js` prints it and exits 1; `STATIC_DIR` default `<repo>/dist/baby-tasting/browser` — server/app.js, server/index.js, server/config.js, server/package.json, server/src/**, package.json
- [ ] A14: Give the server one database connection and one repository base so routes never touch the driver — add `mongodb` (native driver) and dev `mongodb-memory-server` to `server/package.json`; `server/repositories/db.js` (`connect(uri)` → `{ client, db }`, `close()`); `server/repositories/base-repository.js` (`class BaseRepository { constructor(db, name) }` with household-scoped `findMany(householdId, filter, opts)`, `findOne`, `insertOne(householdId, doc, user)`, `updateOne(householdId, id, patch, user)`, `deleteOne`, all adding `householdId` to every filter and audit fields through `server/lib/audit.js`); `server/lib/audit.js` (`withCreateAudit(doc, user, now)` sets `createdBy`, `updatedBy`, `createdAt`, `updatedAt`; `withUpdateAudit`); `server/domain/README.md` stating INV-1 — server/repositories/**, server/lib/**, server/domain/README.md, server/package.json, server/pnpm-lock.yaml
- [ ] A15: Answer every failure in one JSON shape and log every request — `server/lib/http-error.js` (`HttpError(status, code, message)`), `server/middleware/error-handler.js` (HttpError → its status; anything else → 500 `{ error: { code: 'internal', message: 'Internal error' } }`, logs the stack), `server/middleware/not-found.js` for `/api/*`, `server/middleware/request-logger.js` (method, path, status, ms — no bodies, no cookies), `helmet` (CSP allowing self, `data:` images, inline styles Angular needs), `express.json({ limit: '100kb' })`, CORS (`cors` package) only for `ALLOWED_ORIGIN`/`allowedOrigins` with `credentials: true`; `server/routes/health.js` → `{ status: 'ok', db: 'up' | 'down' }` (ping) — server/lib/**, server/middleware/**, server/routes/**, server/app.js
- [ ] A16: Serve the Angular build from the same server so one Render service hosts everything — in `createApp({ config, db })` after `/api` routes: `express.static(staticDir)` and a GET fallback that sends `index.html` for any non-`/api` path; tests in `server/test/app.test.js` and `server/test/config.test.js` using a temp static folder and `mongodb-memory-server` (never the development database); `server/test/domain-purity.test.js` scans `server/domain/**/*.js` for imports of `express`, `mongodb`, `mongoose`, `../repositories` and `Date.now`/`new Date()` without an argument, and `server/routes/**` + `server/middleware/**` for `mongodb` imports; delete `server/test/health.test.js` (folded into server/test/app.test.js) — server/app.js, server/test/**
- [ ] A17: Describe the production service and every environment variable — `render.yaml` (one `web` service, `runtime: node`, `buildCommand: corepack enable && pnpm install --frozen-lockfile && pnpm --dir server install --frozen-lockfile && pnpm run build`, `startCommand: node server/index.js`, `healthCheckPath: /api/v1/health`, `envVars` with keys only (`sync: false`): `MONGODB_URI`, `SESSION_SECRET`, `APP_USERS`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NODE_ENV` value `production`); `server/.env.example` listing every variable with a one-line comment, `MONGODB_URI=mongodb://localhost:27017/baby-tasting-dev`, `APP_USERS=parent-a,parent-b` (development placeholders), `SESSION_SECRET=change-me`, `ALLOWED_ORIGIN=http://localhost:4200` — render.yaml, server/.env.example
- [ ] A18: Write the UI checks for the shell and the demo page — `e2e/001-1-shell.spec.ts` and `e2e/001-2-components.spec.ts` per job-validation Tier 1b, screenshots `e2e/screens/001-1.png`, `e2e/screens/001-2.png`; keep `e2e/smoke.spec.ts` passing — e2e/**

## Technical Considerations
- Dependencies: new `@fontsource/heebo`, `@angular/cdk` (bottom sheet focus trap via `cdkTrapFocus`; plan 004 needs CDK drag-drop anyway); server `mongodb`, `helmet`, `cors`, dev `mongodb-memory-server`. All approved by this plan.
- New files needed: listed per sub-task.
- Model changes: `ApiError`.
- Backend / API: `GET /api/v1/health` gains `db`; 404 JSON for unknown `/api/*`; static + SPA fallback.
- Auth and validation: none yet (plan 002). Config validation fails fast.
- Security surface: helmet headers, JSON body cap 100 kB, CORS restricted to configured origins, no secrets in code, `.env` stays gitignored.
- Data / migration: none (connection only).

## Backend Impact
- Collections affected: none
- New collections: no
- Server changes needed: yes — config, connection, repository base, error format, logging, static serving.

## Out of Scope
Sign-in, any domain data, the calendar, real content in the four pages, Cloudinary calls, deploying.

## Critical Questions
- none

## Execution Notes
- Planner decision (Human pre-approved overnight run, 2026-11-15): design gaps are decided here and logged under `DESIGN.md` → `## Open design decisions` instead of stopping.
- Planner decision: native `mongodb` driver (no Mongoose); tests use `mongodb-memory-server`.
- Planner decision: server code lives at `server/*.js`, `server/routes/`, `server/middleware/`, `server/repositories/`, `server/domain/`, `server/lib/` (the kit's sensitive paths are `server/middleware/**` and `server/routes/auth.js`).
