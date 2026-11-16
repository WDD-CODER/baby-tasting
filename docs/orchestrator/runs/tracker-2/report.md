# Orchestrator run tracker-2

Run branch: `orch/tracker-2` (from `origin/main` at fe41552) · started 2026-11-16T13:37:21.037Z · finished 2026-11-16T14:18:23.406Z
Result: 1 merged, 0 parked, skipped or left out, 1 in the run (counted from git and status.json).
`main` untouched: yes — origin/main is fe41552.

Final gate: ok (attempt 1)

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 015 Validation fixes: sleep sheet modes, averages over days with data, typed time picker, allergen in any meal | merged | 0 | judgment | 8d554ff |  |

## Decisions

triage: shadow · agreement (last 50): n/a (first run) · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 015 · none · removes: ending the running sleep at a chosen earlier time from the hold sheet (F9) — the time field there is now the start (mode 1), so 'סיים שינה נוכחית' ends at now; an earlier end is still possible by editing the closed sleep on the timeline — reverse: give the end button its own time field in mode 1
- D2 · 015 · none · removes: the end-time field when editing the open sleep from the timeline or banner (it could close the sleep) — D-015-1 says time only — reverse: show the sleepEnd picker again when editingOpenSleep()
- D3 · 015 · none · removes: the picker's '+5 minutes' arrow and the 'לפני 15 דק׳' / 'לפני שעה' chips (relative to now) — replaced by the chips D-015-3 lists (עכשיו, −5, −15, −30 relative to the value) — reverse: add the chips back in datetime24.html
- D4 · 015 · none · removes: the API error code allergen_meal_1 (422) on calendar create/move and suggestion accept — reverse: restore checkPlacement in server/domain/calendar-rules.js and its calls
- D5 · 015 · none · behaviour: a time-only start (mode 1 and editing the open sleep) is read as the latest such time that is not in the future (today, or yesterday when today's would be ahead), so a sleep started before midnight can be set — reverse: use the date part of the field (the old start's date) in saveFixStart() and build()
- D6 · 015 · none · behaviour: saving mode 1 closes the sheet and shows the toast 'שעת ההירדמות עודכנה'; a future start shows 'שעת ההירדמות לא יכולה להיות בעתיד' — reverse: remove the toast in saveFixStart()
- D7 · 015 · none · behaviour: the end-or-keep question shows after the sheet closes; Escape or a tap on the backdrop counts as 'להשאיר פעילה' — reverse: close the sheet only after askEndOrKeep() answers
- D8 · 015 · none · behaviour: typing fewer than 4 digits and leaving the field shows the error and keeps the previous value; 4 digits that are not a real time (25:10) show the error at once — reverse: change onTypedBlur() to revert silently
- D9 · 015 · none · behaviour: the allergen note also shows after adding an allergen food to meal 2 or 3 through the add-food sheet, not only after a move — reverse: drop the noteAllergenMeal call in pickFood()
- D10 · 015 · none · behaviour: weight stats totals now carry rangeDays and daysWithData too, so all six kinds match — reverse: remove both fields from weightStats()

## Run notes

- 015: starts on the judgment tier: INV-6 changes
- 015: the folder baby-tasting-orch-tracker-2-015 was installed (root, scripts, server)
- 015: builder left undone (round 0): [ui] running sleep, start set 20 minutes earlier, stays active, timer shows 20+ minutes: written, not run (e2e/015-1-sleep-start-fix.spec.ts); [ui] past sleep 2h–1h ago + 'להשאיר פעילה' keeps both: written, not run (e2e/015-2-past-sleep-keep.spec.ts); [ui] /stats nutrition average unchanged from היו
- 015: [ui] During a running sleep, recording a past sleep from 2 hours ago to 1 hour ago and choosing `להשאיר פעילה` leaves the running sleep open, and the timeline s: written, not run — checked by the run's [ui] step / the Human
- 015: the folder baby-tasting-orch-merge-tracker-2 was installed (root, scripts, server)

## Models per agent

- 015 builder: opus
- 015 reviewer: sonnet

## What only the Human can do

### Removed behaviour — check before merging the PR

1. 015: D1 removes: ending the running sleep at a chosen earlier time from the hold sheet (F9) — the time field there is now the start (mode 1), so 'סיים שינה נוכחית' ends at now; an earlier end is still possible by editing the closed sleep on the timeline — reverse: give the end button its own time field in mode 1 — open the screen; accept: decisions: ok · keep it: D1 ✗ restore
2. 015: D2 removes: the end-time field when editing the open sleep from the timeline or banner (it could close the sleep) — D-015-1 says time only — reverse: show the sleepEnd picker again when editingOpenSleep() — open the screen; accept: decisions: ok · keep it: D2 ✗ restore
3. 015: D3 removes: the picker's '+5 minutes' arrow and the 'לפני 15 דק׳' / 'לפני שעה' chips (relative to now) — replaced by the chips D-015-3 lists (עכשיו, −5, −15, −30 relative to the value) — reverse: add the chips back in datetime24.html — open the screen; accept: decisions: ok · keep it: D3 ✗ restore
4. 015: D4 removes: the API error code allergen_meal_1 (422) on calendar create/move and suggestion accept — reverse: restore checkPlacement in server/domain/calendar-rules.js and its calls — open the screen; accept: decisions: ok · keep it: D4 ✗ restore

### The plans' [human] items (no UI check ran)

5. 015: During a running sleep, recording a past sleep from 2 hours ago to 1 hour ago and choosing `להשאיר פעילה` leaves the running sleep open, and the timeline shows  — a [ui] card no script could check and the browser step was off; on a page not named
6. 015 Validation fixes: sleep sheet modes, averages over days with data, typed time picker, allergen in any meal: Typing a time on the phone is quick and clear.

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/tracker-2 --title "Orchestrator run tracker-2" --body-file .claude\orchestrator-runs\tracker-2.md
```

Context added by learning: 482 chars across 2 roles

Trend (last 3 runs): ✗ per plan 0 → 0 → - · fix rounds per plan 0.25 → 0.5 → 0 · parked 0 → 0 → 0
