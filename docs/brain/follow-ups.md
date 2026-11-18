# Follow-ups

Defects and gaps agents saw outside their job (`seen:` decisions, and `behaviour:` ones the triage called follow-up), kept after the Human graded them (`docs/agent/decision-review.md` §5). Written by `node scripts/decision-log.mjs grade` — never by hand. `/plan`'s review lists the open ones for the files a new plan touches; a plan that takes one writes `- follow-up: <run> <id>` in its Execution Notes.

| Date | Run | Plan | Id | File:line | Decision | Human |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-18 | run-020 | 020 | D6 | - | seen: tracker-stats and tracker-events specs/tests assume no other open sleep for the household; tests share one household, so the new sync test deletes its sleep afterwards (server/test/tracker-events.test.js). | ok |
| 2026-11-18 | run-020 | 020 | D8 | - | seen: src/app/pages/tracker/stats-page/stats-page.scss exceeds its 4 kB budget by 1.71 kB (build warning; not touched by this plan) | ok |
| 2026-11-18 | run-020 | 020 | D9 | - | seen: scope-check --diff=origin/orch/run-020 lists files from plan 017 (DESIGN.md, server/domain/suggestions.js, public/emoji-search.json and others) and .playwright-mcp/*.yml as out of scope. None of them are in this branch's commit, so it looks like a stale origin/orch/run-020 ref or untracked files in the worktree. | ok |
