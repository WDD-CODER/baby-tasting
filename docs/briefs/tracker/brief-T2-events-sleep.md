# Brief T2 — Events and sleep: data model, API and rules

Read `00-tracker-program.md` (P4, P6, F9, F10, F12) and `spec-server-data.md` §1, §3.5–3.11, §7.6.

## Goal
Every Tracker event type is stored, listed, edited and deleted through one API with the same rules as today (minus
the listed fixes), so the screens of T3–T6 only render.

## Scope
- Data: collection `trackerEvents`, one document per event with every field of `BabyEvent` and its per-type fields
  (spec §1.3, all enums of §1.1), plus `householdId`, `babyId`, audit fields; `deletedAt` soft delete kept (hidden
  from every read). Enums **validated** on the server (today they are not).
- Pure rules in `server/domain/tracker/`: sleep rules (one open sleep; duration in minutes, rounded, minimum 1 —
  spec §3.6, §3.8), event validation per type, the "baby day" start (06:00 Asia/Jerusalem, spec-log-settings §4.0),
  quality tiers (spec §1.4, now shared by server and client through the API), soft-delete filter.
- API under `/api/v1/tracker/`: `GET events` (newest first, limit and range params like spec §3.7), `POST events`,
  `PUT events/:id` (edit any field; clearing a note works; sleep starter/ender kept — F10), `DELETE events/:id` (soft),
  `POST events/clear` (`before` date, inclusive of the chosen date — F7), `GET sleep/open`,
  `POST sleep/toggle` (`{ location, at? }`: starts or ends the open sleep at `at` or now; the parent from the session —
  F9), with `loggedBy` always from the session.
- Repository `server/repositories/tracker-events-repository.js` (INV-2), indexes on `{ householdId, timestamp }`.

## Out of scope
Screens, stats, export, migration.

## Done when
- [auto] Domain tests: sleep toggle opens then closes with the right duration; a second open sleep is refused; an
  overlapping manual sleep is refused; durations round with minimum 1; the baby day starts 06:00 Israel time on both
  sides of a DST switch; every enum rejects an unknown value.
- [auto] Server tests for every route (401 without session; soft-deleted events never returned; clear includes the
  chosen date; editing an open sleep works — F12; clearing a note removes it).
