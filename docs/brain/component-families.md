DRAFT — written by the kit's scan on 2026-11-18; review every family, then delete this line

# Component families — what to reuse before you build

The single list of this project's shared pieces ("families"): for each job, which piece to use, where it lives and when.
Before you create a component, util, pipe, service or class, find its family here, or say in the plan's `## Reuse Check`
why a new one is needed.

Reuse enforced from plan: 1

`node scripts/scope-check.mjs --reuse --plan=<path>` blocks a plan (numbered from the line above, or any plan that has the
section) whose `## Reuse Check` is missing or incomplete. `node scripts/inventory.mjs` writes the short list agents read
(`docs/brain/inventory.md`) from this file and the code.

## Format

One heading per family, then bullet fields:

```
### <family-id> — <title>

- selector: the class or component selector a template uses
- when: the one line that says when to use it
- files: the repo paths that hold it
```

## Families

<!-- Add one `### <family-id> — <title>` block per family below. -->

### activity-summary — Activity Summary

- selector: (fill in)
- when: (fill in)
- files: `server/lib/activity-summary.js`

### audit — Audit

- selector: (fill in)
- when: (fill in)
- files: `server/lib/audit.js`

### calendar-create — Calendar Create

- selector: (fill in)
- when: (fill in)
- files: `server/lib/calendar-create.js`

### catalog-validation — Catalog Validation

- selector: (fill in)
- when: (fill in)
- files: `server/lib/catalog-validation.js`

### cloudinary — Cloudinary

- selector: (fill in)
- when: (fill in)
- files: `server/lib/cloudinary.js`

### context — Context

- selector: (fill in)
- when: (fill in)
- files: `server/lib/context.js`

### dates — Dates

- selector: (fill in)
- when: (fill in)
- files: `server/lib/dates.js`

### http-error — Http Error

- selector: (fill in)
- when: (fill in)
- files: `server/lib/http-error.js`

### locks — Locks

- selector: (fill in)
- when: (fill in)
- files: `server/lib/locks.js`

### tracker-export — Tracker Export

- selector: (fill in)
- when: (fill in)
- files: `server/lib/tracker-export.js`

### activity — Activity

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/activity.service.ts`

### allergen-status — Allergen Status

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/allergen-status.service.ts`

### api — Api

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/api.service.ts`

### auth — Auth

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/auth.service.ts`

### baby — Baby

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/baby.service.ts`

### calendar — Calendar

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/calendar.service.ts`

### catalog — Catalog

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/catalog.service.ts`

### confirm-dialog — Confirm Dialog

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/confirm-dialog.service.ts`

### double-submit — Double Submit

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/double-submit.service.ts`

### edit-sheet — Edit Sheet

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/edit-sheet.service.ts`

### locks-2 — Locks 2

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/locks.service.ts`

### photo-upload — Photo Upload

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/photo-upload.service.ts`

### progress — Progress

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/progress.service.ts`

### pwa-install — Pwa Install

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/pwa-install.service.ts`

### reactions — Reactions

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/reactions.service.ts`

### settings — Settings

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/settings.service.ts`

### shell — Shell

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/shell.service.ts`

### suggestions — Suggestions

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/suggestions.service.ts`

### toast — Toast

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/toast.service.ts`

### tracker-events — Tracker Events

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/tracker-events.service.ts`

### tracker-settings — Tracker Settings

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/tracker-settings.service.ts`

### tracker-stats — Tracker Stats

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/tracker-stats.service.ts`

### user-prefs — User Prefs

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/services/user-prefs.service.ts`

### age — Age

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/utils/age.ts`

### alerts — Alerts

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/utils/alerts.ts`

### calendar-rules — Calendar Rules

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/utils/calendar-rules.ts`

### conflict-message — Conflict Message

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/utils/conflict-message.ts`

### dates-2 — Dates 2

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/utils/dates.ts`

### israel-time — Israel Time

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/utils/israel-time.ts`

### tracker-rules — Tracker Rules

- selector: (fill in)
- when: (fill in)
- files: `src/app/core/utils/tracker-rules.ts`

### icon-font — Icon Font

- selector: (none — a root service)
- when: switch the app icons from the small icon font to the full Material Symbols font on demand
- files: `src/app/core/icons/icon-font.service.ts`

### server-logger — Server logger

- selector: (none — a server module)
- when: log from server code with a request id instead of console
- files: `server/lib/logger.js`

### app-logs-store — App logs store

- selector: (none — a repository)
- when: read or write the searchable server log records in Mongo
- files: `server/repositories/app-logs-repository.js`

### log-query — Log query tool

- selector: (none — a CLI)
- when: search the stored server logs by time, level or request id
- files: `tools/log-query.mjs`

### server-console-check — Server console check

- selector: (none — a CLI check)
- when: fail the build when server code calls console directly
- files: `tools/check-no-server-console.mjs`

### home-card — Home Card

- selector: `app-home-card` (class `.hc`)
- when: wrap a home-page container that a parent can minimize to one bar (title, slot icon, chevron)
- files: `src/app/pages/tracker/home-card/home-card.ts`

### home-layout — Home Layout

- selector: (none — a root service)
- when: the page-wide edit-layout mode of the home page and its single save (quick-action order, minimized buttons and containers)
- files: `src/app/pages/tracker/home-layout.service.ts`
