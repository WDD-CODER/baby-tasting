# Orchestrator run run-020

Run branch: `orch/run-020` (from `origin/main` at 3861e39) · started 2026-11-18T08:51:29.218Z · finished 2026-11-18T09:52:19.084Z
Result: 1 merged, 0 parked, skipped or left out, 1 in the run (counted from git and status.json).
`main` untouched: NO — origin/main is 4e7df74.

Final gate: ok (attempt 1)

## Plans

| Plan | State | Rounds | Builder tier | Merge | Why |
| --- | --- | --- | --- | --- | --- |
| 020 The app loads and answers fast: small icon font, compressed and cached files, fewer database trips | merged | 1 | build | 00a395f |  |

## Decisions

triage: shadow · agreement (last 50): n/a (first run) · collapsed: 0 · ask: 0 · follow-ups: 0

### Not triaged

- D1 · 020 · none · behaviour: the session memory is per repository instance and the catalog memory is per catalog context, each with a registry that clearCatalogMemory() and clearCache() empty (the plan said a module-level map). A single shared map would break the existing tests that wipe the database between tests — reverse: make the Map module-level and call clearCatalogMemory() in those test h
- D2 · 020 · none · behaviour: the two existing auth tests that edit session rows directly now read the changed row through a fresh app, because the 60 s session memory would otherwise hide the edit — reverse: drop the session memory.
- D3 · 020 · none · behaviour: the sync route takes only `limit`, not `from` or `to`, as the plan says — reverse: add parseBound to the route.
- D4 · 020 · none · behaviour: icon.ts now asks for the full font for any icon name that is not in app-icon-names.ts, not only for overrides — reverse: limit the check to the slot override branch.
- D5 · 020 · none · behaviour: the two app icons are palette PNGs (16 colours, no dithering) made with sharp-cli; the 512 px file is 59491 bytes, just under the 60 kB budget — reverse: restore the original PNGs from git.
- D6 · 020 · none · seen: tracker-stats and tracker-events specs/tests assume no other open sleep for the household; tests share one household, so the new sync test deletes its sleep afterwards (server/test/tracker-events.test.js).
- D7 · 020 · none · behaviour: a household icon override outside the small font is now used as it is (plan C5); there is no fallback to the default icon. Reverse: restore the ICON_NAMES check in icon.ts.
- D8 · 020 · none · seen: src/app/pages/tracker/stats-page/stats-page.scss exceeds its 4 kB budget by 1.71 kB (build warning; not touched by this plan)
- D9 · 020 · none · seen: scope-check --diff=origin/orch/run-020 lists files from plan 017 (DESIGN.md, server/domain/suggestions.js, public/emoji-search.json and others) and .playwright-mcp/*.yml as out of scope. None of them are in this branch's commit, so it looks like a stale origin/orch/run-020 ref or untracked files in the worktree.

## Run notes

- 020: the folder baby-tasting-orch-run-020-020 was installed (root, scripts, server)
- 020: builder left undone (round 0): Full `pnpm run test` is not green: `src/app/app.spec.ts` ('shows a household icon override in its slot') still expects an unknown override to fall back to the slot default. Fixing it means dropping the `not_an_icon` expectation (line 94), a one-line edit.; The scope-check, kit-checks and override-ch
- 020: the folder baby-tasting-orch-run-020-020 was installed (server)
- 020: parked: nothing to save (nothing uncommitted)
- 020: ask 020-1 (scope, the Human or the advisor answers): May the builder edit src/app/app.spec.ts and drop its expectation that the unknown override 'not_an_icon' falls back to 'edit_note'?
- 020: ask 020-1 answered by the human: approved: src/app/app.spec.ts
- 020: scope of plan 020 extended on orch/run-020 by the answer to 020-1: src/app/app.spec.ts
- 020: resumed from park/run-020-020: round 0, tier build, after: asking 020-1: replan needed: ESCALATE: scope src/app/app.spec.ts — the test 'shows a household icon override in its slot' (line 94) expects an unknown override
- 020: the folder baby-tasting-orch-run-020-020 was installed (root, scripts, server)
- 020: the folder baby-tasting-orch-merge-run-020 was installed (root, scripts, server)

## Models per agent

- 020 builder: sonnet
- 020 builder fix: sonnet
- 020 reviewer: sonnet

## What only the Human can do

### The plans' [human] items (no UI check ran)

1. 020 The app loads and answers fast: small icon font, compressed and cached files, fewer database trips: In a browser window that never opened the app, the home screen shows its icons as icons right away.
2. 020 The app loads and answers fast: small icon font, compressed and cached files, fewer database trips: An entry saved on one phone appears on the other phone within about 15 seconds without touching it.
3. 020 The app loads and answers fast: small icon font, compressed and cached files, fewer database trips: In Settings → icons the picker shows every icon; an icon picked there shows on the home screen, also after a reload.
4. 020 The app loads and answers fast: small icon font, compressed and cached files, fewer database trips: The installed app icon on the phone looks the same as before.

- Review and merge the run branch (PowerShell, one line each):

```powershell
git fetch origin
gh pr create --base main --head orch/run-020 --title "Orchestrator run run-020" --body-file .claude\orchestrator-runs\run-020.md
```

Context added by learning: 478 chars across 2 roles

Trend (last 3 runs): ✗ per plan 0 → 0 → - · fix rounds per plan 0 → 0 → 1 · parked 0 → 0 → 0
