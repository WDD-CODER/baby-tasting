# Plan 002 — Sign-in with a username, one shared household and the baby profile

Status: draft
Depends-on: 001
Snapshot: ebf1b1f24e30f84c61981a4b78904df83e192c8f
Source: docs/briefs/brief-2-signin-household-baby.md (product rules: docs/briefs/00-program.md D7, D8, M3, section 8)

## Problem Statement
Two parents must get into the app with nothing more than their username, share one household and one baby, and every
later API call must know who is asking and for which household and baby.

## Goals & Success Criteria
**Primary:** an allowed username signs in once for 180 days; both parents see and edit the same baby.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0.
- [auto] `node --test server/test/auth.test.js server/test/baby.test.js` exits 0, covering: an allowed username (any case, surrounding spaces) gets a session cookie and `GET /api/v1/auth/me` returns `{ "username": … }`; an unknown username gets 401 `{ "error": { "code": "login_failed" } }` with the same body as any other failure; the 11th login attempt from one IP within 15 minutes gets 429; `GET` and `PUT /api/v1/baby` without a session get 401; two different allowed usernames read and write the same baby document; `PUT /api/v1/baby` refuses an empty name and a future birth date with 400; no response body anywhere contains the list of allowed usernames.
- [ui] On `/login`, typing `parent-a` and pressing `כניסה` opens the app; typing `nobody` shows `שם המשתמש לא מזוהה` and stays on `/login`.
- [ui] With no baby saved (after `POST /api/v1/test/reset`), signing in shows `/welcome`; saving name `נועה` and a birth date 5 months ago shows `נועה` and `5 חודשים` in the top bar.
- [ui] On `/settings`, changing the baby's name and pressing the browser back button shows `יש שינויים שלא נשמרו`.
- [human] Sign-in feels fast enough to do one-handed on a phone.

## Execution Mode
- Parallel: no
- Concurrent plans: none (runs after 001)
- Isolated DB: no
- Reviewer: gate

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/app.js
server/config.js
server/package.json
server/pnpm-lock.yaml
server/.env.example
server/middleware/**
server/routes/**
server/repositories/**
server/lib/**
server/test/**
src/app/app.config.ts
src/app/app.routes.ts
src/app/core/**
src/app/layout/**
src/app/pages/login/**
src/app/pages/welcome/**
src/app/pages/settings/**
src/app/shared/**
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

- INV-2: preserves — sessions, households and babies are read and written only through new repository modules in `server/repositories/`.
- INV-3: preserves — this plan creates the one authentication middleware (`server/middleware/auth.js`); it is the only code that reads the session cookie and sets `req.user` and `req.householdId`.
- INV-4: preserves — every new route is under `/api/v1/`, returns plain JSON, the birth date is `YYYY-MM-DD`.
- INV-5: preserves — new screens use the shared components and tokens only.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, I type my username once and stay signed in on my phone for months.
- As the second parent, I see the same baby my partner entered.
- As a parent opening the app the first time, I am asked for the baby's name and birth date and then see them in the top bar.

## Functional Requirements

### Must Have (P0)
- [ ] `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`; session in MongoDB, http-only cookie 180 days, secure in production; 10 attempts / 15 min / IP.
- [ ] One authentication middleware on every `/api/v1/*` route except `health`, `auth/login` and the test-only reset.
- [ ] Household created on the first successful login; every allowed user belongs to it.
- [ ] `GET` / `PUT /api/v1/baby` (name, birth date); age computed, never stored.
- [ ] Sign-in page, route guard, 401 interceptor, first-run page, baby in top bar, baby form and sign-out in Settings.

## UI/UX Notes
- `/login` and `/welcome` render without the bottom navigation (top bar only).
- Login: one `app-text-field` labelled `שם משתמש` (autofocus, `autocapitalize="none"`, `autocomplete="username"`, Enter submits) and one full-width primary `app-button` `כניסה` with loading state.
- Age label in the top bar: `{name} · {months} חודשים` (under one month: `{days} ימים`). Exact days are shown on the baby form.
- Settings at this stage: section `התינוק/ת` with the baby form (save button disabled until changed) and a `יציאה` button at the bottom. Plan 008 completes the page around it.

## Atomic Sub-tasks

- [x] B1: Store sessions, the household and the baby through repositories so no route touches the database — `server/repositories/sessions-repository.js` (token stored as SHA-256 hash, `{ tokenHash, username, householdId, createdAt, expiresAt }`, TTL index on `expiresAt`, `create`, `findValid(token, now)`, `delete(token)`), `households-repository.js` (`ensureDefault(username, now)`: one household document `{ key: 'default', members: [...] }`, upsert adds the member), `babies-repository.js` on `BaseRepository` (`getForHousehold(householdId)` → the one baby or null, `upsert(householdId, { name, birthDate }, user)`), index creation in one `server/repositories/indexes.js` called at start — server/repositories/**
- [x] B2: Sign parents in by username only, with a 180-day cookie and a login rate limit — `server/routes/auth.js` (`createAuthRouter({ repos, config })`): login trims and lower-cases the input and compares with `config.appUsers` lower-cased; on success creates the household membership and a session with a 32-byte random token, sets cookie `bt_session` (`httpOnly`, `sameSite: 'lax'`, `secure` when `nodeEnv === 'production'`, `maxAge` 180 days, `path: '/'`), answers `{ username }` (the name as written in `APP_USERS`); any failure answers 401 `{ error: { code: 'login_failed', message: 'Login failed' } }`; `express-rate-limit` on login only, 10 per 15 min per IP, 429 `{ error: { code: 'rate_limited', … } }`; `app.set('trust proxy', 1)` in production; logout deletes the session and clears the cookie; `me` returns `{ username }`; add `express-rate-limit` and `cookie-parser` — server/routes/auth.js, server/app.js, server/package.json, server/pnpm-lock.yaml
- [x] B3: Protect every API route with one middleware that says who is asking — `server/middleware/auth.js` `createRequireAuth({ repos })`: reads `bt_session`, finds a valid session, sets `req.user = { username }` and `req.householdId` (string), else 401 `{ error: { code: 'unauthorized' } }`; mounted in `server/app.js` before every `/api/v1` router except `health`, `auth/login` and `test/reset` — server/middleware/auth.js, server/app.js
- [x] B4: Save and read the one baby both parents share — `server/routes/baby.js`: `GET /api/v1/baby` → `{ baby: { id, name, birthDate } | null }`; `PUT` validates `name` (trimmed, 1–40 characters) and `birthDate` (`YYYY-MM-DD`, a real date, not after today in Asia/Jerusalem, not more than 6 years ago) → 400 `{ error: { code: 'invalid', message } }`; audit fields via the repository; `server/lib/dates.js` `todayIso(tz = 'Asia/Jerusalem', now = new Date())` (the one clock read, outside `server/domain/`) — server/routes/baby.js, server/lib/dates.js
- [x] B5: Let end-to-end tests start from an empty household without touching real data — `server/routes/test-reset.js`: `POST /api/v1/test/reset` mounted only when `config.e2eReset` is true (`E2E_RESET=1` and `NODE_ENV` not `production`); deletes all documents in every collection of the database (listed with `listCollections`, through `server/repositories/test-reset-repository.js`), including `sessions` — so later plans' collections are cleared too without changing this route; e2e specs sign in again after a reset; `config.js` reads `E2E_RESET`; `.env.example` documents it as "end-to-end test databases only" — server/routes/test-reset.js, server/config.js, server/.env.example, server/app.js
- [x] B6: Prove the sign-in rules on the server — `server/test/auth.test.js`, `server/test/baby.test.js` with `mongodb-memory-server` and `supertest` (dev dependency) as listed in Done-when; a test helper `server/test/helpers.js` that builds an app with a test config (`appUsers: ['Parent-A', 'parent-b']`) and returns a signed-in agent — server/test/**, server/package.json, server/pnpm-lock.yaml
- [x] B7: Keep sign-in state in one frontend service and guard the app — `src/app/core/services/auth.service.ts` (`user` signal, `loadMe()`, `login(username)`, `logout()`), `src/app/core/guards/auth.guard.ts` (`authGuard`: `loadMe` once, else redirect `/login`), `src/app/core/interceptors/auth.interceptor.ts` (401 on any call except `auth/login` and `auth/me` → clear user, navigate `/login`), registered in `app.config.ts` with `withInterceptors`; specs — src/app/core/**, src/app/app.config.ts
- [x] B8: Build the sign-in page — `src/app/pages/login/login.ts` (+ html, scss): form per UI notes; 401 → inline error `HE.auth.unknownUser` = `שם המשתמש לא מזוהה`; 429 → `HE.auth.rateLimited` = `יותר מדי ניסיונות. נסו שוב בעוד כמה דקות`; network → `HE.common.errorNetwork`; success → navigate to the page the guard came from or `/`; add `HE.auth.*` (`username: 'שם משתמש'`, `submit: 'כניסה'`, `logout: 'יציאה'`) — src/app/pages/login/**, src/app/core/i18n/he.ts
- [x] B9: Ask for the baby on first use and show the baby in the top bar — `src/app/core/services/baby.service.ts` (`baby` signal, `load()`, `save()`), `src/app/core/utils/age.ts` (`ageParts(birthDate, todayIso)` → `{ months, days }`, pure, spec with month-end and leap-year cases), `src/app/core/guards/baby.guard.ts` (no baby → `/welcome`); shared form `src/app/shared/baby-form/baby-form.ts` (name `app-text-field`, birth date `<input type="date">` inside `app-text-field`, implements `HasUnsavedChanges`); `src/app/pages/welcome/welcome.ts` uses it (title `HE.welcome.title` = `ברוכים הבאים! איך קוראים לתינוק/ת?`); `ShellService.babyLabel` set from the baby service; top bar shows it per UI notes — src/app/core/**, src/app/shared/baby-form/**, src/app/pages/welcome/**, src/app/layout/**
- [x] B10: Put the baby form and sign-out in Settings with the leave-protection — `src/app/pages/settings/settings.ts`: section with the shared baby form, `canDeactivate: [unsavedChangesGuard]` on the route, `יציאה` button (`AuthService.logout()` then `/login`); routes: `login` and `welcome` outside the guarded shell, all shell routes behind `authGuard` and `babyGuard` (welcome behind `authGuard` only) — src/app/pages/settings/**, src/app/app.routes.ts
- [x] B11: Write the UI checks and a sign-in helper for every later test — `e2e/support/session.ts` (`resetHousehold(request)` calls `POST /api/v1/test/reset` on `E2E_API_URL` default `http://localhost:3000`; `signIn(page, username = process.env.E2E_USERNAME ?? 'parent-a')`; `ensureBaby(page, { name, birthDate })`); update `e2e/README.md` (tests sign in as `E2E_USERNAME`, default `parent-a`; the backend must run with `E2E_RESET=1` on an end-to-end database); `e2e/002-1-login.spec.ts`, `e2e/002-2-welcome.spec.ts`, `e2e/002-3-unsaved.spec.ts`, screenshots `e2e/screens/002-<n>.png` — e2e/**
- [x] B12: Note what now exists — `docs/project/current-state.md` (auth, household, baby, the test reset route) — docs/project/current-state.md

## Technical Considerations
- Dependencies: server `express-rate-limit`, `cookie-parser`, dev `supertest`. Approved by this plan.
- New files needed: listed per sub-task.
- Model changes: `User { username }`, `Baby { id, name, birthDate }` in `src/app/core/models/`.
- Backend / API: auth (3 routes), baby (2 routes), test reset (1 route, off unless `E2E_RESET=1` outside production).
- Auth and validation: username compared case-insensitively after trim against `APP_USERS`; generic failure; rate limit; baby fields validated.
- Security surface: the username is the secret (D7) — never logged (the request logger logs no bodies), never listed by any route or screen; session token random 32 bytes, stored hashed; cookie http-only, `SameSite=Lax`, secure in production; the reset route cannot exist in production.
- Data / migration: new collections `sessions`, `households`, `babies`.

## Backend Impact
- Collections affected: none existing
- New collections: yes — `sessions` (login state, TTL), `households` (the one household), `babies` (the one baby; carries `householdId`; its `_id` is the `babyId` every later document stores)
- Server changes needed: yes — auth router, middleware, baby router, reset route.

## Out of Scope
Registration, passwords, password reset, roles, more than one household, more than one baby in the UI, the rest of the Settings page (plan 008).

## Critical Questions
- none

## Execution Notes
- Planner decision (overnight pre-approval): sessions are a small own collection instead of `express-session`, so the middleware is the single place that knows how login works (M3).
- Planner decision: the end-to-end reset route exists only with `E2E_RESET=1` outside production, so `[ui]` checks can start from an empty household.
- Planner decision (review fix): this plan may modify the existing `src/app/app.routes.ts` entries named in B10 (nesting the shell routes under `authGuard` and `babyGuard`); the append-only rule is waived for those entries only.
- Builder: B1–B12 done. Blocked on `src/app/app.spec.ts` (outside scope): the route guards now need `AuthService`/`BabyService`, so its 2 router tests ('renders the foods empty state', 'redirects an unknown path') fail (`pnpm run test` → 2 FAILED, 19 SUCCESS). Needed: provide stub `AuthService`/`BabyService` in its TestBed. Asked for `approved: src/app/app.spec.ts`.
- Evidence: `pnpm run build` → 0; `pnpm run lint` → 0; `node --test server/test/*.test.js` → pass, 0 fail (auth, baby, test-reset, app).
