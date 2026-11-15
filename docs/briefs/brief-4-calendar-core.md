# Brief 4 — Calendar core: the home screen

Read `docs/briefs/00-program.md` first (section 3 "Calendar item", section 5, R4, R5, R8, R9, section 8). This is the
most important brief of the product: the calendar is where the parents live.

## Goal

Parents see, for every day, what to give in each of the three meals, and manage everything by touching the calendar:
add, remove, drag between meals and days, mark given or skipped, for past and future dates alike.

## Scope

- Server: `/api/v1/calendar` — list items for a date range; create; update (date, meal, status, amount, note, liked);
  delete; one `move` operation (date + meal) that is atomic. Derived food status (R9) exposed on the foods list:
  `never tried` / `tried` with first date, times given, liked.
- Rule R4 enforced on the server and mirrored in the UI: an allergen food can only be in meal 1.
- Frontend home route `יומן`:
  - Week view (default): 7 day columns starting Sunday on the right, 3 meal rows labelled `ארוחה 1`, `ארוחה 2`,
    `ארוחה 3`; today highlighted; previous / next week and a "today" action; swipe between weeks.
  - Month view: overview with up to 4 emoji per day then `+N`, allergen items first; tap opens the day sheet.
  - Day sheet: the three meals as lists, each with `הוספת מזון`.
  - Add food: bottom sheet with search over the catalog, recent foods first, and "new food" leading to brief 3's form.
  - Drag and drop with Angular CDK (touch): between meals of a day and between days in the week view; a refused drop
    (R4) returns the item and shows `אלרגן ניתן בארוחה הראשונה`.
  - Item actions (tap): `ניתן` (one tap; then optional amount `טעימה` / `כפית` / `מנה`, note, liked), `דילגנו`, undo,
    move to another date (date picker, for moves beyond the visible week), remove.
  - Visual states: planned (outline), given (filled, check), skipped (dimmed, strike). Allergen foods carry the accent
    ring and badge defined in `DESIGN.md`. This brief shows only "is an allergen"; state colours come in brief 5.
  - Food warnings (R8) shown as a confirm-style notice when the food is added while the baby is under the warning age.
- The foods page now shows the derived status instead of the fixed `לא נוסה`.

## Out of Scope

Allergen states, alerts, locks, suggestions, reactions (briefs 5–7). Leave a clearly named extension point in the
calendar for: an alert strip above it, per-item state badges, and "suggested" items.

## Rules

- A day and meal may hold any number of items. The same food twice in the same meal is refused.
- Marking `given` on a future date is refused (`אי אפשר לסמן כ"ניתן" תאריך עתידי`). Past dates are fully editable.
- All calendar days are local calendar dates (`YYYY-MM-DD`, Asia/Jerusalem); no time of day is stored for a meal.
- Optimistic UI for drag, add and status changes, with rollback and a toast on failure.
- Two parents edit the same calendar: refresh the visible range when the app regains focus and after every write.

## Done when

- [auto] Server tests: range listing; create / move / delete; an allergen food in meal 2 is refused on create and on
  move; a duplicate food in the same meal is refused; `given` on a future date is refused; derived status counts only
  `given` items.
- [auto] Component tests: week starts on Sunday and renders right-to-left; a day with 6 items shows 4 icons and `+2`
  in the month view.
- [ui] Add "בננה" to meal 2 of today, mark it `ניתן` with amount `טעימה`: the item is filled with a check and the
  foods page shows בננה as `נוסה · 1`.
- [ui] Drag an item from meal 2 to meal 3 of the next day: it stays there after a page reload.
- [ui] Drag "טחינה" to meal 2: it returns to its place and the message `אלרגן ניתן בארוחה הראשונה` appears.
- [ui] Add "דבש" while the baby is under 12 months: the warning `אסור לפני גיל שנה` is shown before it is added.
- [ui] Add an item on a date last month and mark it `ניתן`: it is saved and visible in the month view.
- [human] Dragging on a real phone feels reliable; the week is readable at a glance; allergens stand out.
