# Active Tasks

### Plan 026 — Minimize any container on the home screen
- [ ] M1: Store which home containers a household minimized — server/domain/tracker/settings.js, src/app/core/models/tracker-settings.ts
- [ ] M2: Move the edit-layout mode from the quick grid to the whole home page — src/app/pages/tracker/home-layout.service.ts, quick-grid, log-page
- [ ] M3: Add a home container that folds to one bar — src/app/pages/tracker/home-card/**
- [ ] M4: Wrap the five home containers in it — src/app/pages/tracker/log-page/**
- [ ] M5: Stop the Settings export dates from pushing the page sideways on a narrow phone — src/app/pages/settings/export-card/**
- [ ] M6: Prove it in the real app — e2e/026-1-minimize-cards.spec.ts, e2e/026-2-export-dates.spec.ts
