# Run log

One row per orchestrator run, written by `node scripts/orch-state.mjs finish` from the run's `status.json` — never by hand. The `✗` columns of a run are filled by the next `finish`, from `decision-log.md` (a log row belongs to the run whose plan list holds its plan number); the newest run's stay `-` until then. The table keeps the 20 newest rows; older ones are rolled into one `Earlier (N runs): …` line above it.

| Date | Run | Plans | Merged | Parked | Parked reasons | Fix rounds | Escalations | Gate fails | Final gate | ✗ | Checker misses | ✗ per plan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-15 | night-1 | 001,002,003,004,005,006,007,008 | 8 | 0 | - | 2 | 3 | 0 | ok | 0 | 0 | 0 |
| 2026-11-16 | tracker-1 | 009,010,011,012,013,014 | 6 | 0 | - | 3 | 1 | 1 | ok | 0 | 0 | 0 |
| 2026-11-16 | tracker-2 | 015 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-16 | tracker-3 | 016 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-16 | tasting-017 | 017 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-17 | run-018 | 018 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-17 | run-019 | 019 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-18 | run-020 | 020 | 1 | 0 | - | 1 | 1 | 1 | ok | 0 | 0 | 0 |
| 2026-11-18 | run-021 | 021 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-19 | run-022 | 022 | 1 | 0 | - | 0 | 0 | 0 | ok | 0 | 0 | 0 |
| 2026-11-19 | run-023 | 023,024,025 | 3 | 0 | - | 1 | 1 | 1 | ok | 0 | 0 | 0 |
| 2026-11-20 | run-027 | 027,028 | 2 | 0 | - | 0 | 1 | 0 | ok | - | - | - |
| 2026-11-19 | run-026 | 026 | 1 | 0 | - | 0 | 1 | 0 | ok | - | - | - |
