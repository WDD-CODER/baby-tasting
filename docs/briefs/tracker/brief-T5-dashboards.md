# Brief T5 — Dashboards and stats

Read `00-tracker-program.md` (P4, P6, F1) and `spec-timeline-dashboards.md` §3; `spec-server-data.md` §4.

## Goal
The `סטטיסטיקה` page answers "how is the baby eating, sleeping, peeing, pumping, spitting up and growing" over a
chosen range, with numbers the server computes once.

## Scope
- Pure stats functions in `server/domain/tracker/stats.js` for nutrition, sleep, diapers, weight, pumping and
  vomiting (spec-server-data §4 math; the pumping and vomiting numbers today computed in the browser —
  spec-timeline-dashboards §3.6–3.7 — move here), days in Asia/Jerusalem, the dashboards' range starting at 06:00
  (spec §3.2) passed as a parameter.
- Routes `GET /api/v1/tracker/stats/{nutrition|sleep|diapers|weight|pumping|vomiting}?from=YYYY-MM-DD&to=YYYY-MM-DD` (F1).
- Page (spec §3.1–3.8): six collapsible sections in order, range control `היום` / `3` / `7` / `14` ימים, every tile,
  label, empty state and format; the CSS bars (split bars, sleep bar chart scaled to a 16-hour target, sleep/awake
  sequence) as shared components using tokens (no chart library); cards open the T4 edit sheet where they do today.

## Done when
- [auto] Domain tests per stats function with fixed data (including a DST-switch day and an empty range); route tests with `YYYY-MM-DD` params.
- [ui] With two bottles today (60 and 90 ml), the nutrition section shows `150` ml for `היום`.
- [ui] Switching to `7` ימים changes the sleep bar chart to 7 bars.
- [human] The numbers match what the parents remember for the last few days.
