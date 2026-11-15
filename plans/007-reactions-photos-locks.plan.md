# Plan 007 — Reactions with photos, and locks on the suspected foods until a parent releases them

Status: draft
Depends-on: 006
Snapshot: ebf1b1f24e30f84c61981a4b78904df83e192c8f
Source: docs/briefs/brief-7-reactions-locks.md (product rules: docs/briefs/00-program.md R7, D6, section 5, section 8)

## Problem Statement
When the baby reacts to something, a parent must be able to record it in under a minute — with symptoms, severity, text
and photos — and the suspected foods and allergens must stay locked until a parent explicitly releases them.

## Goals & Success Criteria
**Primary:** a reaction saved from a given item locks every allergen and regular food of that meal; locked foods cannot
be placed, are flagged and skipped by suggestions; release is explicit, confirmed and recorded.

- [auto] `pnpm run build` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `pnpm run test` exits 0.
- [auto] `node --test server/test/reactions.test.js server/test/locks.test.js server/test/uploads.test.js` exits 0, covering: a reaction on a meal with `טחינה` and `בננה` locks the sesame allergen and the banana food; adding either to the calendar (create and move) is refused with 409 `food_locked`; `GET /api/v1/allergens/status` reports sesame `locked`; `POST /api/v1/allergens/:id/release` restores the computed state and records `releasedBy` and `releasedAt`; deleting the reaction leaves the lock; a reaction with no item, or with an item that is not `given` or is older than the day before, is refused with 400; `POST /api/v1/uploads/signature` answers 401 without a session and 503 `photos_not_configured` when Cloudinary is not configured; with a fake Cloudinary adapter, deleting a reaction deletes its photos through the adapter; suggestions skip a locked food.
- [auto] `node --test server/domain/allergen-engine.test.js server/domain/suggestions.test.js` exits 0, including the new case: a locked allergen produces no `intro_missing`, `maintenance_gap` or `maintenance_week` alert and exactly one `locked` alert.
- [ui] From a given `ביצה קשה` item on `/`, recording a reaction with `פריחה`, `קל` and a text shows it on `/allergens/reactions`, and `/allergens` shows `ביצה` with `נעול`.
- [ui] Adding `חביתה` to the calendar then shows `חביתה נעול בעקבות תגובה`.
- [ui] `שחרור` on `ביצה` asks `לשחרר את ביצה? ודאו שהתייעצתם עם רופא/ה`; after confirming, the lock is gone and `חביתה` can be added.
- [ui] On the reaction form, choosing `קושי בנשימה` shows `במקרה של קושי בנשימה או החמרה מהירה — התקשרו 101`.
- [human] With the Cloudinary keys in `server/.env`, a reaction with one photo from the phone camera saves, shows the photo, and the whole recording takes under a minute.

## Execution Mode
- Parallel: no
- Concurrent plans: none (runs after 006)
- Isolated DB: no
- Reviewer: gate

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/app.js
server/config.js
server/package.json
server/pnpm-lock.yaml
server/.env.example
server/domain/**
server/routes/**
server/repositories/**
server/middleware/**
server/lib/**
server/test/**
src/app/app.routes.ts
src/app/core/**
src/app/shared/**
src/app/pages/calendar/**
src/app/pages/foods/**
src/app/pages/allergens/**
src/app/pages/reactions/**
e2e/**
DESIGN.md
docs/project/current-state.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — `applyLocks` and the lock checks are pure functions in `server/domain/`; Cloudinary is reached only from `server/lib/cloudinary.js`, never from the domain.
- INV-2: preserves — reactions and locks go through new repositories in `server/repositories/`.
- INV-3: preserves — reactions, uploads and release routes sit behind the existing auth middleware; the signature route requires a session.
- INV-4: preserves — new routes under `/api/v1/`, plain JSON; `noticedAt`, `releasedAt` are ISO timestamps, `date` is `YYYY-MM-DD`.
- INV-5: preserves — the lock uses `--color-tier-bad` and 🔒 as DESIGN.md defines.
- INV-6: preserves — the lock check runs in addition to the meal-1 rule on create and move.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a parent who sees a rash after lunch, I tap the egg on the calendar, choose `תגובה`, pick symptoms and severity, add a photo and save.
- As a parent, I cannot accidentally plan egg again until we decide to release it.
- As a parent, after talking to the doctor, I release egg with one confirmed action and the app goes back to its normal state.

## Functional Requirements

### Must Have (P0)
- [ ] Reactions CRUD (date and time noticed, related given items, symptoms, severity, text, photos ≤ 5, who recorded).
- [ ] Signed Cloudinary upload behind one server adapter; the server starts and reactions save without Cloudinary.
- [ ] Locks (R7) on save, layered onto the engine state; refused placement; flagged future items; suggestions skip locked foods.
- [ ] Release for allergens and foods with confirmation, recording who and when.
- [ ] Reaction page, reactions list, lock indicators and `שחרור` everywhere the lock shows, the 101 notice.

## UI/UX Notes
- Item actions sheet (plan 004): for a `given` item add `תגובה` → `/reactions/new?itemId=<id>`.
- Reaction page (separate page, not a sheet): `מתי הבחנתם?` date-time (default now), `קשור ל־` checkboxes of that day's and the previous day's given items (the starting item pre-checked), symptoms as toggle chips (`פריחה`, `אדמומיות סביב הפה`, `נפיחות`, `הקאה`, `שלשול`, `קושי בנשימה`, `אחר`), severity as three chips (`קל`, `בינוני`, `חמור`), free text, photos (`הוספת תמונה` → `<input type="file" accept="image/*" capture="environment" multiple>`, thumbnails with remove, max 5), save. The 101 notice is a fixed bad-colour card at the top while `קושי בנשימה` or `חמור` is chosen. Under the save button, secondary text: `שמירה תנעל את המזונות והאלרגנים שסומנו עד לשחרור ידני`. Unsaved-changes guard.
- Photos without Cloudinary: the add-photo button shows `העלאת תמונות לא מוגדרת עדיין` (disabled) when the signature route answers `photos_not_configured`; the reaction still saves.
- `/allergens/reactions`: reactions newest first (date, foods, symptoms, severity chip, first photo thumbnail); tap → `/reactions/:id` (same page, edit mode, with delete + confirm). A link `תגובות` on the `/allergens` page leads there.
- Lock indicators: calendar tiles of a locked food or allergen get the 🔒 badge (via `badgeFor`); `/foods` rows 🔒; `/allergens` card state chip `נעול` (bad tone) with a `שחרור` button. Release confirm: `לשחרר את {name}? ודאו שהתייעצתם עם רופא/ה`.
- Alert (`locked` kind): `{name} נעול בעקבות תגובה` and, when future planned items of it exist, ` · {n} פריטים מתוכננים` — tap → `/allergens`.
- Refusals: add or drop of a locked food → toast `{food} נעול בעקבות תגובה`.

## Atomic Sub-tasks

- [ ] G1: Store reactions and locks through repositories — `server/repositories/reactions-repository.js` (documents `{ householdId, babyId, noticedAt, date, itemIds, foodIds, symptoms, severity, text, photos: [{ publicId, url }], createdBy, audit }`), `server/repositories/locks-repository.js` (`{ householdId, babyId, targetType: 'allergen'|'food', targetId, reactionIds, lockedAt, lockedBy, releasedAt, releasedBy }`; one active lock per target — a second reaction adds its id; `listActive`, `lockTargets`, `release(householdId, targetType, targetId, user, now)`) — server/repositories/**
- [ ] G2: Layer locks onto the engine — fill `applyLocks(result, locks)` in `server/domain/allergen-engine.js`: a locked allergen gets `state: 'locked'` and `baseState` (the computed state), its `intro_missing` / `maintenance_*` alerts are removed and one `{ id: 'locked:<id>', kind: 'locked', allergenId }` alert added; `server/domain/locks.js` `isPlacementLocked({ food, lockedFoodIds, lockedAllergenIds })` and `locksForReaction({ items, foods })` → `{ allergenIds, foodIds }` (each allergen of the related foods, each related food without an allergen); tests added to `server/domain/allergen-engine.test.js` and `server/domain/locks.test.js` — server/domain/**
- [ ] G3: Refuse placing locked foods and flag their planned items — `server/lib/locks.js` `getLockedIds` now reads active locks; calendar create and move (and suggestion accept through `server/lib/calendar-create.js`) refuse with 409 `food_locked`; `GET /api/v1/calendar` items carry `locked: true` when their food or its allergen is locked; the status and alerts routes pass locks to the engine; the `locked` alert carries `plannedCount` (future planned items) and `targetName`; suggestions get the locked ids — server/lib/**, server/routes/**
- [ ] G4: Record reactions and lock on save — `server/routes/reactions.js`: `GET /api/v1/reactions` (newest first, `?foodId=` filter), `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id`; validation: `noticedAt` ISO timestamp not in the future, `itemIds` ≥ 1, each a `given` item of the household dated the reaction's date or the day before, `symptoms` ⊆ the 7 keys (`rash`, `mouth_redness`, `swelling`, `vomiting`, `diarrhea`, `breathing`, `other`) and ≥ 1, `severity` ∈ `mild`, `moderate`, `severe`, `text` ≤ 1000, `photos` ≤ 5 with `publicId` under the household folder; `POST` creates the locks from `locksForReaction`; editing or deleting never releases; deleting removes its photos through the adapter; tests `server/test/reactions.test.js` — server/routes/reactions.js, server/app.js, server/test/reactions.test.js
- [ ] G5: Release locks explicitly — `POST /api/v1/allergens/:id/release` and `POST /api/v1/foods/:id/release` (404 when not locked) recording `releasedBy` = `req.user.username`, `releasedAt`; tests `server/test/locks.test.js` — server/routes/**, server/test/locks.test.js
- [ ] G6: Reach Cloudinary through one adapter that tolerates missing keys — add `cloudinary` to `server/package.json`; `server/lib/cloudinary.js` `createPhotoStore(config.cloudinary)` → `{ configured, sign({ folder }), destroy(publicId) }` (signature over `timestamp`, `folder`, `allowed_formats=jpg,jpeg,png,webp,heic` with `api_sign_request`); `createApp` takes an optional `photoStore` (tests inject a fake); `POST /api/v1/uploads/signature` → `{ cloudName, apiKey, timestamp, signature, folder: 'baby-tasting/<householdId>', allowedFormats }` or 503 `photos_not_configured`; helmet CSP adds `img-src res.cloudinary.com blob: data:` and `connect-src api.cloudinary.com`; `.env.example` comments the three keys as optional; tests `server/test/uploads.test.js` — server/lib/cloudinary.js, server/routes/uploads.js, server/app.js, server/config.js, server/package.json, server/pnpm-lock.yaml, server/.env.example, server/test/uploads.test.js
- [ ] G7: Upload photos from the phone, resized first — `src/app/core/services/photo-upload.service.ts`: resize in a canvas to at most 1600px on the long side (JPEG quality 0.85), get a signature, `POST` the file to `https://api.cloudinary.com/v1_1/<cloud>/image/upload` with the signed fields, return `{ publicId, url }` (secure URL); `deletePending` not needed (the server deletes on reaction delete) — src/app/core/services/photo-upload.service.ts
- [ ] G8: Build the reaction page and the reactions list — `src/app/pages/reactions/reaction-form/` (`/reactions/new`, `/reactions/:id`) and `src/app/pages/reactions/reactions-list/` (`/allergens/reactions`), `src/app/core/services/reactions.service.ts`, models, `HE.reactions.*`; routes — src/app/pages/reactions/**, src/app/core/**, src/app/app.routes.ts
- [ ] G9: Show locks and release them where they appear — calendar `badgeFor` adds 🔒; add-food and drop refusals use the `food_locked` message; `תגובה` action in the item actions sheet; foods page 🔒; allergens page `נעול` chip and `שחרור` with confirm; `locked` alert text and tap target — src/app/pages/calendar/**, src/app/pages/foods/**, src/app/pages/allergens/**, src/app/core/i18n/he.ts
- [ ] G10: Design notes — DESIGN.md: the lock badge, the 101 notice card, photo thumbnails; `## Open design decisions` lines — DESIGN.md
- [ ] G11: Write the UI checks — `e2e/007-1-reaction-lock.spec.ts`, `e2e/007-2-locked-add.spec.ts`, `e2e/007-3-release.spec.ts`, `e2e/007-4-notice-101.spec.ts`, screenshots `e2e/screens/007-<n>.png` — e2e/**
- [ ] G12: Note what now exists, including that photos need the three Cloudinary values — `docs/project/current-state.md` — docs/project/current-state.md

## Technical Considerations
- Dependencies: server `cloudinary` (official SDK, used only for request signing and `destroy`). Approved by this plan.
- New files needed: listed per sub-task.
- Model changes: `Reaction`, `Lock`; `locked` on calendar items; `locked` state and alert kind.
- Backend / API: reactions (5 routes), uploads signature (1), release (2).
- Auth and validation: session required everywhere; the signature is only for the household's own folder; `publicId` values must start with that folder; images only (`allowed_formats` is part of the signature).
- Security surface: Cloudinary secret stays on the server; the browser gets a short-lived signature only; CSP opened only for Cloudinary hosts; photo URLs are rendered as `img src`, never as HTML.
- Data / migration: new collections `reactions`, `locks`.

## Backend Impact
- Collections affected: `calendarItems` (read; `locked` flag computed, not stored), `foods`, `allergens`
- New collections: yes — `reactions` (recorded reactions with photo references), `locks` (active and released locks with who and when)
- Server changes needed: yes — two routers, adapter, lock layer.

## Out of Scope
Diagnosis or advice of any kind, exporting reactions, sharing with a doctor, video, the food detail page's reaction list (plan 008).

## Critical Questions
- none

## Execution Notes
- Planner decision (Human, 2026-11-15): Cloudinary keys are not available tonight; uploads are built behind `server/lib/cloudinary.js` and tested with a fake adapter. The real-upload check is the `[human]` item, done after the Human adds the three values to `server/.env`.
