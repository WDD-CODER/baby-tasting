# Brief 9 — Deploy to Render and end-to-end check

Read `docs/briefs/00-program.md` first (D4, D5, D6, D7, section 10). Runs solo after the orchestrator's run branch is
merged into `main`. It has Human steps; ask for all of them once, at the start.

## Goal

The app is reachable from any phone at a Render URL with production data in Atlas and photos in Cloudinary, and one
scripted journey proves the whole product works there and locally.

## Scope

- Verify `render.yaml` against the real build: one web service, build command installs both packages with pnpm and
  builds Angular, start command runs the server, health check path `/api/v1/health`.
- Production hardening in the server: `trust proxy` for secure cookies behind Render, `helmet`, compression, cache
  headers for the Angular build (hashed files long, `index.html` no-cache), production error messages without stack
  traces, refusal to start in production without `SESSION_SECRET`, `MONGODB_URI` and `APP_USERS`.
- Installable web app: manifest (name `טעימות`, dark theme colour, icons), so the parents can add it to the phone's
  home screen. No offline mode.
- One end-to-end test (the kit's e2e convention) that runs against a local production build with a throwaway
  database: sign in → set baby → add an allergen food to today meal 1 → mark given → see `1/3` → add a regular food to
  meal 2 → drag it to meal 3 → record a reaction on the allergen → see the lock → release it.
- `docs/project/deploy.md`: the exact Human steps for Atlas and Render (numbered, one action per step, exact field
  names and values), the list of environment variables, how to run locally against the development database, and how
  to see the Render logs.

## Human steps (ask once, then wait)

1. Atlas: create a free cluster, a database user, allow access from anywhere, copy the connection string with the
   database name `baby-tasting`.
2. Cloudinary: confirm the three values are available for Render.
3. Choose the two real usernames for `APP_USERS` (they are the secret — not first names).
4. Render: New → Blueprint → select the `baby-tasting` repository → fill the environment variables.

## Out of Scope

Custom domain, paid plans, CI-driven deploys beyond Render's own auto-deploy from `main`, backups.

## Rules

- No secret is ever committed; `render.yaml` declares names only (`sync: false`).
- The free Render service sleeps when idle; `deploy.md` says so and says the first load after a pause takes up to a
  minute. Do not add a keep-alive pinger.
- The local development database and the production database are never the same string in any committed file.

## Done when

- [auto] `pnpm run build`, `pnpm run lint`, `pnpm run test`, `pnpm --dir server test` and the e2e test exit 0.
- [auto] A server test proves production mode refuses to start when `SESSION_SECRET` is missing, naming the variable.
- [auto] `GET https://<render-url>/api/v1/health` returns `status: ok` with the database connected.
- [human] Both parents sign in from their phones on mobile data, add the app to the home screen, and see each other's
  changes on the calendar.
- [human] A photo added to a reaction on the phone is visible to the other parent.
