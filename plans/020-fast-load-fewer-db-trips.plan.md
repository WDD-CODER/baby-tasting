# Plan 020 — The app loads and answers fast: small icon font, compressed and cached files, fewer database trips

Status: draft
Depends-on: none
Snapshot: 8891a87766721fc268088e5192f42d8d51cbd569
Source: the Human, 2026-11-18: "run a full optimization report and then refactor accordingly so the app will run as fast as possible, because now it is really really slow". Report measured by the Planner the same day on the production build of `8891a87`, served locally against the dev database.

## Problem Statement
The app is slow to open and slow to answer. Measured:

| Finding | Measured |
| --- | --- |
| The icon font is the full Material Symbols set | 5,438,332 bytes on the first visit |
| The server compresses nothing | first-load scripts 416 kB (116 kB with brotli); all scripts 899 kB (243 kB) |
| Built files are not cached by the browser | `Cache-Control: public, max-age=0` on every script, style and font |
| The home screen polls every 5 s | 2 requests, up to 400 events, 4 database trips per 5 s per open phone |
| The session is read from the database on every request | 1 trip ≈ 70 ms (this PC → Atlas) |
| Every Tasting request re-checks the built-in catalog | 3 extra trips in a row ≈ 210 ms per request |
| The statistics page loads the events six times | 6 requests → 18 database trips per open or range change |
| Small waste | two identical 1.14 MB app icons; the full icon-name list (52 kB of source) is in the first script |

## Decisions
- **D-020-1 (Human, 2026-11-18)** Home data refreshes every 15 s, when the parent returns to the app, and after the parent's own save. Clocks and countdowns still tick every 5 s.
- **D-020-2 (Human approved the plan with it, 2026-11-18)** The app ships a small icon font holding only the icons it uses by default. The full font downloads only when the icon picker opens, or when the household has an icon override that is not in the small font.
- **D-020-3 (Planner)** Session memory and catalog memory live in the server process (Render runs one instance, `WEB_CONCURRENCY=1`). Sign-out and "reset parent B" remove the remembered session at once.
- **D-020-4 (Planner)** No screen shows anything different, the CSP in `server/app.js` is unchanged, stored data is unchanged, and the existing endpoints keep working.

## Goals & Success Criteria
**Primary:** the first visit downloads well under 1 MB, a repeat visit downloads almost nothing, and each screen costs a handful of database trips.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0 (it runs the server tests too).
- [auto] `node tools/check-no-inline-script.mjs` prints `INLINE: none` and exits 0.
- [auto] `node tools/check-icon-font.mjs` prints `ICON_FONT: ok` and exits 0: every icon the app uses by default is in the small font's icon list.
- [auto] `node tools/check-perf-budget.mjs` prints `PERF_BUDGET: ok` and exits 0 after the build: the small icon font is at most 150 kB; `pwa-192x192.png` and `pwa-512x512.png` are at most 60 kB each; the first-load scripts (`main-*.js` and the chunks it imports statically) are at most 400 kB raw; none of them contains the icon name `zoom_out_map` (the full name list is out of the first script).
- [auto] `node --test server/test/app.test.js` passes with these cases: a built script answers with a `Content-Encoding` header and `Cache-Control` containing `immutable`; `/` and `/index.html` answer `Cache-Control: no-cache`; `/ngsw.json` answers `no-cache`.
- [auto] `node --test server/test/auth.test.js` passes with these cases: two authenticated requests in a row read the `sessions` collection once; after sign-out the same cookie gets 401 on the next request; after "reset parent B" parent B's cookie gets 401 on the next request.
- [auto] `node --test server/test/catalog.test.js` passes with this case: the second Tasting request of a household runs no query for built-in allergens or foods and no baby lookup in the catalog middleware.
- [auto] `node --test server/test/tracker-events.test.js` passes with this case: `GET /api/v1/tracker/events/sync?limit=400` answers `{ events, openSleep }` equal to the answers of `GET /tracker/events?limit=400` and `GET /tracker/sleep/open`.
- [auto] `node --test server/test/tracker-stats.test.js` passes with this case: `GET /api/v1/tracker/stats?from&to` answers an object whose six keys (`nutrition`, `sleep`, `diapers`, `weight`, `pumping`, `vomiting`) equal the six `/:kind` answers; a bad range is 400 `invalid` as on `/:kind`.
- [auto] `src/app/core/services/tracker-events.service.spec.ts` passes with these cases: with a fake clock, 15 s make exactly one data request and `now` changes three times; `focus` and `visibilitychange` fired together make one request.
- [human] In a browser window that never opened the app, the home screen shows its icons as icons right away.
- [human] An entry saved on one phone appears on the other phone within about 15 seconds without touching it.
- [human] In Settings → icons the picker shows every icon; an icon picked there shows on the home screen, also after a reload.
- [human] The installed app icon on the phone looks the same as before.

## Execution Mode
- Parallel: no
- Concurrent plans: none (plan 017 is built on `orch/tasting-017` and not merged; see Technical Considerations)
- Isolated DB: no
- Reviewer: gate

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/app.js
server/package.json
server/pnpm-lock.yaml
server/repositories/sessions-repository.js
server/routes/catalog-helpers.js
server/routes/test-reset.js
server/routes/tracker-events.js
server/routes/tracker-stats.js
server/test/**
src/app/core/services/tracker-events.service.ts
src/app/core/services/tracker-events.service.spec.ts
src/app/core/services/tracker-stats.service.ts
src/app/core/services/tracker-stats.service.spec.ts
src/app/core/services/calendar.service.ts
src/app/core/services/calendar.service.spec.ts
src/app/core/icons/**
src/app/shared/ui/icon/**
src/app/pages/settings/icon-picker-sheet/**
src/styles/icon-font.scss
src/styles/fonts/**
public/pwa-192x192.png
public/pwa-512x512.png
tools/build-icon-font.mjs
tools/check-icon-font.mjs
tools/check-perf-budget.mjs
package.json
pnpm-lock.yaml
e2e/**
docs/project/current-state.md
src/app/app.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — no file under `server/domain/` changes; the statistics functions are called as they are.
- INV-2: preserves — the session memory is inside `server/repositories/sessions-repository.js`; no route or middleware imports the driver, and the catalog memory holds ids only.
- INV-3: preserves — `server/middleware/auth.js` stays the one place that reads the session and sets `req.user` and `req.householdId`.
- INV-4: preserves — the two new endpoints are under `/api/v1/`, plain JSON, same day and moment formats.
- INV-5: preserves — the new style file declares font faces only, no colour.
- INV-6: preserves — no calendar rule, route or page changes; `calendar.service.ts` only stops refreshing twice.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, I open the app and see it at once, with its icons.
- As a parent, a tap is answered quickly, also on a slow phone connection.

## Functional Requirements

### Must Have (P0)
- [ ] The server compresses its answers and lets the browser keep built files.
- [ ] The session and the built-in catalog are not re-read from the database on every request.
- [ ] The home screen and the statistics page each load their data in one request; the home screen refreshes every 15 s.
- [ ] The first visit downloads a small icon font, not the full one.

### Should Have (P1)
- [ ] App icons at their real size; the icon-name list out of the first script; a budget check that keeps it so.

## UI/UX Notes
- Nothing visible changes. No new text keys.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] S1: Compress everything the server sends so scripts and data travel at a third of their size — add the `compression` package (a version with brotli) and use it in `createApp` before the routes and before `express.static`; test beside the other app tests — server/app.js, server/package.json, server/pnpm-lock.yaml, server/test/app.test.js
- [ ] S2: Let the browser keep built files for a year and always re-check the page itself — `express.static(config.staticDir, { setHeaders })`: a file named `<name>-<HASH>.js` or `.css` and every file under `media/` get `public, max-age=31536000, immutable`; `index.html`, `manifest.webmanifest`, `ngsw.json` and the worker files get `no-cache` (the existing worker rule stays); the SPA fallback `sendFile` sends `no-cache` — server/app.js, server/test/app.test.js
- [ ] S3: Remember a valid session for a minute instead of asking the database on every request — in `SessionsRepository`: a `Map` keyed by `tokenHash` with the session and a 60 s time limit; `findValid` answers from it when the entry is fresh and its `expiresAt` is still in the future, else reads the database and stores the answer (a missing session is not stored); `renew` updates the entry; `delete` removes the entry; `deleteByUsername` removes every entry of that username; new `clearCache()` — server/repositories/sessions-repository.js, server/test/auth.test.js
- [ ] S4: Check the built-in food catalog once per household instead of on every Tasting request — in `createCatalogContext`: a `Map` householdId → babyId filled after `requireBabyId` and `ensureCatalog` both succeeded; a later request sets `req.babyId` from it and skips both; a household with no baby is never stored; export a `clearCatalogMemory()`; `routes/test-reset.js` calls it and `repos.sessions.clearCache()` after emptying the database — server/routes/catalog-helpers.js, server/routes/test-reset.js, server/test/catalog.test.js
- [ ] S5: Give the home screen its events and the running sleep in one answer — `GET /sync` in the tracker events router, registered before `/:id` routes: same `limit` handling as the list route, `Promise.all` of `repos.trackerEvents.list` and `repos.trackerEvents.findOpenSleep`, answer `{ events, openSleep }` in the shapes the two existing routes use; the two existing routes stay — server/routes/tracker-events.js, server/test/tracker-events.test.js
- [ ] S6: Give the statistics page all six sections from one read of the events — `GET /` in the tracker stats router with the same `from`/`to` checks as `/:kind` (move them to one local function): one `repos.trackerEvents.list`, one `firstTimestamp`, then every function of `STAT_KINDS`, answer `{ nutrition, sleep, diapers, weight, pumping, vomiting }`; `/:kind` stays — server/routes/tracker-stats.js, server/test/tracker-stats.test.js
- [ ] C1: Refresh the home data every 15 seconds and once when the parent returns, while clocks keep ticking every 5 — in `TrackerEventsService`: the 5 s timer only sets `now_`; every third tick (15 s) and `onVisible_` call `refresh(true)`; `refresh` reads `/tracker/events/sync?limit=400` and sets both signals; a background refresh is skipped while one is running or when the last one ended under 2 s ago (own saves always refresh). In `CalendarService.refreshOnFocus` apply the same skip so `focus` and `visibilitychange` together refresh once — src/app/core/services/tracker-events.service.ts, src/app/core/services/tracker-events.service.spec.ts, src/app/core/services/calendar.service.ts
- [ ] C2: Load the statistics page with one request instead of six — `TrackerStatsService.load` reads `/tracker/stats?from&to` once and sets the six signals from its keys; the stale-request guard stays — src/app/core/services/tracker-stats.service.ts, src/app/core/services/tracker-stats.service.spec.ts
- [ ] C3: Build a small icon font that holds only the icons the app shows by default — `tools/build-icon-font.mjs` collects every `default` of `ICON_SLOTS` and every fixed icon name given to `<app-icon>` in templates and component code (search `name="` and `[name]=` on `app-icon`), sorts them, downloads the Material Symbols Rounded subset for exactly those names from the Google Fonts CSS API (`icon_names=`; keep the `FILL` axis 0..1 and the weight the app uses) and writes `src/styles/fonts/material-symbols-app.woff2` plus `src/app/core/icons/app-icon-names.ts` (the sorted list, generated, "Do not edit"). Both files are committed: the Render build does not run the tool and the browser never calls Google — tools/build-icon-font.mjs, src/styles/fonts/material-symbols-app.woff2, src/app/core/icons/app-icon-names.ts
- [ ] C4: Show icons from the small font and fetch the full font only when it is needed — new `src/styles/icon-font.scss` declares `@font-face` `Material Symbols App` (the small file, `font-display: block`) and is added to `src/styles.scss` with one appended line (the existing `material-symbols/rounded.css` import stays: a declared font is not downloaded until something uses it). `app-icon` uses `font-family: var(--icon-font, 'Material Symbols App')` with the same size, fill and ligature settings as today. A small `IconFontService` in `src/app/core/icons/` sets `--icon-font` to `'Material Symbols Rounded'` on the root element when asked; the icon picker asks when it opens, and `app-icon` asks when a household override is not in `app-icon-names.ts` — src/styles/icon-font.scss, src/styles.scss, src/app/shared/ui/icon/icon.ts, src/app/shared/ui/icon/icon.scss, src/app/core/icons/icon-font.service.ts, src/app/pages/settings/icon-picker-sheet/icon-picker-sheet.ts
- [ ] C5: Keep the full list of icon names out of the first script — `icon.ts` stops importing `ICON_NAMES` and uses a non-empty string override as it is (the server already refuses unknown names when settings are saved); only the lazy icon picker imports `icon-names.ts` — src/app/shared/ui/icon/icon.ts, src/app/shared/ui/icon/icon.spec.ts
- [ ] C6: Shrink the two app icons to their real size so the phone does not download two megabytes for them — resize `pwa-192x192.png` to 192×192 and `pwa-512x512.png` to 512×512 from the current image and compress them, with a one-off command (`pnpm dlx sharp-cli`); nothing is added to `package.json` for it — public/pwa-192x192.png, public/pwa-512x512.png
- [ ] C7: Fail the checks when the app grows heavy again or an icon is missing from the small font — `tools/check-icon-font.mjs` recomputes the used icon names the way C3 does and compares with `app-icon-names.ts` (`ICON_FONT: ok`, or the missing names and exit 1); `tools/check-perf-budget.mjs` reads `dist/baby-tasting/browser` and applies the limits of the success criteria (`PERF_BUDGET: ok`, or one line per broken limit and exit 1); one line on both under the build rules — tools/check-icon-font.mjs, tools/check-perf-budget.mjs, docs/project/current-state.md

## Technical Considerations
- Dependencies: `server/app.js` middleware order (compression goes after `helmet`, before the routes); `TrackerEventsService` is used by the log, timeline and statistics pages.
- New files needed: the three tools, `src/styles/icon-font.scss`, `src/styles/fonts/material-symbols-app.woff2`, `src/app/core/icons/app-icon-names.ts`, `src/app/core/icons/icon-font.service.ts`.
- Model changes: none.
- Backend / API: new `GET /api/v1/tracker/events/sync` and `GET /api/v1/tracker/stats`; nothing removed.
- Auth and validation: both new endpoints sit behind the existing `requireAuth` mounts; `/tracker/stats` validates `from`/`to` exactly as `/:kind`.
- Security surface: a signed-out or reset session must stop working at once — S3 removes the remembered entry in `delete` and `deleteByUsername`, and the tests prove it. A session deleted directly in the database stays valid for at most 60 s. No new input, secret or permission. The CSP is unchanged and the browser makes no request to Google.
- Data / migration: none.
- New dependency: `compression` in `server/`. No new dependency in the root `package.json` is expected; it is in scope only for the case the icon tool needs one, logged as a decision.
- Plan 017 is built on `orch/tasting-017` and not merged; it also changes `package.json`, `pnpm-lock.yaml` and `docs/project/current-state.md`. Whichever merges second resolves those three files.
- Existing e2e tests that wait for the 5 s refresh may need a longer wait (15 s); `e2e/**` is in scope for that only.
- Project checks: none (`docs/project/plan-checks.md` does not exist).

## Out of Scope
- Render dashboard settings (start command, build command, health check) and the Render plan: a free instance sleeps after 15 minutes without visits and takes about a minute to wake, which code cannot fix.
- Putting the Render service in the same region as the Atlas cluster (a Human action; each database trip costs the distance).
- Any change to the CSP, to stored data, to what a screen shows, or to the six statistics functions.
- Removing the old `/tracker/events`, `/tracker/sleep/open` and `/tracker/stats/:kind` endpoints.

## Critical Questions
- Q: How often does the home screen refresh? A: every 15 s, on return to the app, after an own save (Human, 2026-11-18).
- Q: Small icon font with the full font on demand, or keep the full font? A: small font (Human approved the plan with it, 2026-11-18).

## Execution Notes
- none yet
