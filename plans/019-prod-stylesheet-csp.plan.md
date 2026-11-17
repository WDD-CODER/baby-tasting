# Plan 019 — Production build loads its full stylesheet, so icons and styles work behind the security policy

Status: draft
Depends-on: none
Snapshot: be26ea3e67244a6e56f47707f38720c6a801f886
Source: the Human, 2026-11-17, validating plan 018 on the production build served by the server (http://localhost:3010): "why does it look like this? Hebrew and English all together, something looks broken" — every Material Symbols icon renders as its name (`water_bottle`, `bedtime`, `settings`).

## Problem Statement
The production build (`ng build --configuration production`) inlines critical CSS with Beasties. Beasties loads the full stylesheet as `media="print"` and switches it to `all` with an inline `<script>` at the end of `index.html`. The server's Content-Security-Policy (`helmet`, `script-src 'self'`, `server/app.js`) blocks that inline script (browser console: "Executing inline script violates the following Content Security Policy directive 'script-src 'self''"). The full stylesheet never applies, so the `Material Symbols Rounded` `@font-face` never loads and every icon shows its ligature name. The same build goes to Render, so production would look broken too. Dev serving (`ng serve`) is not affected.

## Decisions (Planner)
- **D-019-1** Turn off critical-CSS inlining in the production build: in `angular.json` → `configurations.production` set `"optimization": { "scripts": true, "styles": { "minify": true, "inlineCritical": false }, "fonts": true }`. The stylesheet is then a normal `<link rel="stylesheet">`, and the CSP stays strict (no `'unsafe-inline'` for scripts, no hash to keep in sync). Behaviour: the first paint waits for one small CSS file, which the service worker caches after the first visit.

## Goals & Success Criteria
**Primary:** the production build shows icons as icons when served by the server with its CSP.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0.
- [auto] `node tools/check-no-inline-script.mjs` prints `INLINE: none` and exits 0 (it reads `dist/baby-tasting/browser/index.html` after the build and fails on any `<script>` without `src`, any `data-beasties-media` and any `media="print"` stylesheet).
- [human] On the production build served by the server, the bottom navigation and the tracker tiles show icons, not words like `settings` or `water_bottle`.

## Execution Mode
- Parallel: no
- Concurrent plans: none
- Isolated DB: no
- Reviewer: gate

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
angular.json
tools/check-no-inline-script.mjs
docs/project/current-state.md
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- none — build configuration only; the CSP in `server/app.js` is unchanged.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol and print one line per commit: `ok` or `conflict: <what>`. All `ok` → continue.

## User Stories
- As a parent, I see icons in the app, not their English names.

## Functional Requirements

### Must Have (P0)
- [ ] D-019-1 production build without inline critical CSS.

## Atomic Sub-tasks

- [x] F1: Stop the production build from relying on an inline script the security policy blocks — optimization.styles.inlineCritical false in the production configuration — angular.json
- [x] F3: Fail the checks when the built page holds an inline script again — reads the built index.html, prints INLINE: none or the count — tools/check-no-inline-script.mjs
- [x] F2: Note the build rule so it is not turned back on — one line under the build or deploy notes — docs/project/current-state.md

## Technical Considerations
- Do not loosen the CSP (`'unsafe-inline'` or a script hash) instead: the hash changes whenever Angular changes the snippet.

## Out of Scope
Deploy, other CSP changes.

## Critical Questions
- none

## Execution Notes
- pnpm run build -> 0; node tools/check-no-inline-script.mjs -> 0, INLINE: none; pnpm run lint -> 0; pnpm run test -> 0, fail 0; override-check -> ok
- [human] icon check on the served build left to the Human
