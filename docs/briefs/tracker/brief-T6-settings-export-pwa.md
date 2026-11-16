# Brief T6 — Tracker settings, Excel export, data reset, PWA

Read `00-tracker-program.md` (P1, F7, F11) and `spec-log-settings.md` §8, §9; `spec-server-data.md` §5, §7.4.

## Goal
Everything the old Settings tab did works in the `מעקב תינוק` section of the settings page, and the app installs on
the phone like today.

## Scope
- Settings (spec §8): legend sub-screen (icon vocabulary, spec-timeline-dashboards §5.7), export card, parents and
  default bottle form (moved here from T1 if T1 placed it elsewhere), baby profile, custom activities (add, remove),
  data management with both reset modals (F7), install-app card.
- Excel export `GET /api/v1/tracker/export/xlsx?from&to` with `exceljs`: the seven right-to-left sheets, columns,
  Hebrew value mappings, formatting and file name `baby_tracker_report_YYYY-MM-DD.xlsx` of spec-server-data §5;
  default range 14 days; F11 fixed. Tasting data is not in this export.
- PWA (spec §9, spec-server-data §7.4): Angular service worker (`@angular/pwa`), manifest with the Tracker name and
  icons (copy `public/pwa-192x192.png`, `public/pwa-512x512.png` from the old repo), install prompt hook and card,
  cache headers like today (no long cache on the service worker file).

## Done when
- [auto] build, lint, test pass; server test: the export returns a workbook with 7 sheets named as in the spec and the weight column shows the latest weigh-in of a day (F11).
- [ui] `ייצוא` downloads `baby_tracker_report_<today>.xlsx`.
- [ui] Adding a custom activity shows it in the activity sheet's options.
- [ui] Delete-from-date with yesterday's date removes yesterday's events and keeps today's (F7).
- [human] The app installs on the phone's home screen and opens full screen.
