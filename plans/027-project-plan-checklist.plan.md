# Plan 027 — Write this project's own plan checklist so every plan gets the same phone, Hebrew and reuse checks

Status: draft
Depends-on: none
Snapshot: f0e48f9074b3c46f0f0d1a22712780cf720d6a32
Source: the Human, 2026-11-19, after the foodVibe comparison: "plan for 1 and 5" — item 1: foodVibe has a project plan checklist (`foodVibe1.0/docs/agent/plan-checks.md`); baby-tasting's `kit.config.json` points `paths.planChecks` at `docs/project/plan-checks.md`, but that file does not exist, so `/plan`'s "project's own checks" step reads nothing.

## Problem Statement
Every plan review runs "the project's own checks in `docs/project/plan-checks.md`, when that file exists" — and it does not exist. The lessons this project learned the hard way live only in chat and in run reports, so the next plan can repeat them:
- run-023: a fixed overlay centred with `translate(-50%)` sat off screen in RTL (x −333 on a phone).
- run-023: a new `TrackerSettings` field broke a spec fixture the plan's scope did not list (`timeline-row.spec.ts`).
- run-023: the Settings export date fields overflowed a 360 px screen and nothing checked page width.
- run-023: an e2e test opened a wrong route (`/reactions/new` instead of `/tasting/reactions/new`).

## Decisions
- **D-027-1 (Planner)** The checklist is a project doc in `docs/project/plan-checks.md` (the path `kit.config.json` already names), written for this app only; it does not copy foodVibe's lines that do not apply (dictionary.json, Lucide, Zod, chef stories).
- **D-027-2 (Planner)** Each check is one line a reviewer can apply to a draft, with the file or command that proves it. No new script in this plan.

## Goals & Success Criteria
**Primary:** `/plan`'s Architect + PM review finds a real checklist for this project and applies it.

- [auto] `node scripts/kit-checks.mjs` exits 0 (no broken links, no kit-manifest coupling).
- [auto] `pnpm run lint` exits 0.
- [human] `docs/project/plan-checks.md` (the path `kit.config.json` `paths.planChecks` names) exists with the sections `## Success criteria`, `## Phone and RTL`, `## Hebrew text and icons`, `## Data and API`, `## Tests and routes`, `## Reuse Check`, `## Hotspots` — the reviewer confirms in its receipt.
- [human] Reading the checklist, every line is something you would want checked on a new plan, in plain words.

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
docs/project/plan-checks.md
docs/project/current-state.md
```

## Read Scope

Entire repo, plus `C:\coding projects\Cursor\foodVibe1.0\docs\agent\plan-checks.md` as the model to adapt. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — a planning doc only; no code, route, style or data change.

## Backend Impact
- none.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the Human, I want each new plan checked for the mistakes this app already made, so they are not made twice.

## Functional Requirements

### Must Have (P0)
- [ ] A checklist file at the path the kit reads, with the lines below.

## Reuse Check
- none — a document; no component, util, class or token.

## Defaults
- icon-slots — exception — why: the checklist only names the icon-slots rule; it adds no icon

## UI/UX Notes
- none (no UI).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] M1: Write the project plan checklist the plan review reads — a short intro (what reads it: `/plan`'s Architect + PM review via `paths.planChecks`) and these sections, each line naming its proof — docs/project/plan-checks.md
  - **Success criteria:** a plan that touches UI has at least one `[ui]` item (one page, one action, a quoted Hebrew text, a screenshot under `e2e/screens/<NNN>-<n>.png`) and one `[human]` item for feel on the phone; checks are `pnpm run build`, `pnpm run lint`, `pnpm run test`, `node --test server/test/<file>`, never `npx`.
  - **Phone and RTL:** every touched page fits 360 × 780 with no sideways scroll (`document.documentElement.scrollWidth` equals the screen width); a fixed overlay, modal or sheet is centred with `inset: 0` + `margin: auto` (or the shared confirm dialog / sheet), never `translate(-50%)` on an inline axis; touch targets at least `--touch-target`; logical CSS properties only.
  - **Hebrew text and icons:** every new string is a key in `src/app/core/i18n/he.ts`, named in the plan's UI/UX Notes; every icon is a slot in `src/app/core/icons/icon-slots.ts` (default `icon-slots`); colours only from tokens (`tools/check-no-hex.mjs`).
  - **Data and API:** a new persisted field follows `docs/agent/standards-backend.md`, is validated and reconciled in `server/domain/tracker/settings.js` (or its domain file) with a `server/test` case for save, refuse and the default; a new `TrackerSettings` field lists in scope every spec that builds a settings object (find them by searching for `quickActionOrder:` in `src/**/*.spec.ts`); times are Asia/Jerusalem; routes under `/api/v1/`.
  - **Tests and routes:** e2e specs are `e2e/<NNN>-<n>-<slug>.spec.ts`, start with the `openLog` helper from the e2e support folder, and use the real route path from `src/app/app.routes.ts` (tasting pages sit under `/tasting/…`); a moved or renamed control lists every e2e spec that clicks it.
  - **Reuse Check:** one row per new piece — `- <piece> — family: <id|none> — rung: <1-4> — why: <…>`, or `- none — <why>`; gate `node scripts/scope-check.mjs --reuse --plan=<path>`. Look in `docs/brain/inventory.md` first: the shared confirm dialog (`ConfirmDialogService`), the time picker (`app-datetime24`), sheets, chips and `app-icon` already exist.
  - **Hotspots:** `src/styles.scss` and `src/app/app.routes.ts` are append-only.
- [x] M2: Note the new checklist in the project state — one line under the workflow notes of current-state — docs/project/current-state.md

## Technical Considerations
- Dependencies: none.
- New files needed: `docs/project/plan-checks.md`.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none.
- Project checks: this plan writes them.

## Out of Scope
- A script that enforces the checklist (a later plan may turn a line into a check).
- The log-query success line: plan 028 adds it when the log tool exists.

## Critical Questions
- none.

## Execution Notes
- M1, M2 done; checks run by the gate.
