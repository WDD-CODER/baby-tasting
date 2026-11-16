# Brief T3 — Log tab: today carousel, quick actions, entry sheets, sleep timer, daily trackers

Read `00-tracker-program.md` (P2, P4, P5, F3, F4, F8, F9) and `spec-log-settings.md` §1, §3, §4, §5, §6.1–6.8, §7, §10.

## Goal
The Tracker home (`/`) lets a parent record a feeding, diaper, sleep, activity, weight, pumping, vomiting or
supplement in a few taps, exactly like today, and see today at a glance.

## Scope
- Shell behaviour (spec §1, §3): refresh every 5 s while visible and on focus, 401 → sign-in, toast with undo,
  delete confirmation strip, top banners, floating pills (open sleep pill etc.), browser notifications as today (§1.7).
- Log tab (spec §4): today carousel with its empty state, quick-action grid with the fixed rows and the reorderable
  buttons (Angular CDK drag-drop replaces dnd-kit; order saved to `quickActionOrder`), awake-time widget and its
  thresholds, quick logging handlers, daily diaper tracker, daily pumping tracker, Bio Gaya card.
- Entry sheets (spec §6.1–6.8): one shared bottom sheet (the existing `app-bottom-sheet`) with the bottle/breast,
  diaper, sleep, activity, weight, pumping and vomiting forms, every field, default and Hebrew text; the default
  bottle type comes from settings (F3); the double-submit guard after validation (F4).
- Sleep (spec §5): short press = quick sleep toggle, long press = sleep sheet; timer component; F9 behaviour.
- DateTime24 picker (spec §7) as a shared component (24-hour, Israel time — P4).
- Icons and per-type colours (spec-timeline-dashboards §5.5–5.6, spec-log-settings §10) as shared tokens/components.

## Out of scope
The edit sheet (T4), timeline (T4), dashboards (T5), settings and export (T6).

## Done when
- [auto] build, lint, test pass; component tests for the double-submit guard (F4), the default bottle type (F3) and the awake-time thresholds.
- [ui] Tapping the diaper quick action and saving `פיפי` adds it to today's carousel.
- [ui] A short press on sleep starts a sleep (the open-sleep pill appears); another short press ends it with a duration.
- [ui] Saving a bottle with an empty amount shows the validation message; fixing it saves at once (no 10 s block).
- [ui] Reordering two quick buttons survives a reload.
- [human] Recording a feeding one-handed takes as few taps as in the old app.
