# Brief 1 — Foundation: app shell, design system, server base, Render file

Read `docs/briefs/00-program.md` first. Its decisions, rules and standing behaviours apply and are not repeated here.

## Goal

Every later brief builds on one shared shell, one design system and one server base, so no later plan invents its own
layout, component, token, error format or database access.

## Scope

- `DESIGN.md` at the repo root, written from program section 6 (tokens, components, allergen marking, spacing, do /
  don't). It is the written rule set the design reviewer checks against.
- `docs/brain/invariants.md`: record program section 7 (M1–M5) and rule R4 as invariants.
- `docs/project/product-defaults.md` (or the kit's equivalent if present): program section 8 as the standing behaviours.
- Frontend: global tokens in `src/styles.scss`; app shell (top bar with app name and baby name slot, bottom navigation
  with four entries: `יומן`, `מזונות`, `אלרגנים`, `הגדרות`); route skeleton for those four pages as empty states; the
  Hebrew dictionary file; shared components: button, icon button, card, bottom sheet, chip, alert strip, confirm
  dialog, empty state, loading state, error state, text field, select, toast; the unsaved-changes guard; an API client
  service with one error-handling path.
- Server: configuration module (reads and validates environment variables, fails fast with a clear message), MongoDB
  connection in `server/repositories/` behind a small repository base, JSON error format `{ error: { code, message } }`,
  request logging, the audit fields helper (`createdBy`, `updatedBy`, timestamps), serving the Angular production build
  for non-API routes, `GET /api/v1/health` reporting database connectivity.
- `render.yaml`: one web service — build installs both packages and builds Angular, start runs the server; environment
  variable names declared without values (`MONGODB_URI`, `SESSION_SECRET`, `APP_USERS`, `CLOUDINARY_*`, `NODE_ENV`).
- `server/.env.example` listing every variable with a comment; local default `MONGODB_URI` points to a local
  development database named `baby-tasting-dev`.

## Out of Scope

Sign-in, any domain data, the calendar, real content in the four pages.

## Rules

- Dark theme only; values exactly as program section 6. No colour, size or font literal outside the token file.
- Shared components take inputs for their variants; a later plan extends them, never copies them.
- Empty `server/domain/` folder with a README stating invariant M1.
- Tests for the server run against an in-memory or throwaway test database, never the development database.

## Done when

- [auto] `pnpm run build`, `pnpm run lint`, `pnpm run test`, `pnpm --dir server test` exit 0.
- [auto] A server test proves: missing `MONGODB_URI` stops startup with a message naming the variable; an unknown
  `/api/v1/x` returns 404 in the error format; a non-API path returns the Angular `index.html` from the build folder.
- [auto] A lint or script check fails on a hex colour literal in any `*.scss` or `*.ts` file under `src/app/`.
- [ui] At 360px width the shell shows the top bar and the four bottom entries with the Hebrew labels above; each
  entry opens its page and shows its empty state; the page direction is RTL.
- [ui] A demo route `/dev/components` (development build only) renders every shared component in every variant.
- [human] The look matches Baby Tracker's feel (dark slate, Heebo, indigo accent).
