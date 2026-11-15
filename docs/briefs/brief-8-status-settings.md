# Brief 8 — Status pages and settings

Read `docs/briefs/00-program.md` first (R9, section 4 setting names, section 8).

## Goal

The detail pages around the calendar are complete: parents can read the full history of any food, see overall
progress, and change every rule value themselves.

## Scope

- Food detail page (from the foods page and from a calendar item): status (R9), every date it was given with amount,
  note and liked, its reactions, its lock state, its allergen, actions `הוספה ליומן`, `בתור לטעימה`, `עריכה`.
- Progress summary at the top of the foods page: foods tried out of the catalog, per category; allergens by state.
- Settings page `הגדרות`:
  - Baby (name, birth date) — the form from brief 2.
  - Rules: `introDays`, `maintenancePerWeek`, `maintenanceGapDays`, `maintenanceUntilMonths`, `maxAllergensPerMeal`,
    `newFoodsPerWeek` — each with a one-line Hebrew explanation, its allowed range, and `איפוס לברירת מחדל`.
  - A fixed line: `האפליקציה היא כלי מעקב ותכנון ואינה מחליפה ייעוץ רפואי`.
  - Sign out.
  - Activity log: the latest 100 changes (who, when, what) from the audit fields, read-only.
- A first-use hint on the calendar (shown once per user): three short lines explaining add, drag and mark given.

## Out of Scope

Export, backup, charts, notifications, themes, language switch.

## Rules

- Changing a rule value takes effect immediately everywhere (states, alerts, suggestions) because the engine reads
  settings on every call; no stored state is migrated.
- Settings is one form with the unsaved-changes guard; out-of-range values are refused inline with the range shown.

## Done when

- [auto] Server tests: the activity route returns the latest changes newest first, limited to 100, only for the
  caller's household; settings reset returns the documented defaults.
- [auto] Component test: a value outside its range disables save and shows the range.
- [ui] Change `introDays` from 3 to 4 and save: an allergen shown as `3/3` (maintenance) now shows `3/4` and is
  `introducing` again on the `אלרגנים` page.
- [ui] The food detail of "בננה" lists each given date; `הוספה ליומן` opens the add sheet with בננה preselected.
- [ui] The activity log shows the last change with the user name of the parent who made it.
- [human] The settings explanations are clear to a parent who did not build the app.
