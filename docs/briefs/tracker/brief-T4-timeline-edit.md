# Brief T4 — Timeline and the shared edit/delete sheet

Read `00-tracker-program.md` (F5, F8, F10) and `spec-timeline-dashboards.md` §2, §4, §5.5; `spec-log-settings.md` §6.9.

## Goal
Parents scroll everything that happened, newest first, and fix or delete any entry.

## Scope
- Timeline page `ציר זמן` (spec §2): flat list newest first, filter `היום` / `7 ימים` / `14 ימים` (rolling, reset to
  1 day on app open), pinned `ישן עכשיו` card, per-type row rendering with the exact Hebrew titles and details (§2.6),
  quality-tier accents (§2.7), big-nap badge, memo `!` badge, `⚡ מהיר` chip, empty and loading states.
- Edit sheet (spec-log-settings §6.9, spec-timeline-dashboards §4): opened from any row (and later from dashboard
  cards), every field of every type editable (F5, F8), Hebrew type title (F10), save via `PUT`, delete via the
  confirmation strip and `DELETE` with an error toast on failure (F10), undo toast as today.

## Done when
- [auto] build, lint, test pass; component test: each event type renders its Hebrew title and detail line.
- [ui] Switching the filter to `7 ימים` shows an event from 3 days ago that `היום` hides.
- [ui] Editing a quick-recorded bottle's amount keeps its feed type and saves the new amount (F5).
- [ui] Clearing a note and saving removes the note from the row (F10).
- [ui] Deleting a row asks first, then the row disappears.
- [human] The timeline reads as clearly as the old one.
