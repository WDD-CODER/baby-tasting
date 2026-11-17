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

### Plan 002 — Sign-in with a username, one shared household and the baby profile

- [ ] B1: Store sessions, the household and the baby through repositories so no route touches the database
- [ ] B2: Sign parents in by username only, with a 180-day cookie and a login rate limit
- [ ] B3: Protect every API route with one middleware that says who is asking
- [ ] B4: Save and read the one baby both parents share
- [ ] B5: Let end-to-end tests start from an empty household without touching real data
- [ ] B6: Prove the sign-in rules on the server
- [ ] B7: Keep sign-in state in one frontend service and guard the app
- [ ] B8: Build the sign-in page
- [ ] B9: Ask for the baby on first use and show the baby in the top bar
- [ ] B10: Put the baby form and sign-out in Settings with the leave-protection
- [ ] B11: Write the UI checks and a sign-in helper for every later test
- [ ] B12: Note what now exists

### Plan 003 — Food and allergen catalog the parents can extend and edit

- [ ] C1: Write the built-in catalog once as data
- [ ] C2: Store allergens and foods per household through repositories
- [ ] C3: Seed the catalog once per household and never overwrite the parents' edits
- [ ] C4: Offer catalog routes with archive instead of delete once used
- [ ] C5: Keep the catalog in one frontend service
- [ ] C6: Build the foods page with search and filters
- [ ] C7: Build the food form with an inline new-allergen option and an emoji picker
- [ ] C8: Let parents manage allergens
- [ ] C9: Write the UI checks
- [ ] C10: Note what now exists

### Plan 004 — Calendar core: the home screen where parents plan and record every meal

- [ ] D1: Write the calendar rules as pure functions
- [ ] D2: Store calendar items through the repository
- [ ] D3: Offer the calendar API with R4 enforced on the server
- [ ] D4: Show which foods were tried on the foods list
- [ ] D5: Keep calendar state in one service with optimistic writes and refresh
- [ ] D6: Leave named places for alerts, badges and suggestions
- [ ] D7: Build the calendar page with week and month views
- [ ] D8: Add, act on and move items from sheets
- [ ] D9: Drag items between meals and days, with touch
- [ ] D10: Write every string into the dictionary and the item-state rules into DESIGN.md
- [ ] D11: Write the UI checks
- [ ] D12: Note what now exists

### Plan 005 — Allergen rules engine, alerts on the calendar and the allergens page

- [ ] E1: Put the rule values and their ranges in one pure module
- [ ] E2: Compute every allergen's state and alerts from the history in one pure function
- [ ] E3: Store the household's rule values
- [ ] E4: Serve states, alerts and settings
- [ ] E5: Load states and alerts in one frontend service
- [ ] E6: Show alerts and state badges on the calendar
- [ ] E7: Build the allergens page and the allergen detail page
- [ ] E8: Record the state colours and badge shapes
- [ ] E9: Write the UI checks
- [ ] E10: Note what now exists

### Plan 006 — Week suggestions: which queued food and allergen on which day

- [ ] F1: Add the two suggestion settings to the rule module
- [ ] F2: Propose a week as a pure, deterministic function
- [ ] F3: Store the tasting queue on the foods
- [ ] F4: Preview and accept suggestions
- [ ] F5: Let parents queue and order foods
- [ ] F6: Show suggestions in the week view
- [ ] F7: Dictionary and design notes
- [ ] F8: Write the UI checks
- [ ] F9: Note what now exists

### Plan 007 — Reactions with photos, and locks on the suspected foods until a parent releases them

- [ ] G1: Store reactions and locks through repositories
- [ ] G2: Layer locks onto the engine
- [ ] G3: Refuse placing locked foods and flag their planned items
- [ ] G4: Record reactions and lock on save
- [ ] G5: Release locks explicitly
- [ ] G6: Reach Cloudinary through one adapter that tolerates missing keys
- [ ] G7: Upload photos from the phone, resized first
- [ ] G8: Build the reaction page and the reactions list
- [ ] G9: Show locks and release them where they appear�; add-food and drop refusals use the `food_locked` message; `תגובה` action in the item actions sheet; foods page 🔒; allergens page `נעול` chip and `שחרור` with confirm; `locked` alert text and tap target — src/app/pages/calendar/**, src/app/pages/foods/**, src/app/pages/allergens/**, src/app/core/i18n/he.ts
- [ ] G10: Design notes
- [ ] G11: Write the UI checks
- [ ] G12: Note what now exists, including that photos need the three Cloudinary values

### Plan 008 — Food detail, progress summary, the settings page and the activity log

- [ ] H1: Compute the progress summary as a pure function
- [ ] H2: Read the latest changes from the audit fields
- [ ] H3: Reset rule values and remember the hint per user
- [ ] H4: Build the food detail page
- [ ] H5: Show the progress summary on the foods page
- [ ] H6: Complete the settings page
- [ ] H7: Show the calendar hint once per user
- [ ] H8: Dictionary and design notes
- [ ] H9: Write the UI checks
- [ ] H10: Note what now exists

### Plan 009 — Tracker base: password sign-in that stays on, five-tab navigation, baby profile, Tracker settings, icon slots

- [ ] K1: Sign in with a password and keep each phone signed in until sign-out
- [ ] K2: Store the Tracker settings and the baby's birth weight
- [ ] K3: Give every icon a named slot from one library so parents can change it later
- [ ] K4: Move Tasting under its own section and add the five-tab navigation
- [ ] K5: Show who is signed in and add the Tracker section to Settings
- [ ] K6: Write the UI checks and update the docs

### Plan 010 — Tracker events and sleep: data model, rules and API

- [ ] L1: Write the Tracker event and sleep rules as pure functions
- [ ] L2: Store events through one repository
- [ ] L3: Offer the events and sleep API
- [ ] L4: Note what now exists

### Plan 011 — Tracker log tab: today at a glance, quick actions, entry sheets, sleep timer and daily trackers

- [ ] M1: Load and refresh the Tracker data in one service
- [ ] M2: Add the per-event colours and icon slots
- [ ] M3: Build the shared 24-hour date-time picker
- [ ] M4: Build the log page
- [ ] M5: Build the entry sheets and the sleep flow
- [ ] M6: Write the UI checks

### Plan 012 — Tracker timeline and the shared edit and delete sheet

- [ ] N1: Build the timeline page
- [ ] N2: Build one edit sheet for every event type
- [ ] N3: Write the UI checks

### Plan 013 — Tracker statistics computed on the server and the six dashboard sections

- [ ] O1: Compute every statistic in pure functions
- [ ] O2: Serve them
- [ ] O3: Build the statistics page
- [ ] O4: Write the UI checks

### Plan 014 — Tracker settings, icon picker, Excel export, data reset and installable app

- [ ] P1: Build the icon picker
- [ ] P2: Complete the Tracker settings
- [ ] P3: Export the Excel report
- [ ] P4: Make the app installable
- [ ] P5: Write the UI checks

### Plan 018 — Sign-up for the two parents with an invite link, so Render needs no user list

- [ ] S1: Let the server start without a user list and choose where accounts come from
- [ ] S2: Store the parents' accounts and invite links in the database with safe indexes
- [ ] S3: Check who may sign up and which parent they become in one rule module
- [ ] S4: Add the sign-up, invite and reset endpoints and make login read accounts from the right place
- [ ] S5: Prove every sign-up rule on the server, including the race and the reset
- [ ] S6: Show a create-account form on the login page while the first place is free
- [ ] S7: Let the second parent join from the invite link
- [ ] S8: Let parent A create, share and renew the invite and reset parent B from Settings
- [ ] S9: Document the Render settings and how to recover a lost first-parent password
- [ ] S10: Make sure the existing sign-in tests still pass with the slots' user list

### Plan 019 — Production build loads its full stylesheet, so icons and styles work behind the security policy

- [ ] F1: Stop the production build from relying on an inline script the security policy blocks
- [ ] F2: Note the build rule so it is not turned back on
