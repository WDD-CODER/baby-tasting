# Plan 014 — Tracker settings, icon picker, Excel export, data reset and installable app

Status: draft
Depends-on: 013
Snapshot: 5f881b2abe79c9e8ee8ca2424032619b6818bae0
Source: docs/briefs/tracker/brief-T6-settings-export-pwa.md (program P1, P7, F7, F11; spec-log-settings §8, §9; spec-server-data §5, §7.4)

## Problem Statement
Everything the old Settings tab did must work in the new Settings page, parents must be able to choose any icon from the library, and the app must install on the phone.

## Goals & Success Criteria
**Primary:** Settings `מעקב תינוק` complete, `אייקונים` picker, Excel export with 7 sheets, data reset, Angular PWA.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0 (Karma and every server test).
- [auto] `node --test server/test/tracker-export.test.js` exits 0: the export of a fixed data set returns a workbook with the 7 sheets named as in spec-server-data §5 (right-to-left), the file name `baby_tracker_report_YYYY-MM-DD.xlsx`, and the weight column shows each day's latest weigh-in (F11).
- [ui] In Settings → `אייקונים`, choosing `nights_stay` for the sleep quick button shows it on `/`; `איפוס לברירת מחדל` brings the default back.
- [ui] In Settings, `ייצוא` downloads a file named `baby_tracker_report_<today>.xlsx`.
- [ui] Adding the custom activity `בריכה` shows it in the activity sheet's options on `/`.
- [ui] Delete-from-date with yesterday's date removes yesterday's events and keeps today's (F7).
- [human] The app installs on the phone's home screen and opens full screen; the icon picker makes finding a fitting icon easy.

## Execution Mode
- Parallel: no
- Concurrent plans: none (Tracker plans 009–014 run in order)
- Isolated DB: no
- Reviewer: gate

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

Planner decision: `src/app/app.routes.ts` gets one appended child route (`settings/icons`); nothing existing changes.

```scope
package.json
pnpm-lock.yaml
angular.json
ngsw-config.json
public/**
src/index.html
src/manifest.webmanifest
src/app/app.config.ts
server/app.js
server/package.json
server/pnpm-lock.yaml
server/domain/**
server/routes/**
server/lib/**
server/test/**
src/app/core/**
src/app/shared/**
src/app/pages/settings/**
src/app/pages/tracker/**
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

- INV-1: preserves — the sheet-row mapping for the export is a pure function in `server/domain/tracker/export-rows.js`; `exceljs` is used only in `server/lib/tracker-export.js`.
- INV-2: preserves — data read through repositories.
- INV-4: preserves — `/api/v1/tracker/export/xlsx`.
- INV-5: preserves — the picker uses shared components; icons via `app-icon`.
- INV-3: preserves — new routes sit behind the existing auth middleware and read `req.user` and `req.householdId` only.
- INV-6: preserves — no calendar or tasting placement code is touched.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, I replace an icon I find unclear with one I recognise, and my partner sees it too.
- As a parent, I export two weeks for the doctor.

## Functional Requirements

### Must Have (P0)
- [ ] Settings per spec §8 (legend, export card, parents and default bottle, baby profile, custom activities, data management with both reset modals — F7, install card).
- [ ] Icon picker (P7).
- [ ] Excel export (spec-server-data §5, F11).
- [ ] Angular service worker and manifest (spec §9, spec-server-data §7.4).

## UI/UX Notes
- Settings section order and texts per spec-log-settings §8.2–8.7 inside the `מעקב תינוק` section; a row `אייקונים` opens `/settings/icons`.
- `/settings/icons`: groups (`ניווט`, `פעולות מהירות`, `סוגי אירועים`, `מיקומי שינה`, `כרטיסים`), each slot as a row (current icon, Hebrew label); tap → bottom sheet with a search field (English icon names; the slot's Hebrew keywords as quick chips), a CDK virtual-scroll grid of every name in `icon-names.ts` (48px cells), the current choice highlighted, `שמירה`, `איפוס לברירת מחדל`.

## Atomic Sub-tasks

- [ ] P1: Build the icon picker — `src/app/pages/settings/icons-page/` and `icon-picker-sheet/` per UI notes; saves `iconOverrides` through `TrackerSettingsService`; route `settings/icons` (append) — src/app/pages/settings/**, src/app/app.routes.ts
- [ ] P2: Complete the Tracker settings — legend sub-screen, parents/default bottle, baby profile, custom activities, data management with the two reset modals (delete-from-date inclusive — F7; delete all), install card, per spec §8 — src/app/pages/settings/**, src/app/core/**
- [ ] P3: Export the Excel report — add `exceljs` to `server/package.json`; `server/domain/tracker/export-rows.js` (rows per sheet, Hebrew value mappings of spec §5.3–5.9, latest weigh-in — F11), `server/lib/tracker-export.js` (workbook, RTL, formatting of §5.2), `GET /api/v1/tracker/export/xlsx?from&to` (default last 14 days), tests — server/**
- [ ] P4: Make the app installable — `@angular/pwa` setup (`ngsw-config.json`, `src/manifest.webmanifest`, icons in `public/` copied from the old repo's `public/pwa-192x192.png` and `pwa-512x512.png`), `usePwaInstall` equivalent `src/app/core/services/pwa-install.service.ts`, install card; the server sends `Cache-Control: no-cache` for `ngsw-worker.js` and `ngsw.json` — package.json, angular.json, ngsw-config.json, public/**, src/**, server/app.js
- [ ] P5: Write the UI checks — `e2e/014-1-icon-picker.spec.ts` … `e2e/014-4-delete-from-date.spec.ts`, screenshots; DESIGN.md (picker); `docs/project/current-state.md` — e2e/**, DESIGN.md, docs/project/current-state.md

## Technical Considerations
- Dependencies: server `exceljs`; frontend `@angular/service-worker` (via `@angular/pwa`). Approved by brief T6.
- Backend / API: export route.
- Security surface: the export needs a session; no new inputs beyond dates.

## Out of Scope
The Firestore import (T7, with the Human), deploying.

## Critical Questions
- none

## Execution Notes
- none yet
