# End-to-end tests

One short Playwright test per `[ui]` Done-when item (`docs/agent/job-validation.md` Tier 1b), named after the plan and
item (`e2e/<NNN>-<n>-<slug>.spec.ts`), each saving one screenshot under `e2e/screens/`.

The tests need the app running: `node scripts/slot-serve.mjs --main` in the main folder (frontend 4200, backend 3000),
or in a slot `node scripts/slot-serve.mjs` and `E2E_BASE_URL=http://localhost:420N`. Then `pnpm run e2e`.
Sign-in uses the first name in the server's `APP_USERS` (`E2E_USERNAME` overrides it).
