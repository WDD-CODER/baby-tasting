# Brief T7 — Firestore → MongoDB copy and switch-over

Read `00-tracker-program.md` (TR2) and `spec-server-data.md` §2 (Firestore layout), §1.2–1.3.

Runs **solo with the Human**, after T1–T6 are validated. Needs: the Tracker Firebase service-account file and the
MongoDB Atlas connection string (both stay out of git).

## Goal
Every event and the settings of today's Tracker are in the new app's MongoDB, checked, and the parents use the new
app from then on.

## Scope
- `tools/migrate-tracker-from-firestore.mjs` (its own `firebase-admin` dev dependency, run with the two secrets as
  environment variables): reads `households/shared-household` (settings, baby profile) and its `events` subcollection
  (spec §2.1–2.4: ISO strings, doc id = `event.id`, extra fields possible, soft-deleted events included); maps each to
  the T2 model (unknown extra fields kept under `legacy`), keeps the original id in `legacyId`, sets `householdId` and
  `babyId`; idempotent (upsert by `legacyId`); `--dry-run` prints counts per type and the first 3 mapped documents.
- Check report: counts per type and per day in both stores; any difference listed by id.
- Switch-over steps for the Human (written in the brief's README): freeze writes in the old app (sign out both phones),
  run the copy, compare, open the new app, install it, archive the old Render service and repository.

## Done when
- [auto] `node --test tools/migrate-tracker-from-firestore.test.js` (fixtures of every event type, a soft-deleted
  event, an unknown extra field) passes; a second run creates nothing new.
- [human] The dry run on the real data shows the expected counts; after the copy, the check report shows no differences.
- [human] The last week in the new app's timeline matches the old app.
