# Plan 018 — Sign-up for the two parents with an invite link, so Render needs no user list

Status: draft
Depends-on: none
Snapshot: 8a9700d0cbc053d1c8fe83777245efdca1e6942b
Source: the Human, 2026-11-17, before the first Render deploy: "create a sign in and sign up process for the deployed app so the users sign up when they enter, having only 2 users max"; "the signup will release the need to set env for the users"; chose the invite-link option and approved the design in chat. Local dev keeps `APP_USERS` (`dad`/`dad1`, `mom`/`mom1` in the main folder's `server/.env`).

## Problem Statement
Today the only accounts are the ones written in the `APP_USERS` environment variable as bcrypt hashes, and production refuses to start without it (`server/config.js`). Making a hash needs a terminal command, and every password change needs a Render edit and a redeploy. The parents want to open the deployed app and create their own accounts. Only two accounts may ever exist (parent A and parent B, one shared household), and a stranger who finds the address must not be able to take a place.

## Decisions (Planner, from the Human's approved design — the Human can change them at validation)
- **D-018-1 Two account sources, one at a time.** When `APP_USERS` is set (local dev, the `wt-N` slots, e2e), it is the account list exactly as today and sign-up is off: the sign-up endpoints answer `409 signup_closed`, and the UI hides every sign-up and invite element. When `APP_USERS` is empty or unset, accounts live in a new `users` collection and sign-up is on. `APP_USERS` is no longer required in production. `server/config.js` exposes `accountsMode: 'env' | 'db'`.
- **D-018-2 First account is open, then sign-up closes.** In `db` mode, while no `PARENT_A` user exists, anyone may create the first account: it becomes `PARENT_A`. After that, a new account needs a valid invite token and becomes `PARENT_B`. With both users present, sign-up answers `409 signup_closed`. A unique index on `parentType` makes two racing first sign-ups end with one winner (the loser gets `409 signup_closed`).
- **D-018-3 Invite link.** Parent A (only `PARENT_A`, only in `db` mode) creates an invite in Settings. The server returns a random token (32 bytes, base64url), stores only its SHA-256, valid 7 days, single use. Creating a new invite deletes any earlier unused one. The browser builds the link as `<window.location.origin>/join/<token>`. The parent copies or shares it (`navigator.share` when present, else copy to clipboard).
- **D-018-4 Reset parent B.** In Settings, when parent B exists, parent A can tap `איפוס סיסמה להורה השני` (confirm dialog). The server deletes parent B's user document and all of parent B's sessions, and returns a new invite. Parent B signs up again through the link. If parent B uses the same name, their per-user settings (`userPrefs`, keyed by username) come back.
- **D-018-5 Parent A forgot the password.** There is no in-app reset for parent A, because there is no email. Documented recovery: delete the `PARENT_A` document from the `users` collection in Atlas. The first-account sign-up is then open again (D-018-2 checks "no `PARENT_A`", not "no users"). Written in `docs/project/accounts.md`.
- **D-018-6 Form rules.** Username: trimmed, 2–30 characters, letters (Hebrew or Latin), digits, `-` and `_`, unique ignoring case. Password: at least 4 characters (the Human's dev passwords are 4 characters; this is a two-person family app), at most 200, typed twice on the form (the server checks only one). bcrypt cost 10, as today.
- **D-018-7 Sessions carry the parent.** A new session stores `parentType`. `requireAuth` reads it from the session. A session without it (made before this plan) falls back to today's `APP_USERS` order lookup, so nobody is signed out by the deploy. `requireAuth` stays the only place that reads a session (INV-3).
- **D-018-8 Sign-up signs you in.** A successful sign-up creates the session cookie exactly as login does, joins the `default` household (`households.ensureDefault`), and answers the same body as `POST /auth/login`. The login rate limiter also covers sign-up and invite checks.

## Goals & Success Criteria
**Primary:** on a server without `APP_USERS`, the first visitor creates parent A, parent A's invite link creates parent B, and nobody else can create an account.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0 (Karma and every server test).
- [auto] `node --test server/domain/accounts.test.js server/test/signup.test.js server/test/auth.test.js server/test/config.test.js` exits 0, covering: production starts without `APP_USERS`; with `APP_USERS` set, sign-up and invite endpoints answer `409 signup_closed`; the first sign-up becomes `PARENT_A` and gets a session cookie; a second sign-up without an invite answers `403 invite_required`; an expired, used or unknown token answers `403 invite_invalid`; a valid token makes `PARENT_B`, and the token cannot be used again; a third sign-up answers `409 signup_closed`; two first sign-ups at once leave exactly one `PARENT_A`; only `PARENT_A` may create an invite (`PARENT_B` gets `403`); resetting parent B deletes parent B's sessions (their old cookie gets `401`) and returns a new invite; a duplicate name (different case) answers `409 username_taken`; the stored token is a hash, never the token itself; an old session without `parentType` still resolves to the right parent.
- [auto] Karma specs: the login page shows the create-account form when the status says the first account is open, and only the login form otherwise; the join page shows the invalid-link message for an invalid token; the Settings second-parent card is hidden in `env` mode and for parent B.
- [human] On a local server with no `APP_USERS` and an empty database, the first visitor sees `יצירת חשבון`, creates parent A and lands in the app.
- [human] Parent A taps `יצירת קישור הזמנה` in Settings, opens the link in a private window, creates parent B and lands in the app; opening the same link again shows `הקישור לא בתוקף`.
- [human] With both parents present, the login page shows no create-account option.
- [human] Parent A resets parent B's password: parent B is signed out, and the new link lets parent B sign up again.

## Execution Mode
- Parallel: yes
- Concurrent plans: 017 (it touches `src/app/core/i18n/he.ts` and `src/app/pages/**` too: merge `he.ts` by keeping both sides' keys)
- Isolated DB: yes — the sign-up checks need a server without `APP_USERS` on an empty database
- Reviewer: gate

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/config.js
server/app.js
server/domain/accounts.js
server/domain/accounts.test.js
server/middleware/**
server/routes/**
server/repositories/**
server/lib/**
server/test/**
server/.env.example
src/app/core/**
src/app/shared/**
src/app/pages/login/**
src/app/pages/join/**
src/app/pages/settings/**
e2e/**
render.yaml
docs/project/current-state.md
docs/project/accounts.md
README.md
```

## Read Scope

Entire repo. `docs/briefs/00-program.md` stays binding.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the sign-up rules (who may sign up, which parent they become, name and password rules) go in a pure `server/domain/accounts.js`: no express, mongodb, repository or clock import (the route passes `now` and the current users).
- INV-2: preserves — `users` and `invites` get their own repositories (`server/repositories/users-repository.js`, `invites-repository.js`) with their indexes in `server/repositories/indexes.js`; routes never touch the driver.
- INV-3: preserves — `requireAuth` in `server/middleware/auth.js` stays the only reader of the session; sign-up creates a session through `repos.sessions.create`, exactly as login does.
- INV-4: preserves — new endpoints under `/api/v1/auth/`, plain JSON, ISO timestamps for `expiresAt`.
- INV-6: preserves — no calendar route, calendar rule or calendar page changes; `server/routes/**` is in scope only for `auth.js`.
- INV-5: preserves — new screens use the existing tokens and shared components (`TextField`, `Button`, `Icon`); no colour literal.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the first parent, I open the deployed app and create my account myself.
- As the first parent, I send my partner a link so they can create the second account.
- As a parent, I know that nobody else can create an account in our app.
- As the first parent, I can let my partner set a new password when they forget it.

## Functional Requirements

### Must Have (P0)
- [ ] D-018-1 `APP_USERS` optional in production; `env` mode keeps today's behaviour with sign-up off.
- [ ] D-018-2 first account open, `PARENT_A`; then invite only; at most two.
- [ ] D-018-3 single-use 7-day invite, hashed at rest, link built by the browser.
- [ ] D-018-4 parent A resets parent B.
- [ ] D-018-5 documented recovery for parent A.
- [ ] D-018-6 name and password rules.
- [ ] D-018-7 sessions carry `parentType`, old sessions keep working.
- [ ] D-018-8 sign-up signs in and joins the household.

## API (all under `/api/v1/auth`, JSON)
- `GET /signup-status` (public) → `{ mode: 'env' | 'db', firstAccountOpen: boolean }`.
- `GET /invites/:token` (public, rate-limited) → `{ valid: boolean }`.
- `POST /signup` (public, rate-limited) `{ username, password, inviteToken? }` → `200` login body + cookie; errors `400 invalid` (with the failing field), `403 invite_required`, `403 invite_invalid`, `409 username_taken`, `409 signup_closed`.
- `POST /invites` (signed in, `PARENT_A`, `db` mode, parent B absent) → `{ token, expiresAt }`; `403 forbidden` for parent B; `409 signup_closed` in `env` mode or when parent B exists.
- `POST /parent-b/reset` (signed in, `PARENT_A`, `db` mode, parent B present) → `{ token, expiresAt }`.
- `GET /me` additionally returns `{ mode, partnerExists }` so Settings knows which card state to show.
- `POST /login`: in `db` mode it checks the `users` collection; in `env` mode `APP_USERS`, as today. Same timing for an unknown name (`DUMMY_HASH`).

## Atomic Sub-tasks

- [ ] S1: Let the server start without a user list and choose where accounts come from — `APP_USERS` no longer required in production, `accountsMode` in config, config tests — server/config.js, server/test/config.test.js
- [ ] S2: Store the parents' accounts and invite links in the database with safe indexes — `users` (unique lower-case username, unique `parentType`), `invites` (token hash, `expiresAt` TTL index, `usedAt`), sessions gain `parentType` and a delete-by-username — server/repositories/**
- [ ] S3: Check who may sign up and which parent they become in one rule module — first account open while no parent A, invite needed after, closed at two, name and password rules; unit test beside it — server/domain/accounts.js, server/domain/accounts.test.js
- [ ] S4: Add the sign-up, invite and reset endpoints and make login read accounts from the right place — routes per the API section, rate limits, sessions store parentType, requireAuth reads it with the old fallback — server/routes/auth.js, server/middleware/auth.js, server/app.js
- [ ] S5: Prove every sign-up rule on the server, including the race and the reset — server/test/signup.test.js, server/test/auth.test.js
- [ ] S6: Show a create-account form on the login page while the first place is free — AuthService gains signupStatus, signup, checkInvite; password typed twice; Hebrew texts — src/app/core/services/auth.service.ts, src/app/pages/login/**, src/app/core/i18n/he.ts
- [ ] S7: Let the second parent join from the invite link — new public route join/:token, invalid-link message with a link to sign in — src/app/pages/join/**, src/app/app.routes.ts
- [ ] S8: Let parent A create, share and renew the invite and reset parent B from Settings — second-parent card, confirm dialog for the reset, copy and share — src/app/pages/settings/**
- [ ] S9: Document the Render settings and how to recover a lost first-parent password — drop APP_USERS from render.yaml, update .env.example comments, accounts how-to, current state — render.yaml, server/.env.example, docs/project/accounts.md, docs/project/current-state.md, README.md
- [ ] S10: Make sure the existing sign-in tests still pass with the slots' user list — e2e specs unchanged in env mode; fix any that break — e2e/**

## Technical Considerations
- **Security surface (auth):** invite tokens are 32 random bytes, stored only as SHA-256, compared by hash lookup; single use is enforced atomically (`findOneAndUpdate` with `usedAt: null` → set `usedAt`), not read-then-write. The unique `parentType` index is the real two-user limit; the rule module is the friendly message. Sign-up, invite check and login share the login rate limiter. Error bodies never say whether a name exists except `username_taken` on sign-up (acceptable: two users, sign-up closes). Passwords and tokens never reach logs.
- **Human validation server (Isolated DB):** the Worker starts the slot's backend with `APP_USERS` empty and `MONGODB_URI` pointing at a fresh database on the dev cluster, `baby-app-signup-check` (same seed-list URI as `server/.env`, only the database name changed). Drop that database after validation. Never use `baby-app` (production).
- **Prod after merge:** Render needs only `MONGODB_URI`, `SESSION_SECRET` and the optional Cloudinary keys. The prod `users` collection starts empty, so the Human creates parent A right after the first deploy.
- e2e: one spec file at a time (login rate limit); the slots keep `APP_USERS`, so the existing sign-in specs run unchanged.

## Out of Scope
Email, password reset by email, more than two users, several households, changing your own password in Settings, deploy itself.

## Critical Questions
- none

## Execution Notes
- none yet
