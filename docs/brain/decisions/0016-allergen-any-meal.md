---
status: accepted
date: 2026-11-16
review-by: 2027-05-16
---

# 0016. An allergen food may be in any meal; outside meal 1 the calendar shows a soft note

## Context

R4 in `docs/briefs/00-program.md` and INV-6 in `docs/brain/invariants.md` kept every allergen food in meal 1: the
server refused it with `allergen_meal_1` (422) and the calendar refused the drop before the call. Validating plans
009–014, the parents found they could not move today's allergen food to lunch or dinner when that suited the day
(the Human's decision D-015-4, plan 015, 2026-11-16, Arch-approved: Human).

Rejected: keeping the refusal (the parents work around it by not planning the food at all); a confirmation dialog
before the move (an extra tap every time, for a choice the parents already made).

## Decision

An allergen food may be placed, dropped or moved into any meal of a day, on the server (`server/domain/calendar-rules.js`,
`server/lib/calendar-create.js`, `server/routes/calendar.js`) and in the UI mirror (`src/app/core/utils/calendar-rules.ts`).
When an allergen food ends up in meal 2 or 3 the calendar shows a toast, not a refusal:
`שימו לב: אלרגן מחוץ לארוחה הראשונה`. The rules across days stay exactly as they are: introduction days, how many
allergens, the 3-day windows. Suggestions keep placing allergens in meal 1.

## Consequences

Easier: the parents plan the day as it really goes. Harder / accepted: a reaction to an allergen given late in the day
is watched for a shorter time before night; the note is the only reminder. The `allergen_meal_1` code is gone from the
API, so a client that still expects it never sees it.

## Review

At the review-by date, check with the parents how often an allergen sits outside meal 1, and whether a reaction was
ever missed because of it.
