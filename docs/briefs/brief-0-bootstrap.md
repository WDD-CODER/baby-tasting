# Brief 0 — Bootstrap: an empty app that builds, with the workflow kit installed

Run this in a plain Claude Code session opened in `C:\coding projects\Cursor\baby-tasting` (create the folder first).
The kit is not installed yet, so there is no Planner and no plan file for this brief: execute it directly, in order.
Keep it small. No product feature, no design work, no database code belongs here.

## Goal

A private GitHub repository `baby-tasting` whose `main` holds an Angular app and an Express server that build, lint and
test green, with `ai-workflow-kit` v3.3.0 installed, so the Planner and `/orchestrate` can take every later brief.

## Scope

- Repo root: the Angular workspace (app in `src/app/`).
- `server/`: the Express server.
- Kit-installed files (written by the installer, not by hand).
- `docs/briefs/`: this folder of briefs, copied in.

## Out of Scope

Routing beyond one placeholder page, styling, MongoDB, authentication, Render, any UI text beyond the placeholder.

## Steps

1. `git init` with default branch `main`. Create the private GitHub repository `baby-tasting` with `gh repo create`
   and set it as `origin`. If `gh` is not signed in, stop and ask the Human to create the empty repository.
2. Create the Angular workspace at the repo root with the Angular CLI (latest stable): standalone, SCSS, routing on,
   no SSR, package manager pnpm. Set `<html lang="he" dir="rtl">` in `src/index.html`. One placeholder route that
   renders the text `Baby Tasting`.
3. `package.json` scripts at the root: `start` (ng serve), `build` (production build), `lint` (add `angular-eslint`),
   `test` (must exit by itself: `ng test --watch=false --browsers=ChromeHeadless`).
4. Create `server/` as its own package (JavaScript, ESM, Node 20+): Express app with `GET /api/v1/health` returning
   `{ "status": "ok" }`, `PORT` read from the environment (default 3000), scripts `dev`, `start`, `test`
   (`node --test`), one test that calls the health route. Add `server/.env.example` with `PORT=3000`.
5. Add `.gitignore` (node_modules, dist, `.env`, `.angular`), `.nvmrc`, and a short `README.md` (how to run frontend
   and server locally, in PowerShell).
6. Copy every file of this briefs folder into `docs/briefs/`.
7. Commit and push to `main`.
8. Install the kit. From the Human's kit checkout `C:\coding projects\Cursor\ai-workflow-kit`, in PowerShell:

   ```powershell
   cd "C:\coding projects\Cursor\ai-workflow-kit"
   .\kit-install.ps1 -Target "..\baby-tasting" -Source github:WDD-CODER/ai-workflow-kit -Ref v3.3.0 -Packs angular,node-express -InstallDeps
   ```

   - If the installer stops with exit 2 for a missing required key, create `kit.config.json` in the project with:
     `project.name` = `baby-tasting`, `project.packageManager` = `pnpm`, `project.uiLocale` = `Hebrew RTL`,
     `project.uiDirection` = `rtl`, `commands.build` = `build`, `commands.lint` = `lint`, `commands.test` = `test`,
     and `hooks.shellPath` copied from `C:\coding projects\Cursor\FoodVibe1.0\kit.config.json`. Then run the same
     command again.
   - Whether to add `-Cursor` (the Cursor layer) is the Human's choice: ask once, default no.
9. Resolve every `NOTE` line the installer printed (slot dev-server arguments, the `slot` serve configuration the
   angular pack expects, `src/environments/environment.local.ts`, CI notes). Follow the pack's own `FRAGMENTS.md`;
   do not invent values.
10. Commit the installed files (including `.kit/install.json` and `kit.config.json`) and push to `main` **before**
    activating the git hooks. Then do the kit's first-time setup (README → "First-time setup in the project"): hooks,
    `scripts/` dependencies and its lockfile. If the push to `main` is refused, push a branch `chore/kit-install` and
    open a pull request for the Human to merge.
11. Fill the kit's project docs with facts only: `docs/project/tech-stack.md` (section 2 of the program document) and
    `docs/brain/projectbrief.md` (section 1). Leave `docs/brain/invariants.md` for brief 1.

## Rules

- pnpm only. Commands shown to the Human are PowerShell, one per line, Windows paths.
- TypeScript: single quotes, no semicolons, no `any` (the angular pack's rules). Server: plain JavaScript ESM.
- Do not write product code. Do not choose colours, fonts or layout.
- Never hand-edit a kit-managed file; change `kit.config.json` and re-run the installer instead.

## Done when

- [auto] `pnpm run build`, `pnpm run lint` and `pnpm run test` exit 0 at the repo root.
- [auto] `pnpm --dir server test` exits 0, and `GET http://localhost:3000/api/v1/health` returns `{"status":"ok"}`
  while `pnpm --dir server dev` runs.
- [auto] `node "C:\coding projects\Cursor\ai-workflow-kit\tools\drift-check.mjs" --target .` passes.
- [auto] `.kit/install.json` records version `3.3.0` and packs `angular`, `node-express`; it is committed.
- [auto] `node scripts/lib/slot.mjs --list` prints the three slots, and `node scripts/slot-serve.mjs` starts the
  frontend in `wt-1` on its slot port.
- [auto] `docs/briefs/00-program.md` and briefs 1–9 exist on `main`.
- [human] The GitHub repository is private and the Actions setting in the program document, section 10 item 2, is on.

## Report back to the Human

One list: what was installed, every `NOTE` and how it was resolved, anything skipped and why, and the exact next step
("open the main folder, give the Planner `docs/briefs/00-program.md` and briefs 1–8").
