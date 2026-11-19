# Active Tasks

### Plan 026 — Minimize any container on the home screen
- [ ] M1: Store which home containers a household minimized — server/domain/tracker/settings.js, src/app/core/models/tracker-settings.ts
- [ ] M2: Move the edit-layout mode from the quick grid to the whole home page — src/app/pages/tracker/home-layout.service.ts, quick-grid, log-page
- [ ] M3: Add a home container that folds to one bar — src/app/pages/tracker/home-card/**
- [ ] M4: Wrap the five home containers in it — src/app/pages/tracker/log-page/**
- [ ] M5: Stop the Settings export dates from pushing the page sideways on a narrow phone — src/app/pages/settings/export-card/**
- [ ] M6: Prove it in the real app — e2e/026-1-minimize-cards.spec.ts, e2e/026-2-export-dates.spec.ts

### Plan 027 — Write this project's own plan checklist so every plan gets the same phone, Hebrew and reuse checks
- [ ] M1: Write the project plan checklist the plan review reads — docs/project/plan-checks.md
- [ ] M2: Note the new checklist in the project state — docs/project/current-state.md

### Plan 028 — Searchable server logs: one request id from the phone's error message to the server's log line
- [ ] M1: Add one structured logger for the whole server — server/lib/logger.js
- [ ] M2: Give every request an id and one log line — server/middleware/request-logger.js
- [ ] M3: Log unexpected errors with the id and return it to the app — server/middleware/error-handler.js
- [ ] M4: Keep warnings and errors for 30 days in the database — server/repositories/app-logs-repository.js
- [ ] M5: Find a problem from the code the app shows — tools/log-query.mjs
- [ ] M6: Show the error code in the app's save-error message — src/app/pages/tracker/tracker-errors.ts
- [ ] M7: Keep console calls out of server code and prove the logging — tools/check-no-server-console.mjs, server/test/logger.test.js
- [ ] M8: Record the new checks — docs/project/plan-checks.md
