# Architecture invariants

The load-bearing runtime rules of baby-tasting, as a checklist. ADRs in `decisions/` keep
the reasoning; this file is what the gate checks.

Enforced from plan: 1

Every plan fills `## Architecture Impact` with one line per invariant its scope touches
(`node scripts/scope-check.mjs --arch --plan=<p>` blocks a plan that doesn't). Changing or
deviating from a rule needs the Human's explicit `approve arch change INV-n` in chat, an
`Arch-approved: Human YYYY-MM-DD` line, and for a change, a superseding ADR.

Each section below is parsed by `scripts/lib/invariants.mjs` — keep the exact shape:
`## INV-n — <title>`, then the five `- Field:` lines. `Touches` globs are backticked.
Add only rules whose breakage users would feel; workflow choices stay prose ADRs.
Delete this file to switch the gate off.

## INV-1 — Domain rules are pure functions
- Rule: domain rules are pure functions in `server/domain/` (no express, mongodb, repository or clock import)
- Source: docs/briefs/00-program.md §7
- Touches: `server/domain/**`
- Users lose if broken: the rules cannot be reused or tested, and a change in how rules run can silently change what the app allows
- Test: server/test/domain-purity.test.js "INV-1 …"

## INV-2 — Database access only through repositories
- Rule: database access happens only in `server/repositories/`; routes, domain and middleware never import the driver
- Source: docs/briefs/00-program.md §7
- Touches: `server/routes/**`, `server/domain/**`, `server/middleware/**`, `server/repositories/**`
- Users lose if broken: household scoping and audit fields can be skipped, so data could leak between households or lose who changed it
- Test: server/test/domain-purity.test.js "INV-2 …"

## INV-3 — One authentication middleware
- Rule: one authentication middleware sets `req.user` and `req.householdId`; nothing else knows how login works
- Source: docs/briefs/00-program.md §7
- Touches: `server/middleware/**`, `server/routes/**`
- Users lose if broken: a route could answer without knowing who is asking, exposing another household's data
- Test: none until plan 002

## INV-4 — Versioned plain-JSON REST
- Rule: REST under `/api/v1/`, plain JSON, calendar days `YYYY-MM-DD`, moments ISO timestamps
- Source: docs/briefs/00-program.md §7
- Touches: `server/routes/**`, `src/app/core/services/**`
- Users lose if broken: dates shift by a day or the app and server stop understanding each other
- Test: server/test/app.test.js "INV-4 …"

## INV-5 — Design tokens, no colour literals
- Rule: design tokens keep the Baby Tracker names and no colour literal lives outside `src/styles/tokens.scss`
- Source: docs/briefs/00-program.md §7
- Touches: `src/styles/**`, `src/styles.scss`, `src/app/**/*.scss`
- Users lose if broken: screens drift from the dark Baby Tracker look and a later merge needs manual colour fixes
- Test: tools/check-no-hex.mjs "INV-5 …"

## INV-6 — Allergen foods only in meal 1
- Rule: an allergen food is only ever in meal 1 (R4), enforced on the server and mirrored in the UI
- Source: docs/briefs/00-program.md §4 R4
- Touches: `server/domain/**`, `server/routes/calendar*`, `src/app/pages/calendar/**`
- Users lose if broken: a baby could be planned an allergen at a meal where a reaction is harder to watch
- Test: none until plan 004
