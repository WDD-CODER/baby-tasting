# CURRENT STATE — baby-tasting
> Updated at every end of day. Feeds the Context Capsule "Current State" section.
- Last completed: plan 001 (foundation) built on branch `feat/001-foundation-shell-design-server`, awaiting review.
- Active plan: 001 — foundation: shell, design system, server base, Render file.
- Open bugs: —
- Key files:
  - App: `src/app/layout/shell/` (top bar, four tabs), `src/app/pages/{calendar,foods,allergens,settings}` (empty states), `src/app/shared/ui/*` (13 shared components), `src/app/core/` (i18n `he.ts`, `ApiService`, toast, confirm, unsaved-changes guard), dev page `/dev/components` (non-production only).
  - Styles: `src/styles/tokens.scss`, `src/styles.scss`; rules in `DESIGN.md`; `tools/check-no-hex.mjs` runs inside `pnpm run lint`.
  - Server: `server/app.js`, `server/config.js`, `server/index.js`, `server/repositories/` (db + base repository), `server/lib/` (audit, http-error), `server/middleware/`, `server/routes/health.js`, `server/domain/` (empty, INV-1).
  - Deploy: `render.yaml`, `server/.env.example`.
  - Rules: `docs/brain/invariants.md` (INV-1…6), `docs/project/product-defaults.md`.
