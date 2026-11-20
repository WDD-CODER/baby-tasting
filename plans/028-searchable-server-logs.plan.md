# Plan 028 — Searchable server logs: one request id from the phone's error message to the server's log line

Status: draft
Depends-on: 027
Snapshot: f0e48f9074b3c46f0f0d1a22712780cf720d6a32
Source: the Human, 2026-11-19, after the foodVibe comparison: "plan for 1 and 5" — item 5: foodVibe logs every request as structured JSON with a request id (`foodVibe1.0/server/logger.js`, pino), keeps warnings and errors in a Mongo `app_logs` collection and reads them with `scripts/log-query.mjs`. baby-tasting writes one `console.log` line per request (`server/middleware/request-logger.js`) and `console.error` for crashes, which Render keeps only briefly and which cannot be tied to the phone that saw the error.

## Problem Statement
When a save fails on a phone ("the feed didn't save"), nothing links what the parent saw to a server line. Server output is free text with no request id, no household and no level, and an unexpected error (500) prints a stack to stdout only.

## Decisions
- **D-028-1 (Planner)** One pino logger (`server/lib/logger.js`), JSON lines on stdout. Level: `LOG_LEVEL`, else `info` in production and `debug` elsewhere; `silent` under `node --test` unless `LOG_LEVEL` is set. `LOG_PRETTY=1` is not added (plain JSON everywhere; no pino-pretty dependency).
- **D-028-2 (Planner)** Every request gets an id: the incoming `X-Request-Id` when it is 1–64 characters of `[A-Za-z0-9-]`, else `crypto.randomUUID()`. The response carries it in `X-Request-Id`; `req.log` is a child logger with it.
- **D-028-3 (Planner)** One line per finished request, `event: 'http.request'`: method, path without the query, status, ms, and `householdId` when signed in. 5xx → `error`, everything else → `info`. No headers, cookies, IP, body or username in any line; the logger also redacts `*.password`, `*.token`, `*.cookie`, `*.authorization`.
- **D-028-4 (Planner)** An unexpected error (the error handler's 500 path) logs `event: 'http.unhandled'` with the error, and the 500 answer adds `requestId` beside `code` and `message` (INV-4: still plain JSON).
- **D-028-5 (Planner)** `warn` and `error` records are also written to a new Mongo collection `app_logs` through a new repository (INV-2), kept 30 days by a TTL index. The write never blocks a request and never throws into it; with no database (tests without one) it is skipped.
- **D-028-6 (Planner)** The app shows the error code: when a failed save's answer carries `requestId`, the existing save-error message adds ` · קוד תקלה: <first 8 characters>`, so a parent can read it out and `tools/log-query.mjs --request <code>` finds the line.
- **D-028-7 (Planner)** `console.*` is banned in `server/` (except `server/test/**`, `server/seed/**` and `server/lib/gen-icon-names.mjs`, which are command-line tools) by a small check `tools/check-no-server-console.mjs` added to `pnpm run lint`; no server ESLint config is added.

## Goals & Success Criteria
**Primary:** a failed request on a phone can be found in the logs from the code the app shows.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0 (includes `node tools/check-no-server-console.mjs`, which prints `SERVER_CONSOLE: none`).
- [auto] `pnpm run test` exits 0 (server tests included).
- [auto] `node --test server/test/logger.test.js` passes with these cases: a response carries `X-Request-Id`, the same one when the request sent a valid one and a new one when it sent `bad id!`; a route that throws answers 500 with `requestId` equal to the header, and an `http.unhandled` record at level error with that id is captured; a request with a `Cookie` header produces a record with no cookie value; an `error` record lands in `app_logs` with `requestId`, `event`, `level`, `at`; `http.request` records carry no `username`.
- [auto] `node tools/log-query.mjs --since 1h --level error` with no database variable prints `SKIP: no database configured` and exits 0.
- [auto] The client unit test for the save-error text: an `ApiError` with `requestId: 'abcdef1234'` and code `internal` gives the fallback text followed by ` · קוד תקלה: abcdef12`.
- [human] On the deployed app, Render's log shows one JSON line per request with a `requestId`.

## Execution Mode
- Parallel: yes
- Concurrent plans: 026
- Isolated DB: no
- Reviewer: gate

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/package.json
server/pnpm-lock.yaml
server/lib/logger.js
server/middleware/request-logger.js
server/middleware/error-handler.js
server/app.js
server/index.js
server/routes/reactions.js
server/repositories/app-logs-repository.js
server/repositories/index.js
server/repositories/indexes.js
server/test/logger.test.js
tools/check-no-server-console.mjs
tools/log-query.mjs
package.json
src/app/core/models/api-error.ts
src/app/core/services/api.service.ts
src/app/pages/tracker/tracker-errors.ts
src/app/pages/tracker/tracker-errors.spec.ts
src/app/core/i18n/he.ts
docs/agent/standards-backend.md
docs/project/plan-checks.md
docs/project/current-state.md
docs/brain/component-families.md
```

## Read Scope

Entire repo, plus `C:\coding projects\Cursor\foodVibe1.0\server\logger.js` and `C:\coding projects\Cursor\foodVibe1.0\scripts\log-query.mjs` as models to adapt (foodVibe is CommonJS; baby-tasting's server is ES modules). Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-2: preserves — `app_logs` is written only by `server/repositories/app-logs-repository.js`; the logger receives the repository's write function at start-up (`app.js`), so `server/lib/logger.js` and the middleware never import the driver.
- INV-3: preserves — the request middleware reads `req.householdId` after the auth middleware set it; it does not read sessions or cookies.
- INV-4: preserves — the 500 answer stays plain JSON under `/api/v1/` and only gains `requestId`.
- INV-1: preserves — no domain file changes.
- INV-5, INV-6: preserves — no style or calendar change.

## Backend Impact
- New collection `app_logs`: `{ at: Date, level: 'warn'|'error', event, message (≤ 500 chars), requestId|null, householdId|null, path|null, status|null, err: { name, message } | null }`, TTL index on `at` (30 days). Registered in `docs/agent/standards-backend.md` §1. No household data, no usernames, no bodies.
- New dependency `pino` in `server/package.json`.
- Environment: optional `LOG_LEVEL`. No new secret.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, when a save fails I see a short code I can pass on.
- As the Human, I find what went wrong from that code without guessing the time.

## Functional Requirements

### Must Have (P0)
- [ ] Structured JSON logs with a request id on every request.
- [ ] Warnings and errors kept 30 days and searchable by a tool.
- [ ] The error code shown in the app's save-error message.
- [ ] No `console.*` left in server code.

## Reuse Check
- Server logger (server/lib/logger.js) — family: none — rung: 4 — why: the server has no logger; one module is the single place every route and middleware logs through
- App logs store (server/repositories/app-logs-repository.js) — family: none — rung: 4 — why: a new collection needs its own repository under INV-2; it follows base-repository.js
- Log query tool (tools/log-query.mjs) — family: none — rung: 4 — why: no tool reads logs; adapted from foodVibe's scripts/log-query.mjs
- Server console check (tools/check-no-server-console.mjs) — family: none — rung: 4 — why: same shape as tools/check-no-hex.mjs, a different rule

## Defaults
- audit-on-write — exception — why: log records are not household data; nothing a parent edits is written
- icon-slots — exception — why: the only UI change is text in an existing message, no icon

## UI/UX Notes
- New Hebrew key beside the tracker log texts: `errorCode: 'קוד תקלה'`. Shown only when the answer carries `requestId`; the message is otherwise unchanged.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] M1: Add one structured logger for the whole server — pino dependency; level and redaction per D-028-1/D-028-3; an `attachSink(write)` that sends `warn`+ records to a sink function without blocking or throwing; `silent` under node --test unless LOG_LEVEL is set — server/package.json, server/pnpm-lock.yaml, server/lib/logger.js
- [ ] M2: Give every request an id and one log line — rewrite the request middleware per D-028-2/D-028-3 (`req.id`, `req.log`, `X-Request-Id` header, `http.request` line on finish with `householdId` when set) — server/middleware/request-logger.js, server/app.js
- [ ] M3: Log unexpected errors with the id and return it to the app — error handler per D-028-4; replace every `console.*` in server code with the logger (`app.js` index creation, `index.js` start-up and fatal error, `routes/reactions.js` photo delete as `warn`) — server/middleware/error-handler.js, server/app.js, server/index.js, server/routes/reactions.js
- [ ] M4: Keep warnings and errors for 30 days in the database — `app-logs-repository.js` (`write(entry)`, `query({ since, level, requestId, limit })`), TTL index in `indexes.js`, export from `repositories/index.js`, attach the sink in `app.js` when a database is configured; register `app_logs` in the backend standard — server/repositories/app-logs-repository.js, server/repositories/index.js, server/repositories/indexes.js, server/app.js, docs/agent/standards-backend.md
- [ ] M5: Find a problem from the code the app shows — `tools/log-query.mjs` (`--since <ISO|30m|2h|1d>`, `--level warn|error`, `--request <id or first 8 characters>`, `--limit`), reads the database address from the environment and never prints it; no database → `SKIP: no database configured`, exit 0 — tools/log-query.mjs
- [ ] M6: Show the error code in the app's save-error message — `ApiError.requestId?` filled from the error body in `api.service.ts`; `saveErrorText` appends ` · קוד תקלה: <first 8>` on its fallback path; spec — src/app/core/models/api-error.ts, src/app/core/services/api.service.ts, src/app/pages/tracker/tracker-errors.ts, src/app/pages/tracker/tracker-errors.spec.ts, src/app/core/i18n/he.ts
- [ ] M7: Keep console calls out of server code and prove the logging — `tools/check-no-server-console.mjs` per D-028-7, appended to the `lint` script; `server/test/logger.test.js` per the [auto] item (capture records through a test sink) — tools/check-no-server-console.mjs, package.json, server/test/logger.test.js
- [ ] M8: Record the new checks — add to the plan checklist's Success criteria: "a plan that touches server code has `[auto] node tools/log-query.mjs --since <plan start> --level error` → no entries"; one line in current-state on logs and the tool — docs/project/plan-checks.md, docs/project/current-state.md

## Technical Considerations
- Dependencies: plan 027 creates `docs/project/plan-checks.md`, which M8 appends to.
- New files needed: `server/lib/logger.js`, `server/repositories/app-logs-repository.js`, `server/test/logger.test.js`, `tools/log-query.mjs`, `tools/check-no-server-console.mjs`, `src/app/pages/tracker/tracker-errors.spec.ts`.
- Model changes: `ApiError.requestId?: string`.
- Backend / API: no new route; the 500 body gains `requestId`; every response gains `X-Request-Id` (allowed by the existing CORS and helmet setup — check `exposedHeaders` if the app needs to read the header; the plan reads the body, not the header).
- Auth and validation: no change; the incoming `X-Request-Id` is length- and character-checked before use.
- Security surface: logs never hold cookies, tokens, passwords, usernames, bodies or IPs; `app_logs` is not readable through any route; the query tool runs only on a machine that already has the database address.
- Data / migration: new collection with a TTL index created at start-up; nothing to migrate.
- Project checks: per `docs/project/plan-checks.md` (plan 027).

## Out of Scope
- Logging from the browser (client errors to the server).
- A logs page in the app, alerts, or an external log service.
- Changing Render's log settings.

## Critical Questions
- none.

## Execution Notes
- none yet
