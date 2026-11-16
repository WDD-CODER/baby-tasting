# End-to-end tests

One short Playwright test per `[ui]` Done-when item (`docs/agent/job-validation.md` Tier 1b), named after the plan and
item (`e2e/<NNN>-<n>-<slug>.spec.ts`), each saving one screenshot under `e2e/screens/`.

The tests need the app running: `node scripts/slot-serve.mjs --main` in the main folder (frontend 4200, backend 3000),
or in a slot `node scripts/slot-serve.mjs` and `E2E_BASE_URL=http://localhost:420N`. Then `pnpm run e2e`.
Tests sign in as `E2E_USERNAME` (default `parent-a`, so `APP_USERS` must contain it). The backend must run with
`E2E_RESET=1` on an end-to-end database: tests call `POST /api/v1/test/reset` (`E2E_API_URL`, default
`http://localhost:3000`), which empties every collection, so each test signs in again. Helpers: `e2e/support/session.ts`.
