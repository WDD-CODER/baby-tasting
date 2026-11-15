# TECH STACK — AUTHORITATIVE SOURCE — baby-tasting
> `AGENTS.md` and `CLAUDE.md` defer to this file. Edit HERE only.
> Product decisions: `docs/briefs/00-program.md` (section 2). This file restates the technical ones.

## Stack
- Frontend / framework: Angular (latest stable from the CLI; 22 at bootstrap), standalone components, signals, SCSS, at the repo root (`src/app/`).
- Backend: Node + Express (JavaScript, ESM) in `server/`, its own package and pnpm lockfile.
- Database: MongoDB. Production data in MongoDB Atlas; local development uses a separate development database and never points at production data by default.
- Photos: Cloudinary, uploaded through the server. Nothing is stored on Render's disk.
- Deploy: one Render Web Service — Express serves the Angular production build and `/api/*`. The app also runs locally.
- Package manager: pnpm.
- Workflow kit: `WDD-CODER/ai-workflow-kit` v3.3.0, packs `angular`, `node-express`.

## Hard conventions
- State: signals only (`signal()`, `computed()`), no `BehaviorSubject`
- TypeScript: single quotes, no semicolons, no `any`. Server: plain JavaScript ESM.
- REST API versioned under `/api/v1/`, plain JSON; calendar days as `YYYY-MM-DD`, moments as ISO timestamps.
- UI language: Hebrew only, RTL. Code, comments, commit messages and docs: English.
- Build gate: `pnpm run build` must pass before any commit.
- Lint gate: `pnpm run lint` must pass before milestone sign-off.
- Test gate: `pnpm run test` (Karma, ChromeHeadless, single run) and `pnpm --dir server test` (`node --test`).
- Add the rules that are specific to this project below; stack-wide rules live in `docs/agent/standards-*.md`.

## Approved dependencies
Anything already in `package.json` or `server/package.json` is approved. New dependencies need explicit Plan Contract approval before they are installed.
