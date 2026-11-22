# Decision log

Decisions the Human graded wrong (`docs/agent/decision-review.md`). Written by `node scripts/decision-log.mjs add` after a graded reply — never by hand. Builders do not read this file; they read `agent-rules.md`, where a mistake that repeats becomes a rule.

| Date | Plan | Decision | Verdict | Human | Kind | Checker miss |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-22 | 022 | behaviour: the delete button does nothing while a save or delete is in progress, as the old strip's confirm did — reverse: remove the submitting() guard in askDelete() | ✗ | also block the delete button from touch while the save runs (disabled, so a tap cannot land) | - | no |
| 2026-11-22 | 026 | behaviour: the bar's chevron is a text character (⌄) turned by state, not an icon slot — reverse: swap in an app-icon slot | ✗ | the bar's open/close arrow is an icon (fixed is fine), never a text character | - | no |
