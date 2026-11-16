# Plan 017 — Tasting: faster food entry (prefilled new food, multi-select), searchable food icons with a "no icon" default, a calendar that fits the phone, clearer week suggestions

Status: draft
Depends-on: 016
Snapshot: 2e5509029036498a9038f6f04f8391b08954bdec
Source: the Human's requests after validating plan 015 (2026-11-16): "when adding a new ingredient after the name was typed and not found, put the typed name in the new form"; "allow icon search by name from the main icon repository, live if possible"; "the other emoji input does nothing but block saving — make it the icon search"; "if no icon was selected have a default no-icon icon so the user can save without an icon"; "when adding ingredients to a meal allow multi-select and save at the end"; "on mobile make the icons smaller and make the calendar fit the screen without scrolling"; "why can't I get weekly suggestions?".

## Problem Statement
Adding foods to the calendar is slow: a food that is not found must be retyped in the new-food form, and each food is added to a meal one at a time. The food icon must be picked from a short emoji grid or typed into a free field that blocks saving when it holds anything but one emoji, and a food without an icon cannot be saved. On a phone the week calendar needs scrolling and its tiles are large. `הצע לי שבוע` returns `אין הצעות לשבוע הזה` when the tasting queue is empty, without saying why.

## Decisions (Planner, from the Human's requests — the Human can change them at validation)
- **D-017-1 New food from the search.** In the add-food sheet, when the search finds nothing, the `מזון חדש` button reads `הוספת "<typed name>" כמזון חדש` and opens the new-food form with the name prefilled. After saving, the new food is added to the meal the sheet was opened for, and the parent returns to the calendar.
- **D-017-2 Multi-select in the add-food sheet.** Tapping foods in the sheet toggles them (checked state, selected count in the footer); `הוספה (N)` adds them all to that meal in one go (one request per food is fine; a refused one shows its reason and the rest are kept). A single tap no longer closes the sheet. Rule checks (duplicate in the meal, locked food, honey warning by age) still apply per food; the allergen note of plan 015 shows once if any added allergen food is outside meal 1.
- **D-017-3 Food icon search.** The food form's icon field becomes a search over the full Unicode emoji set with **Hebrew and English names and keywords** (`emojibase-data`, the `he` and `en` compact data, self-hosted with the app, no network call), live as the parent types, results in a scrollable grid, the current short list of food emoji shown first when the search is empty. The free-text emoji input is removed.
- **D-017-4 No icon is allowed.** A food may be saved without an icon (stored as `emoji: ''`). Everywhere a food is shown (calendar tile, lists, detail, suggestions, export of Tasting if any), an empty icon renders the shared placeholder `🍽️` (one constant). The form shows `ללא אייקון` as the first option, selected by default for a new food. The server accepts an empty emoji.
- **D-017-5 Phone calendar fits the screen.** At 360×780 the week view with its header, the view chips, `הצע לי שבוע` and the bottom navigation shows all 7 days × 3 meals without page scrolling: smaller tile emoji and text, a compact header, cells sized from the available height (tokens only). Tiles keep a 44 px touch target via padding where needed. Month view is unchanged except smaller emoji.
- **D-017-6 Why no suggestions.** Today the engine suggests new foods and allergen starts only from the tasting queue (`בתור לטעימה`). When the queue is empty, suggestions fall back to **untried, non-archived foods in catalog order** (allergen foods only through the existing allergen rules, so a new allergen still starts only when none is introducing). When there is still nothing to suggest, the message says why: `אין הצעות: אין מזונות שלא נוסו ואין אלרגן בחשיפה` (or the closest true reason the engine knows, e.g. every day of the week is already full).

## Goals & Success Criteria
**Primary:** the six decisions work at 360 px and are covered by tests.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0 (Karma and every server test).
- [auto] `node --test server/domain/suggestions.test.js server/test/catalog.test.js server/test/suggestions.test.js` exits 0, covering: a food saved with `emoji: ''`; suggestions with an empty queue offer untried foods; with nothing untried and no allergen introducing the response carries the reason code.
- [auto] Karma specs: the emoji search finds `🥑` for `אבוקדו` and for `avocado`; an empty search shows the food list first; the placeholder renders for `emoji: ''`.
- [ui] Searching `קישוא` in the add-food sheet with no such food, then `הוספת "קישוא" כמזון חדש`, opens the form with `קישוא` in the name; after saving, `קישוא` is in that meal.
- [ui] Selecting three foods in the add-food sheet and tapping `הוספה (3)` puts all three in the meal.
- [ui] In the food form, typing `אבוקדו` in the icon search offers `🥑`; a food saved with `ללא אייקון` shows `🍽️` in the list.
- [ui] At 360×780 the week view shows all 7 days and 3 meals without scrolling the page (no vertical scroll on the page).
- [ui] With an empty queue and untried foods, `הצע לי שבוע` shows suggestions.
- [human] The phone calendar reads well at the smaller size.

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
package.json
pnpm-lock.yaml
angular.json
server/domain/**
server/domain/suggestions.test.js
server/routes/**
server/lib/**
server/repositories/**
server/test/**
src/app/core/**
src/app/shared/**
src/app/dev/**
src/app/pages/**
src/assets/**
public/**
e2e/**
DESIGN.md
docs/project/current-state.md
```

## Read Scope

Entire repo. `docs/briefs/00-program.md` (Tasting rules R1–R10) stays binding except where the Decisions above change it.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the suggestion fallback and the reason code stay in the pure `server/domain/suggestions.js`; the emoji search is a pure function over the shipped data.
- INV-2: preserves — no new database access paths beyond the existing repositories.
- INV-3: preserves — no auth change.
- INV-4: preserves — `/api/v1` only; the suggestions response may gain a `reason` field.
- INV-5: preserves — sizes come from tokens (add tokens in `src/styles/tokens.scss` through the design system if needed).
- INV-6: preserves — allergen placement rules unchanged (plan 015's any-meal rule and note stay).

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent, I type a food once, even when it is new.
- As a parent, I fill a meal with several foods in one go.
- As a parent, I find a fitting icon by typing its name in Hebrew, or skip the icon.
- As a parent on the phone, I see the whole week without scrolling.
- As a parent, I get suggestions without first building a queue, and when there are none I know why.

## Functional Requirements

### Must Have (P0)
- [ ] D-017-1 prefilled new food from the search, added to the meal after save.
- [ ] D-017-2 multi-select with `הוספה (N)`.
- [ ] D-017-3 emoji search (Hebrew + English, offline data), free input removed.
- [ ] D-017-4 empty icon allowed, `🍽️` placeholder everywhere.
- [ ] D-017-5 phone week view without page scroll.
- [ ] D-017-6 suggestion fallback and the reason message.

## Atomic Sub-tasks

- [ ] O1: Emoji search + no-icon — add `emojibase-data`; `src/app/shared/ui/emoji-picker/` becomes the search picker (lazy-load the data on open), `ללא אייקון` option, placeholder constant in `src/app/core/**`, food form uses it, server accepts `emoji: ''`, Karma specs, demo page — package.json, pnpm-lock.yaml, src/app/**, server/**
- [ ] O2: Add-food sheet multi-select and prefilled new food — `src/app/pages/calendar/add-food-sheet/**`, calendar page, `src/app/pages/foods/food-form/**` (accept a `name` and a return target via query params), Hebrew texts — src/app/**
- [ ] O3: Phone week view — `src/app/pages/calendar/week-view/**`, `item-tile/**`, calendar page header, tokens — src/app/**, DESIGN.md
- [ ] O4: Suggestions fallback and reason — `server/domain/suggestions.js` + test, the suggestions route, the calendar page message — server/**, src/app/**
- [ ] O5: UI checks — `e2e/017-1-new-food-prefill.spec.ts`, `e2e/017-2-multi-select.spec.ts`, `e2e/017-3-icon-search.spec.ts`, `e2e/017-4-week-fits.spec.ts`, `e2e/017-5-suggest-empty-queue.spec.ts`; update every spec that adds a food with a single tap (`e2e/support/calendar.ts` `addFood`: select then `הוספה (1)`) or types an emoji; `docs/project/current-state.md` — e2e/**, docs/project/current-state.md

## Technical Considerations
- `emojibase-data` compact files are ~200–400 kB each: load them lazily from the picker (dynamic import or an asset fetch), never in the main bundle; keep the initial bundle budget.
- e2e: one spec file at a time (login rate limit); `E2E_EXPECT_TIMEOUT` exists for a remote database.

## Out of Scope
Material Symbols for foods (food icons stay emoji, P7), Tracker screens, deploy.

## Critical Questions
- none

## Execution Notes
- none yet
