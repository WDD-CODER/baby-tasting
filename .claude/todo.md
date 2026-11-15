# Active Tasks

### Plan 001 — Foundation: app shell, design system, server base and Render file

- [ ] A1: Bring in the approved end-to-end test harness so every later plan can write its UI checks
- [ ] A2: Write the design rule book every reviewer checks against�, alert = `--color-tier-bad`), item states (planned outline, given filled + ✓, skipped 50% opacity + line-through, suggested dashed outline), the shared component list with their inputs, do/don't list, and a section `## Open design decisions` where each choice this plan makes that section 6 does not cover gets one line `- D-n: <choice> — reverse: <how>` (the Human reviews these) — DESIGN.md
- [ ] A3: Record the architecture rules the gate enforces
- [ ] A4: Write the standing product behaviours once so no plan repeats them
- [ ] A5: Define every colour, size and font once as tokens so screens never hard-code a value
- [ ] A6: Fail the lint when a colour literal sneaks into a screen
- [ ] A7: Put all Hebrew text in one dictionary file so no template holds an inline string
- [ ] A8: Build the shared visual pieces once, each with inputs for its variants
- [ ] A9: Give confirmation, toasts and leave-protection one code path each
- [ ] A10: Talk to the server through one client with one error path
- [ ] A11: Build the app shell and the four empty pages so the app has its final navigation� 🍎 ⚠️ ⚙️, safe-area padding; hosts toast + confirm dialog); `src/app/core/services/shell.service.ts`; routes in `src/app/app.routes.ts`: `''` → `pages/calendar`, `foods` → `pages/foods`, `allergens` → `pages/allergens`, `settings` → `pages/settings`, each lazy (`loadComponent`) and rendering `app-empty-state` with its `HE.pages.*` text; wildcard → `''`; remove `pages/placeholder`; update `src/app/app.spec.ts` — src/app/layout/**, src/app/pages/**, src/app/app.routes.ts, src/app/app.ts, src/app/app.html, src/app/app.spec.ts
- [ ] A12: Add a development-only page that shows every shared piece in every variant
- [ ] A13: Move the server to its final layout and validate its environment at start
- [ ] A14: Give the server one database connection and one repository base so routes never touch the driver
- [ ] A15: Answer every failure in one JSON shape and log every request
- [ ] A16: Serve the Angular build from the same server so one Render service hosts everything
- [ ] A17: Describe the production service and every environment variable
- [ ] A18: Write the UI checks for the shell and the demo page

