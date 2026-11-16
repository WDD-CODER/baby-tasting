# Orchestrator run tracker-1

Run branch: `orch/tracker-1` (from `origin/main` at fdd97c9) · started 2026-11-16T08:20:52.505Z · finished 2026-11-16T11:06:15.284Z
Result: 6 merged, 0 parked, skipped or left out, 6 in the run (counted from git and status.json).
`main` untouched: yes — origin/main is fdd97c9.

Final gate: ok (attempt 1)

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 009 Tracker base: password sign-in that stays on, five-tab navigation, baby profile, Tracker settings, icon slots | merged | 2 | build → judgment | 8d48995 |  |
| 010 Tracker events and sleep: data model, rules and API | merged | 0 | build | 7969a9e |  |
| 011 Tracker log tab: today at a glance, quick actions, entry sheets, sleep timer and daily trackers | merged | 0 | build | d0f3f3b |  |
| 012 Tracker timeline and the shared edit and delete sheet | merged | 1 | build | bfad385 |  |
| 013 Tracker statistics computed on the server and the six dashboard sections | merged | 0 | build | a28fc38 |  |
| 014 Tracker settings, icon picker, Excel export, data reset and installable app | merged | 0 | build | 802e462 |  |

## Decisions

triage: shadow · agreement (last 50): n/a (first run) · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 009 · none · behaviour: put the icon-name generator at server/lib/gen-icon-names.mjs because the plan's scope block does not list tools/ (K3 names tools/gen-icon-names.mjs) — reverse: move it to tools/ and add tools/gen-icon-names.mjs to the scope
- D2 · 009 · none · behaviour: kept the top-bar title as the existing 'טעימות' (no rename to 'מעקב תינוק') — reverse: change HE.app.name in src/app/core/i18n/he.ts
- D3 · 009 · none · behaviour: the baby PUT keeps the stored birthWeightGrams when the field is omitted and clears it when null; the sign-in password show/hide is a small toggle under the field — reverse: drop the omitted-keeps rule in server/routes/baby.js, or remove the toggle button in login.html
- D4 · 009 · none · behaviour: the unsaved-changes guard on /settings now also covers the tracker form, and the e2e spec 009-5 name from K6 became 009-4 because the plan has four [ui] items — reverse: rename the spec file
- D5 · 009 · none · seen: render.yaml:15 — APP_USERS must be set to name:bcryptHash values in the Render dashboard before the next deploy (render.yaml is outside this plan's scope)
- D6 · 009 · none · behaviour: the icon-name generator is at server/lib/gen-icon-names.mjs, not tools/gen-icon-names.mjs, because tools/** is not in the plan's scope block and server/lib/** is. It reads names from material-symbols/index.d.ts (the package ships no codepoints file) and slot keys from icon-slots.ts — reverse: move the file to tools/ once tools/** is in scope
- D7 · 009 · none · behaviour: parent names must be 1–40 characters after trim, activities 1–40 characters (at most 50), and quickActionOrder must use known ids without repeats; a PUT key the server does not know gets 400 (spec §3.4 stores anything) — reverse: loosen CHECKS in server/domain/tracker/settings.js
- D8 · 009 · none · behaviour: on PUT /api/v1/baby, leaving birthWeightGrams out keeps the stored weight, null clears it; the baby form sends null when the field is empty — reverse: change isWeight/fields in server/routes/baby.js and parseWeight in baby-form.ts
- D9 · 009 · none · behaviour: iconOverrides in a PUT replaces the whole map (like the arrays); there is no per-slot merge — reverse: merge in SettingsRepository.saveTracker
- D10 · 009 · none · behaviour: /timeline and /stats show the existing text עוד אין כאן כלום, and the log page shows only the heading יום חדש ורענן!; these empty states have no action button (app-empty-state actionLabel is now optional) — reverse: pass actionLabel or other texts in pages/tracker/*
- D11 · 009 · none · behaviour: the login error is one centred line under the password field (שם משתמש או סיסמה שגויים for 401) instead of the username field's error slot; the show/hide button sits beside the password field — reverse: bind [error] on the username field in login.html again
- D12 · 009 · none · behaviour: old paths like /foods and /allergens get no redirect; they fall through to ** and land on the Tracker home — reverse: add redirectTo entries to /tasting/... in app.routes.ts
- D13 · 009 · none · behaviour: the [ui] item 1 is split into two e2e files (009-1 sign-in, 009-2 five tabs at 360px) so the five files 009-1 … 009-5 match K6 — reverse: merge them into 009-1
- D14 · 009 · none · behaviour: the Tracker settings load once per sign-in from the shell (for icon overrides and the parent name); sign-out resets them — reverse: drop the effect in shell.ts
- D15 · 009 · none · removes: the old wording שם המשתמש לא מזוהה for a refused sign-in (now שם משתמש או סיסמה שגויים, as the plan says) and the four-tab navigation with emoji icons — reverse: restore HE.auth.unknownUser and the old tabs in shell.ts
- D16 · 010 · none · behaviour: POST and PUT accept and ignore `id` and `loggedBy` in the body, because the session decides them; any other unknown field is a 400 — reverse: reject those two keys as well
- D17 · 010 · none · behaviour: POST /clear requires `before` as YYYY-MM-DD and there is no clear-all; it hard-deletes up to the end of that Asia/Jerusalem day, soft-deleted rows included — reverse: allow an empty body to clear everything
- D18 · 010 · none · behaviour: a PUT on a sleep without `endAt` keeps the stored `endAt`, and `startLocation` is replaced by what the body sends — reverse: treat a missing `endAt` as null
- D19 · 010 · none · behaviour: an open sleep, from a toggle or a POST, is refused with 409 `sleep_overlap` if it would run through an existing later sleep; a second open sleep via POST gives 409 `sleep_already_open` — reverse: check overlap only when the user gave a manual time
- D20 · 010 · none · behaviour: re-deleting an already soft-deleted event returns 404, where the old code re-stamped it and returned success — reverse: drop the deletedAt filter in softDelete
- D21 · 010 · none · behaviour: API field names are `eventType`, `note` and sleep `startedBy`/`endedBy`, mixing the old BabyEvent names with the plan's names; the import (T7) must map `notes` to `note` and `loggedByStart`/`loggedByEnd` to `startedBy`/`endedBy` — reverse: rename in domain/tracker/events.js and sleep.js
- D22 · 011 · none · behaviour: the quick meal sends nutrition {feedType:'BOTTLE'} because the server requires a feed type; the carousel still shows 'האכלה 🍼' and the bottle count ignores quick meals — reverse: let the server accept a nutrition-less quick meal
- D23 · 011 · none · behaviour: activity intensity 0 is sent without cryingIntensity because the server accepts 1-10 — reverse: allow 0 in server/domain/tracker/events.js
- D24 · 011 · none · behaviour: the long-open-sleep banner button 'סיום השינה' opens the sleep sheet, where end-current-sleep uses the chosen time, because the edit sheet is plan 012 — reverse: open the edit sheet once it exists
- D25 · 011 · none · behaviour: banners, floating pills and notifications live on the log page only, not on every tab — reverse: render app-log-banners in the shell
- D26 · 011 · none · behaviour: the quick sleep toggle cannot send quickRecorded because the server toggle accepts only location and at — reverse: add the field to tracker-sleep.js
- D27 · 011 · none · behaviour: carousel cards and daily-tracker chips are not tappable until plan 012 adds editing — reverse: add a click handler that opens the edit sheet
- D28 · 011 · none · behaviour: the entry sheet closes on a backdrop tap (the shared app-bottom-sheet does this), unlike the old app — reverse: ignore backdrop taps in the sheet
- D29 · 011 · none · seen: server/domain/tracker/icon-names.js:1 — `node server/lib/gen-icon-names.mjs` rewrites it for the 23 new slots but it is outside this plan's scope, so I reverted it. Until it is regenerated the server rejects icon overrides for the new slots; run it in the icon-settings plan, or approve that path.
- D30 · 011 · none · seen: e2e/001-2-components.spec.ts:10 — the /dev/components section count went from 14 to 15 with the new DateTime24 section; updated in scope
- D31 · 012 · none · behaviour: undoing a delete (the toast button ביטול) re-creates the event with POST, because there is no restore endpoint for Tracker events. It gets a new id and the current parent as logger — reverse: remove the toast action in EntrySheet.confirmDelete()
- D32 · 012 · none · behaviour: the timeline filter lives in the page, so it returns to היום each time /timeline is opened, not only when the app opens — reverse: move the signal into a root service
- D33 · 012 · none · behaviour: a quick-recorded bottle has no amounts, so its row shows no detail line instead of 'undefined' or 0, and it gets no tier accent — reverse: show raw values as spec §2.6 does
- D34 · 012 · none · behaviour: the edit sheet opens a quick-recorded bottle with the form defaults (120 ml offered and consumed), as spec §4.1 does. Saving it also stores those amounts, even if only the note was changed — reverse: skip amounts when none were stored
- D35 · 012 · none · behaviour: the edit sheet is a bottom sheet (the shared sheet component), not the old centred dialog — reverse: use a different shell component
- D36 · 012 · none · behaviour: the edit sheet shows the Hebrew event type, not the raw English enum (F10)
- D37 · 012 · none · behaviour: the delete confirmation is an inline strip inside the sheet, using the existing deleteStrip, deleteYes and deleteNo strings
- D38 · 013 · none · behaviour: the server stats count baby days from 06:00 Asia/Jerusalem, not midnight, because the plan asks for the 06:00 day start (the old spec used calendar days) — reverse: pass dayStartHour 0 in server/routes/tracker-stats.js
- D39 · 013 · none · behaviour: sleepStats returns every day of the range with zeros so a 7-day range gives 7 bars; the other five only list days that have events — reverse: drop the zero-fill in sleepStats
- D40 · 013 · none · behaviour: the page fetches the stats again when the range changes and after the edit sheet closes, not on a timer — reverse: remove the effects in stats-page.ts
- D41 · 013 · none · behaviour: the quality-tier accent on expanded cards (spec §3.3, §3.8) is not applied, to keep the scope small — reverse: reuse the tier rules from timeline-row-view.ts
- D42 · 013 · none · behaviour: the range is capped at 366 days and a reversed range (to before from) is 400 `invalid` — reverse: delete those two checks in tracker-stats.js
- D43 · 013 · none · seen: src/app/pages/tracker/stats-page/stats-page.scss is 1.71 kB over its 4 kB style budget (build warning only)
- D44 · 014 · none · seen: plan Done-when [ui] item 1 names `nights_stay`, but the installed material-symbols 0.49.0 (the latest on npm) has no such icon (src/app/core/icons/icon-names.ts), so the picker cannot offer it and a server override with it is refused — e2e/014-1-icon-picker.spec.ts uses `nightlight`; the plan item needs a name that exists in the font
- D45 · 014 · none · behaviour: the legend is a sub-screen shown in place on /settings (a back button returns), not a new route, because the plan appends only settings/icons — reverse: add a settings/legend route and link to it
- D46 · 014 · none · behaviour: `אפס הכל` (full reset) sends POST /tracker/events/clear { before: '9999-12-31' } because the existing server route requires a date — reverse: let the server accept a body without `before` as 'all'
- D47 · 014 · none · behaviour: a custom-activity name is removed by exact name (all duplicates go), with no confirmation, and the add field has no Enter-to-submit, as in spec §8.6 — reverse: wrap the field in a form and add a confirm on remove
- D48 · 014 · none · behaviour: the export date range shows an inline error and disables the button when `to` is before `from` (the spec had no check) — reverse: drop `error_` in export-card.ts
- D49 · 014 · none · behaviour: the baby-profile form on Settings is the existing shared app-baby-form, with its own save button, rather than the old ± 10 g stepper — reverse: build a stepper variant in shared/baby-form
- D50 · 014 · none · behaviour: the icon-picker keyword chips show only the Latin keywords of a slot, since the search runs on English icon names — reverse: show every keyword and map Hebrew words to English names
- D51 · 014 · none · seen: src/app/pages/tracker/stats-page/stats-page.scss exceeds the 4 kB component style budget (5.71 kB) — a build warning that predates this plan

## Run notes

- 009: the folder baby-tasting-orch-tracker-1-009 was installed (root, scripts, server)
- 009: the folder baby-tasting-orch-tracker-1-009 was installed (root, server)
- 009: builder left undone (round 1): [ui] items: e2e/009-1-signin.spec.ts, 009-2-stay-signed-in.spec.ts, 009-3-tasting-section.spec.ts, 009-4-parent-name.spec.ts: written, not run
- 009: escalated to a fresh judgment-tier builder (round 2): gate: pnpm run build, pnpm run test
- 009: the folder baby-tasting-orch-tracker-1-009 was installed (root, server)
- 009: builder left undone (round 2): [ui] Signing in with parent-a / test-pass-a opens / and shows יום חדש ורענן!: written, not run; [ui] the five tabs are visible at 360px: written, not run; [ui] a new page in the same browser context opens the Tracker home without the sign-in page: written, not run; [ui] טעימות opens /tasting; its to
- 009: [ui] Signing in on `/login` with `parent-a` and password `test-pass-a` opens `/` and shows `יום חדש ורענן!`; the five tabs `תיעוד`, `ציר זמן`, `סטטיסטיקה`, `טעי: written, not run — checked by the run's [ui] step / the Human
- 009: [ui] `טעימות` opens `/tasting` (the tasting calendar); its top tab `מזונות` opens `/tasting/foods`.: written, not run — checked by the run's [ui] step / the Human
- 009: [ui] On `/settings`, saving `אמא` → `מאיה` as parent A's name shows `מאיה` in the top bar.: written, not run — checked by the run's [ui] step / the Human
- 009: the folder baby-tasting-orch-tracker-1-009 was installed (root, server)
- 009: the folder baby-tasting-orch-merge-tracker-1 was installed (root, scripts, server)
- 010: the folder baby-tasting-orch-tracker-1-010 was installed (root, scripts, server)
- 011: the folder baby-tasting-orch-tracker-1-011 was installed (root, scripts, server)
- 011: builder left undone (round 0): 011-1-diaper: written, not run; 011-2-sleep: written, not run; 011-3-bottle: written, not run; 011-4-reorder: written, not run; [human] one-handed feeding tap count: left to the Human
- 012: the folder baby-tasting-orch-tracker-1-012 was installed (root, scripts, server)
- 012: builder left undone (round 0): [ui] 012-1 filter: written, not run; [ui] 012-2 bottle amount: written, not run; [ui] 012-3 clear note: written, not run; [ui] 012-4 delete and ביטול: written, not run; [human] The timeline reads as clearly as the old one.
- 013: the folder baby-tasting-orch-tracker-1-013 was installed (root, scripts, server)
- 013: builder left undone (round 0): 013-1 (nutrition shows 150): written, not run; 013-2 (7 ימים gives 7 bars): written, not run; [human] The numbers match what the parents remember for the last few days (left to the Human)
- 014: the folder baby-tasting-orch-tracker-1-014 was installed (root, scripts, server)
- 014: builder left undone (round 0): [ui] Settings -> אייקונים, choosing the sleep quick button icon shows it on / and איפוס לברירת מחדל restores the default: written, not run (e2e/014-1-icon-picker.spec.ts; uses `nightlight` because `nights_stay` is not in the installed font); [ui] ייצוא downloads baby_tracker_report_<today>.xlsx: wri
- 014: [ui] In Settings → `אייקונים`, choosing `nights_stay` for the sleep quick button shows it on `/`; `איפוס לברירת מחדל` brings the default back.: written, not run — checked by the run's [ui] step / the Human
- 014: [ui] In Settings, `ייצוא` downloads a file named `baby_tracker_report_<today>.xlsx`.: written, not run — checked by the run's [ui] step / the Human
- 014: the folder baby-tasting-orch-tracker-1-014 was installed (root, server)
- 014: the folder baby-tasting-orch-merge-tracker-1 was installed (root, server)

## Models per agent

- 009 builder: sonnet
- 009 reviewer: sonnet
- 009 builder fix: sonnet
- 009 judgment builder: opus
- 010 builder: sonnet
- 010 reviewer: sonnet
- 011 builder: sonnet
- 011 reviewer: sonnet
- 012 builder: sonnet
- 012 reviewer: sonnet
- 012 builder fix: sonnet
- 013 builder: sonnet
- 013 reviewer: sonnet
- 014 builder: sonnet
- 014 reviewer: sonnet

## What only the Human can do

### Removed behaviour — check before merging the PR

1. 009: D15 removes: the old wording שם המשתמש לא מזוהה for a refused sign-in (now שם משתמש או סיסמה שגויים, as the plan says) and the four-tab navigation with emoji icons — reverse: restore HE.auth.unknownUser and the old tabs in shell.ts — open the screen; accept: decisions: ok · keep it: D15 ✗ restore

### The plans' [human] items (no UI check ran)

2. 009: Signing in on `/login` with `parent-a` and password `test-pass-a` opens `/` and shows `יום חדש ורענן!`; the five tabs `תיעוד`, `ציר זמן`, `סטטיסטיקה`, `טעימות`, — a [ui] card no script could check and the browser step was off; on a page not named
3. 009: `טעימות` opens `/tasting` (the tasting calendar); its top tab `מזונות` opens `/tasting/foods`. — a [ui] card no script could check and the browser step was off; on a page not named
4. 009: On `/settings`, saving `אמא` → `מאיה` as parent A's name shows `מאיה` in the top bar. — a [ui] card no script could check and the browser step was off; on a page not named
5. 014: In Settings → `אייקונים`, choosing `nights_stay` for the sleep quick button shows it on `/`; `איפוס לברירת מחדל` brings the default back. — a [ui] card no script could check and the browser step was off; on a page not named
6. 014: In Settings, `ייצוא` downloads a file named `baby_tracker_report_<today>.xlsx`. — a [ui] card no script could check and the browser step was off; on a page not named
7. 009 Tracker base: password sign-in that stays on, five-tab navigation, baby profile, Tracker settings, icon slots: Navigation feels natural with Tracker first and Tasting one tap away.
8. 011 Tracker log tab: today at a glance, quick actions, entry sheets, sleep timer and daily trackers: Recording a feeding one-handed takes as few taps as in the old app.
9. 012 Tracker timeline and the shared edit and delete sheet: The timeline reads as clearly as the old one.
10. 013 Tracker statistics computed on the server and the six dashboard sections: The numbers match what the parents remember for the last few days.
11. 014 Tracker settings, icon picker, Excel export, data reset and installable app: The app installs on the phone's home screen and opens full screen; the icon picker makes finding a fitting icon easy.

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/tracker-1 --title "Orchestrator run tracker-1" --body-file .claude\orchestrator-runs\tracker-1.md
```

Context added by learning: 368 chars across 2 roles

Trend (last 2 runs): ✗ per plan 0 → - · fix rounds per plan 0.25 → 0.5 · parked 0 → 0
