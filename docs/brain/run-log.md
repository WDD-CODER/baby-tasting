# Run log

One row per orchestrator run, written by `node scripts/orch-state.mjs finish` from the run's `status.json` — never by hand. The `✗` columns of a run are filled by the next `finish`, from `decision-log.md` (a log row belongs to the run whose plan list holds its plan number); the newest run's stay `-` until then. The table keeps the 20 newest rows; older ones are rolled into one `Earlier (N runs): …` line above it.

| Date | Run | Plans | Merged | Parked | Parked reasons | Fix rounds | Escalations | Gate fails | Final gate | ✗ | Checker misses | ✗ per plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-15 | night-1 | 001,002,003,004,005,006,007,008 | 8 | 0 | - | 2 | 3 | 0 | ok | 0 | 0 | 0 |
| 2026-11-16 | tracker-1 | 009,010,011,012,013,014 | 6 | 0 | - | 3 | 1 | 1 | ok | - | - | - |
