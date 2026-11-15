# Brief 5 — Allergen rules engine and alerts

Read `docs/briefs/00-program.md` first (section 4 in full, M1, section 5 "Alerts").

## Goal

The app always knows the state of every allergen and tells the parents, on the calendar, what is missing today —
without ever resetting their progress or deciding for them.

## Scope

- `server/domain/`: pure functions (M1) that take the baby's birth date, the settings, the allergens, the foods and the
  calendar items, plus "today", and return: each allergen's state (`not_started`, `introducing`, `maintenance`,
  `finished`), introduction progress (days given out of `introDays`, first day, list of missing days), last given
  date, times given this week, and the list of alerts. No database, no clock, no Express inside these functions.
- Rules implemented exactly as R1, R2, R3, R6 (locks, R7, are added by brief 7; design the state function so `locked`
  can be layered on without a rewrite).
- Server: `GET /api/v1/allergens/status` and `GET /api/v1/alerts`; `GET` / `PUT /api/v1/settings` for `introDays`,
  `maintenancePerWeek`, `maintenanceGapDays`, `maintenanceUntilMonths` (validated ranges: 1–7, 1–7, 2–14, 6–36).
- Frontend:
  - Alert strip above the calendar (the extension point from brief 4). Texts:
    - R2: `חסר יום ברצף — כדאי לתת היום {allergen}` → tap adds a prefilled add-food sheet for today, meal 1.
    - R6 gap: `עברו {n} ימים בלי {allergen}` → same action.
    - R6 weekly: `השבוע: {allergen} ניתן {x} מתוך {y}` shown from Thursday when the target is not met.
  - State badges on allergen items in the calendar: `introducing` shows the day number (`1/3`, `2/3`, `3/3`),
    `maintenance` shows the maintenance colour.
  - R3 confirmation when an allergen food of a `not_started` allergen is added while another is `introducing`.
  - Page `אלרגנים`: one row per allergen with state, progress, last given, this week's count, and its alert if any;
    tap opens a detail page with the allergen's history (every given day).

## Out of Scope

Locks and reactions (brief 7), suggestions (brief 6), the settings UI (brief 8 — this brief ships the API only).

## Rules

- Introduction never restarts. A missing day only produces an alert (R2).
- "Given on a day" means at least one `given` item of any food of that allergen on that date.
- The week is Sunday–Saturday in Asia/Jerusalem. Age is computed from the birth date.
- An archived allergen has no state and no alerts. With no birth date saved there is no `finished` state and no error.
- The engine is the only place these rules exist; the frontend renders what the API returns and never recomputes.

## Done when

- [auto] `node --test` on `server/domain/` covers at least: given on days 1, 2, 3 → `maintenance` after day 3; given
  on days 1 and 3 only → still `introducing` with progress 2/3, one missing day, and the R2 alert on day 4; given late
  on day 5 → completes, no restart; maintenance with last given 6 days ago → gap alert with `n = 6`; two given this
  week with target 2 → no weekly alert; baby aged 24 months → `finished`; changed settings change the results.
- [auto] A test fails if any file under `server/domain/` imports `express`, `mongodb`, `mongoose` or a repository.
- [auto] Server tests for the status, alerts and settings routes, including refused out-of-range settings.
- [ui] Give "טחינה" today and yesterday-but-one only: the calendar shows `2/3` on the item and the strip shows
  `חסר יום ברצף — כדאי לתת היום שומשום`.
- [ui] Tapping that alert opens the add sheet for today, meal 1, with a sesame food preselected.
- [ui] While שומשום is `introducing`, adding "ביצה קשה" asks `שומשום עדיין בחשיפה. להתחיל גם ביצה?`.
- [human] The alerts are helpful and not nagging; the `אלרגנים` page answers "where are we" in five seconds.
