# Brief 6 — Suggestions: which food on which day

Read `docs/briefs/00-program.md` first (section 5 "Suggestions", R1–R7).

## Goal

With one tap the app proposes which foods to give on which days of a week — "banana on Tuesday", not recipes — and
the parents accept, change or ignore it.

## Scope

- Tasting queue: on the foods page a parent marks foods `בתור לטעימה` and can reorder the queue. Only queued foods and
  allergens are ever suggested; the app never picks an untried food on its own.
- `server/domain/`: a pure suggestion function. Input: the engine output of brief 5, the queue, the existing calendar
  items of the target week, the settings. Output: suggested items `{ date, meal, foodId, reason }`.
  1. The `introducing` allergen: every remaining day until its introduction is complete, meal 1.
  2. `maintenance` allergens: enough days to reach `maintenancePerWeek` this week, meal 1, spread across the week,
     preferring days without an introduction; never more than `maxAllergensPerMeal` (new setting, default 2) in one
     meal 1 unless the weekly target cannot be met otherwise.
  3. Next `not_started` allergen: suggested only when no allergen is `introducing`, and only if the parents put an
     allergen food in the queue; starts on the first free day, three consecutive days.
  4. Queued regular foods: at most `newFoodsPerWeek` (new setting, default 3), one new food per day, meal 2.
  5. Never suggest for a past day, never a locked or archived food, never a food already on that day.
- Server: `POST /api/v1/suggestions/preview` `{ weekStart }` returns suggestions without saving;
  `POST /api/v1/suggestions/accept` saves the chosen ones as `planned` items.
- Frontend: `הצע לי שבוע` action in the week view; suggestions rendered as dashed items with the reason on tap
  (for example `תחזוקה: שומשום 1 מתוך 2 השבוע`); accept one, dismiss one, `אשר הכול`, `בטל הכול`. Accepted items become
  normal items and can be dragged like any other.

## Out of Scope

Recipes, portions, nutrition balance, automatic acceptance, suggestions for more than one week at a time.

## Rules

- A suggestion never moves, replaces or removes an item a parent placed; existing items count toward the targets.
- Preview is deterministic for the same input (stable ordering), so a second tap shows the same proposal.
- The function lives in `server/domain/` under invariant M1.

## Done when

- [auto] `node --test` covers: an allergen at 1/3 gets the next two days in meal 1; two maintenance allergens with
  target 2 get two days each and never share a day with the introduction unless needed; an existing planned item
  reduces what is suggested; a locked food is never suggested; a full queue yields at most `newFoodsPerWeek` new
  foods, one per day, in meal 2; nothing is suggested for days before today; same input → same output.
- [auto] Server tests: preview saves nothing; accept saves exactly the chosen items as `planned`.
- [ui] With שומשום at `1/3` and "אגס" queued, `הצע לי שבוע` shows dashed שומשום items on the next two days in
  meal 1 and a dashed אגס in meal 2; `אשר הכול` turns them into regular planned items.
- [ui] Dismissing one suggestion removes only that one.
- [human] The proposed week looks like something the parents would plan themselves.
