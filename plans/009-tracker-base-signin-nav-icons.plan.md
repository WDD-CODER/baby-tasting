# Plan 009 — Tracker base: password sign-in that stays on, five-tab navigation, baby profile, Tracker settings, icon slots

Status: draft
Depends-on: 008
Snapshot: 5f881b2abe79c9e8ee8ca2424032619b6818bae0
Source: docs/briefs/tracker/brief-T1-base.md (program: docs/briefs/tracker/00-tracker-program.md P1, P2, P3, P4, P7, F2)

## Problem Statement
The app must become one app with two areas: parents sign in once per phone with a password and stay in, land on the Tracker home, reach Tasting from the navigation, and share one baby profile and one settings store. Every icon must come from one library through named slots so parents can change them later (plan 014).

## Goals & Success Criteria
**Primary:** a signed-in phone opens straight to the Tracker home; five tabs; Tasting under `/tasting`; Tracker settings and icon overrides stored per household.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0 (Karma and every server test).
- [auto] `node --test server/test/auth.test.js server/test/tracker-settings.test.js server/test/baby.test.js` exits 0, covering: the right password for an `APP_USERS` name (any case) gives a session; a wrong password and an unknown name both get the same 401 `login_failed`; the 11th attempt in 15 minutes gets 429; `GET /api/v1/auth/me` returns `{ username, parentType, parentName }` with `PARENT_A` for the first `APP_USERS` entry; an authenticated request moves the session expiry forward (rolling); after `POST /api/v1/auth/logout` the same cookie gets 401; `GET /api/v1/tracker/settings` returns the defaults of spec-server-data §1.2; `PUT` saves `parentAName`, `defaultBottleType`, `customActivities`, `quickActionOrder` and `iconOverrides` and refuses an unknown slot key or icon name with 400; the baby accepts `birthWeightGrams` (100–7000).
- [ui] Signing in on `/login` with `parent-a` and password `test-pass-a` opens `/` and shows `יום חדש ורענן!`; the five tabs `תיעוד`, `ציר זמן`, `סטטיסטיקה`, `טעימות`, `הגדרות` are visible at 360px.
- [ui] After signing in, opening `/` in a new page of the same browser context shows the Tracker home without the sign-in page.
- [ui] `טעימות` opens `/tasting` (the tasting calendar); its top tab `מזונות` opens `/tasting/foods`.
- [ui] On `/settings`, saving `אמא` → `מאיה` as parent A's name shows `מאיה` in the top bar.
- [human] Navigation feels natural with Tracker first and Tasting one tap away.

## Execution Mode
- Parallel: no
- Concurrent plans: none (Tracker plans 009–014 run in order)
- Isolated DB: no
- Reviewer: gate

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

Planner decision: this plan may rewrite existing entries of `src/app/app.routes.ts` (named in its sub-tasks); the append-only rule is waived for those entries only. `src/app/app.spec.ts` is in scope so route tests can follow.

```scope
package.json
pnpm-lock.yaml
angular.json
server/app.js
server/config.js
server/package.json
server/pnpm-lock.yaml
server/.env.example
server/middleware/**
server/routes/**
server/repositories/**
server/domain/**
server/lib/**
server/test/**
src/styles.scss
src/styles/**
src/app/app.routes.ts
src/app/app.spec.ts
src/app/app.config.ts
src/app/core/**
src/app/layout/**
src/app/shared/**
src/app/dev/**
src/app/pages/**
e2e/**
DESIGN.md
docs/project/current-state.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected. The Tracker behaviour specs in `docs/briefs/tracker/spec-*.md` are binding for exact Hebrew texts and rules; `docs/briefs/tracker/00-tracker-program.md` (P1–P7, F1–F13) wins over them where it says so. The old Tracker code is at `C:\coding projects\Cursor/baby-tracker` (read only) when a spec line is unclear.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the tracker settings defaults and validation and the icon-slot validation are pure functions in `server/domain/tracker/`.
- INV-2: preserves — tracker settings and sessions go through `server/repositories/`.
- INV-3: preserves — `server/middleware/auth.js` stays the one place that reads the session; it now also renews it (rolling).
- INV-4: preserves — new routes under `/api/v1/tracker/`.
- INV-5: preserves — icons and new screens use tokens; Material Symbols is a font, not a colour literal.
- INV-6: preserves — the tasting calendar moves to `/tasting` unchanged; the meal-1 rule is untouched.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, I sign in once on my phone and the app opens straight to recording from then on.
- As a parent, I switch between tracking and tasting with one tap.

## Functional Requirements

### Must Have (P0)
- [ ] Username + password sign-in (bcrypt), rolling session until sign-out.
- [ ] Five-tab navigation, Tasting under `/tasting`, Tracker home at `/` (empty state for now).
- [ ] Tracker settings API and the Settings page section `מעקב תינוק`; baby birth weight.
- [ ] Material Symbols Rounded, icon-slot registry and `app-icon`.

## UI/UX Notes
- Sign-in page: `שם משתמש`, `סיסמה` (type password, show/hide icon button), `כניסה`; errors as today plus `שם משתמש או סיסמה שגויים` for 401. Exact Tracker texts: spec-log-settings §2.
- Bottom navigation (P2): `תיעוד` (slot `nav.log`, default `edit_note`), `ציר זמן` (`nav.timeline`, `timeline`), `סטטיסטיקה` (`nav.stats`, `monitoring`), `טעימות` (`nav.tasting`, `restaurant`), `הגדרות` (`nav.settings`, `settings`). Labels under icons, active tab in accent.
- Tasting top tabs inside `/tasting/**`: `יומן` (`/tasting`), `מזונות` (`/tasting/foods`), `אלרגנים` (`/tasting/allergens`).
- Top bar keeps the baby name and age; the signed-in parent's name shows at its inline-end (`parentName`).

## Atomic Sub-tasks

- [ ] K1: Sign in with a password and keep each phone signed in until sign-out — `APP_USERS` format `name:bcryptHash` (comma-separated; a name without `:hash` is refused at startup with a clear config error); `bcryptjs` on the server; `POST /api/v1/auth/login` `{ username, password }`; `parentType` = `PARENT_A` for the first entry, `PARENT_B` for the second; session cookie max age 365 days, and `server/middleware/auth.js` extends `expiresAt` (and re-sets the cookie) when less than 364 days remain, at most once a day per session; `.env.example` explains how to create a hash (`node -e "import('bcryptjs').then(b=>b.hash('pw',10).then(console.log))"`) and the slots' e2e users `parent-a:<hash of test-pass-a>,parent-b:<hash of test-pass-b>`; `e2e/support/session.ts` `signIn(page, username, password = 'test-pass-a')`; update every existing e2e spec that signs in — server/routes/auth.js, server/middleware/auth.js, server/config.js, server/repositories/sessions-repository.js, server/package.json, server/.env.example, e2e/**
- [ ] K2: Store the Tracker settings and the baby's birth weight — `server/domain/tracker/settings.js` (`TRACKER_DEFAULTS` from spec-server-data §1.2: `parentAName` `אמא`, `parentBName` `אבא`, `defaultBottleType` `EXPRESSED_MILK`, `customActivities` the five defaults, `quickActionOrder` the spec order; `validateTrackerSettings`); `GET`/`PUT /api/v1/tracker/settings` (`currentParent` in GET, like spec §3.3); stored in the household's existing settings document under `tracker`; `birthWeightGrams` on the baby (100–7000, optional) — server/domain/tracker/**, server/routes/tracker-settings.js, server/repositories/settings-repository.js, server/routes/baby.js, server/app.js, server/test/**
- [ ] K3: Give every icon a named slot from one library so parents can change it later — add `material-symbols` (rounded font only) to `package.json`, import its rounded CSS in `src/styles.scss`; `src/app/core/icons/icon-slots.ts` (`ICON_SLOTS: Record<SlotKey, { default: string, label: string, group: string, keywords: string[] }>` with the navigation slots now; later plans add theirs); `src/app/core/icons/icon-names.ts` generated by `tools/gen-icon-names.mjs` from the package's codepoints file (the list the server and the picker validate against; commit the generated file); `src/app/shared/ui/icon/` (`app-icon`, inputs `slot` or `name`, `size`, `filled`; reads overrides from `TrackerSettingsService`); `iconOverrides` validation on the server uses the same list (copied by the tool into `server/domain/tracker/icon-names.js`) — package.json, pnpm-lock.yaml, src/styles.scss, src/app/core/icons/**, src/app/shared/ui/icon/**, tools/gen-icon-names.mjs, server/domain/tracker/icon-names.js
- [ ] K4: Move Tasting under its own section and add the five-tab navigation — rewrite `src/app/app.routes.ts`: `''` → Tracker log page (`src/app/pages/tracker/log-page/`, empty state `יום חדש ורענן!` only in this plan), `timeline` and `stats` → empty-state pages under `src/app/pages/tracker/`, `tasting` → a `TastingSection` layout with the top tabs and every existing Tasting route as its child (`tasting`, `tasting/foods`, `tasting/foods/new`, …, `tasting/reactions/:id`); `settings` stays; update every internal link and `router.navigate` in Tasting pages, the alert actions and the e2e specs to the new paths; shell bottom navigation per UI notes using `app-icon` — src/app/app.routes.ts, src/app/app.spec.ts, src/app/layout/**, src/app/pages/**, e2e/**
- [ ] K5: Show who is signed in and add the Tracker section to Settings — `TrackerSettingsService` (`settings` signal, `load`, `save`), top bar parent name, Settings section `מעקב תינוק` with parent names, default bottle (`חלב אם שאוב` / `תמ״ל`), baby birth weight on the baby form; unsaved-changes guard covers the new fields — src/app/core/services/**, src/app/pages/settings/**, src/app/shared/baby-form/**, src/app/layout/**
- [ ] K6: Write the UI checks and update the docs — `e2e/009-1-signin.spec.ts` … `e2e/009-5-parent-name.spec.ts`, screenshots `e2e/screens/009-<n>.png`; DESIGN.md (icons: Material Symbols Rounded, slots, sizes 20/24/32; nav), `docs/project/current-state.md` — e2e/**, DESIGN.md, docs/project/current-state.md

## Technical Considerations
- Dependencies: `bcryptjs` (server), `material-symbols` (frontend font). Approved by the Human (P1, P7).
- Backend / API: login body changes (password); `auth/me` adds `parentType`, `parentName`; `/api/v1/tracker/settings`.
- Auth and validation: bcrypt compare; rolling expiry; `iconOverrides` keys and names validated.
- Security surface: passwords never logged (no bodies in the request log), hashes only in env; cookie stays http-only, SameSite=Lax, secure in production.
- Data / migration: settings document gains `tracker`; baby gains `birthWeightGrams`; existing sessions stay valid.

## Out of Scope
Events, the log tab content, timeline, statistics, the icon picker screen (plan 014), export.

## Critical Questions
- none

## Execution Notes
- Planner decision (P1, Human 2026-11-16): sessions roll for up to one year of inactivity; sign-out ends the phone's session only.
- Planner decision: the slots' and main folder's `server/.env` need the new `APP_USERS` format; the Planner updates those local files before the `[ui]` checks run.
