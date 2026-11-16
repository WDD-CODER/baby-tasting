# Baby Tracker — Server & Data Behaviour Spec (as implemented)

Source of truth: `C:\coding projects\Cursor\baby-tracker` — `server.ts` (968 lines), `server/db.ts` (323 lines), `src/types.ts` (181 lines), plus client call sites in `src/App.tsx` where they determine what the server actually receives. Line refs are `file:line`. Where a plan document says something different from the code, the code behaviour is given and the difference is noted.

---

## 1. Data model (`src/types.ts`)

### 1.1 Enums / unions (all values)

| Type | Values | Ref |
|---|---|---|
| `ParentType` | `'PARENT_A'`, `'PARENT_B'` | types.ts:6 |
| `EventType` | `'NUTRITION'`, `'DIAPER'`, `'SLEEP'`, `'ACTIVITY'`, `'WEIGHT'`, `'PUMPING'`, `'VOMITING'`, `'SUPPLEMENT'` | types.ts:8 |
| `QuickActionId` | `'meal'`, `'diaper'`, `'sleep'`, `'activity'`, `'weight'`, `'vomiting'` | types.ts:16 |
| bottle liquid (inline union, used in 3 places) | `'EXPRESSED_MILK'`, `'FORMULA'` | types.ts:22,33,41 |
| `SpitUpType` | `'NONE'`, `'LIGHT'`, `'HEAVY_VOMIT'` | types.ts:28 |
| `BreastSideType` | `'LEFT'`, `'RIGHT'`, `'BOTH'` | types.ts:29 |
| `FeedType` | `'BREAST'`, `'BOTTLE'` | types.ts:30 |
| `DiaperContentType` | `'PEE'`, `'POO'`, `'BOTH'` | types.ts:49 |
| `PeeVolumeType` | `'LIGHT'`, `'HEAVY_SOAKED'` | types.ts:50 |
| `PooAmountType` | `'SMALL'`, `'MEDIUM'`, `'LARGE_OVERFLOW'` | types.ts:51 |
| `PooColorType` | `'YELLOW_MUSTARD'`, `'GREEN'`, `'BROWN'` | types.ts:52 |
| `PooTextureType` | `'LIQUID'`, `'SEEDY'`, `'PASTY'`, `'HARD'` | types.ts:53 |
| `SleepLocationType` | `'CRIB'`, `'HANDS'`, `'CARRIER'`, `'STROLLER'` | types.ts:63 |
| `VomitingSizeType` | `'SMALL'`, `'MEDIUM'`, `'LARGE'` | types.ts:89 |
| `QualityTier` | `'BAD'`, `'OKAY'`, `'GOOD'`, `'GREAT'` | types.ts:119 |

None of these enums is validated by the server; any string the client sends is stored.

### 1.2 `UserSettings` (one per household) — types.ts:18-26

| Field | Type | Req? | Meaning |
|---|---|---|---|
| `userId` | string | required | Always forced to `'shared-household'` by the server (db.ts:82, 98). |
| `parentAName` | string | required | Display name for PARENT_A. Default `'אמא'`. |
| `parentBName` | string | required | Display name for PARENT_B. Default `'אבא'`. |
| `defaultBottleType` | `'EXPRESSED_MILK' \| 'FORMULA'` | required | Default liquid preselected in bottle forms. Default `'EXPRESSED_MILK'`. |
| `customActivities` | string[] | required | List of activity names offered in the activity form. Default `['שגרת בוקר', 'בייבי יוגה', 'שירים', 'טיול בעגלה', 'עיסוי תינוקות']` (db.ts:18). |
| `babyProfile` | `BabyProfile` | optional | Baby details (see below). Absent until saved from Settings. |
| `quickActionOrder` | `QuickActionId[]` | optional | User-chosen order of quick-action buttons on the log screen. |

Any additional keys sent to `PUT /api/settings` are also stored and returned (no whitelist).

`BabyProfile` (types.ts:10-14): `name: string` (baby name), `dateOfBirth: string` (`YYYY-MM-DD`), `birthWeightGrams: number` (grams). All three required inside the object. Not used anywhere in server code (not in the Excel export, despite the PRD gap plan saying it would be).

### 1.3 `BabyEvent` (one document per logged event) — types.ts:99-115

| Field | Type | Req? | Meaning |
|---|---|---|---|
| `id` | string | required | Server-generated: `'event_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9)` (server.ts:58-60), e.g. `event_1751620000000_k3j9x2a`. The random part is up to 7 base-36 chars (can be shorter). Equals the Firestore doc id. |
| `timestamp` | string (ISO 8601) | required | When the event happened. For SLEEP it is set equal to `sleep.startAt` by the toggle route and by the client for manual sleep entries. Defaults to server "now" on create if missing (server.ts:314-316). All server-generated values come from `Date.prototype.toISOString()` → UTC with `Z` and milliseconds, e.g. `2026-07-04T09:15:00.000Z`. |
| `eventType` | `EventType` | required | Discriminator; selects which payload object is meaningful. Only field the server validates on create. |
| `loggedBy` | `ParentType` | required by type | Parent who created the event. Set by the server only in `/api/sleep/toggle` (from the session). For `POST /api/events` it is whatever the client sends (the client always sends its `activeParent`, App.tsx:472,1573); server does not fill or check it. |
| `deletedAt` | string (ISO) | optional | Soft-delete stamp. Any document with a truthy `deletedAt` is hidden from every read (db.ts:109-111). |
| `notes` | string | optional | Free-text note. |
| `nutrition` | `NutritionPayload` | when NUTRITION | |
| `diaper` | `DiaperPayload` | when DIAPER | |
| `sleep` | `SleepPayload` | when SLEEP | |
| `activity` | `ActivityPayload` | when ACTIVITY | |
| `weight` | `WeightPayload` | when WEIGHT | |
| `pumping` | `PumpingPayload` | when PUMPING | |
| `vomiting` | `VomitingPayload` | when VOMITING | |
| `supplement` | `SupplementPayload` | when SUPPLEMENT | |
| `quickRecorded` | boolean | optional | True when logged via a one-tap quick action (no form). Sleep sessions opened by the toggle always store it explicitly (`false` by default, server.ts:233,265). |

Per-type payloads:

- **`NutritionPayload`** (types.ts:37-47)
  - `feedType: FeedType` — required. `'BREAST'` or `'BOTTLE'`.
  - `breastSide?: BreastSideType` — breast feeds only.
  - `durationMinutes?: number` — breast feed duration in minutes.
  - `bottleLiquidType?: 'EXPRESSED_MILK' | 'FORMULA'` — bottle feeds only.
  - `amountOfferedMl?: number` — ml put in the bottle.
  - `amountConsumedMl?: number` — ml the baby actually drank.
  - `spitUp?: SpitUpType`.
  - `swallowingNoises?: boolean` — audible swallowing observed.
  - `topUp?: TopUpPayload | null` — supplementary bottle after a breast feed. `null` is a stored value meaning "explicitly cleared" (the client edit sends `null`, App.tsx:1691-1695).
  - `TopUpPayload` (types.ts:32-35): `liquidType: 'EXPRESSED_MILK' | 'FORMULA'`, `consumedMl: number` (both required).
- **`DiaperPayload`** (types.ts:55-61): `contains: DiaperContentType` (required); `peeVolume?`, `pooAmount?`, `pooColor?`, `pooTexture?`. The client sends pee fields only when contains≠POO and poo fields only when contains≠PEE.
- **`SleepPayload`** (types.ts:65-72)
  - `startAt: string` — ISO, required.
  - `endAt: string | null` — ISO, or `null` while the baby is still asleep. **Only `endAt === null` (strictly) marks an open session** (db.ts:265). A missing `endAt` is not "open".
  - `startLocation?: SleepLocationType`.
  - `durationMinutes?: number` — derived by the server when closed (see §3 rules). Absent while open.
  - `loggedByStart?: ParentType` — parent who started the session (set by toggle only).
  - `loggedByEnd?: ParentType` — parent who ended it (set by toggle close only).
- **`ActivityPayload`** (types.ts:74-77): `activityName: string` (from `customActivities`), `cryingIntensity?: number` (1–10).
- **`WeightPayload`** (types.ts:79-82): `weightGrams: number` (required), `percentile?: number`.
- **`PumpingPayload`** (types.ts:84-87): `leftAmountMl: number`, `rightAmountMl: number` (both required).
- **`VomitingPayload`** (types.ts:91-93): `size: VomitingSizeType`.
- **`SupplementPayload`** (types.ts:95-97): `name: string`. The only producer today is the Bio Gaya pill, which posts `{ name: 'ביו גאיה' }` (App.tsx:469-474).

### 1.4 Quality-tier helpers in `types.ts` (client-side only, not used by the server)

- `TIER_MAP` (types.ts:121-126): BAD → `var(--color-tier-bad)`, `'דורש תשומת לב'`; OKAY → `var(--color-tier-okay)`, `'סביר'`; GOOD → `var(--color-tier-good)`, `'טוב'`; GREAT → `var(--color-tier-great)`, `'מצוין'`.
- `classifyNutrition` (128-145): BREAST: minutes = `durationMinutes ?? 0`; `<5` BAD, `<=15` GOOD, else GREAT. BOTTLE: if offered ≤ 0 → OKAY; pct = consumed/offered×100; `<50` BAD, `<80` OKAY, `<100` GOOD, else GREAT.
- `classifySleep(durationMinutes)` (147-151): `<30` BAD, `<=45` GOOD, else GREAT.
- `classifyDiaper` (153-174): `pooTexture==='HARD'` or `pooAmount==='LARGE_OVERFLOW'` → BAD; else has pee & `peeVolume==='LIGHT'` → OKAY; has pee & `HEAVY_SOAKED` → GOOD; has poo → GOOD; else OKAY.
- `classifyWeight(current, previous)` (176-181): previous null → OKAY; less → BAD; more → GOOD; equal → OKAY.

---

## 2. Firestore layout (for the migration script)

- **Project:** `gen-lang-client-0711484359` (`.firebaserc`).
- **Database:** named database, id from env `FIRESTORE_DATABASE_ID`; value in `.env.example` and `firebase.json`: `ai-studio-babytracker-8dc56127-6e5c-4f0c-8534-b1f528c48c4f`. If the env var is unset the `(default)` database is used (db.ts:45-46).
- **Access:** Admin SDK only (`firebase-admin`), service account from `FIREBASE_ADMIN_CREDENTIALS_JSON` (base64 of the JSON key) or `FIREBASE_ADMIN_CREDENTIALS_PATH` (path to the JSON file, resolved from cwd) (db.ts:21-39). `firestore.rules` denies all client reads/writes.
- `getFirestore(app, databaseId)` is called with no settings, so `ignoreUndefinedProperties` is off (SDK default): writing an object containing an `undefined` value throws.

### 2.1 Paths

| Path | Content |
|---|---|
| `households/shared-household` (doc) | The `UserSettings` object, fields stored at top level of the document (no sub-object). Household id is the constant `'shared-household'` (db.ts:58). |
| `households/shared-household/events/{eventId}` (subcollection) | One `BabyEvent` per doc. **Doc id === `event.id` field** (db.ts:280). |

There are no other collections. Sessions are not stored in Firestore (in-memory, see §6).

### 2.2 How documents are written

- **Settings doc:** created with `set(DEFAULT_SETTINGS)` the first time anything reads settings and the doc is missing (db.ts:73-76). Updated with `set(merged, { merge: true })` (db.ts:100) where `merged = { ...currentSettings, ...body, userId: 'shared-household' }`. Because of `merge: true`, nested maps (e.g. `babyProfile`) are merged key-by-key in Firestore — a key removed client-side stays in the stored doc; arrays (`customActivities`, `quickActionOrder`) are replaced whole.
- **Event docs:** always written with full `doc(id).set(event)` (no merge) — the stored document is exactly the JSON object, field names exactly as in §1.3 (camelCase, nested maps `nutrition`, `sleep`, etc.).
- **Soft delete:** `doc(id).update({ deletedAt: new Date().toISOString() })` — only adds that field (db.ts:297).
- **Clear:** hard `doc(id).delete()` (db.ts:313). Cleared events are gone permanently.

### 2.3 Value formats

- All times (`timestamp`, `sleep.startAt`, `sleep.endAt`, `deletedAt`) are **strings**, not Firestore `Timestamp` values. Server-generated ones are `toISOString()` UTC (`...Z`, ms). Client-sent ones are also produced with `toISOString()` (App.tsx:1569, 1626-1627, 1729-1732), but the server stores any string verbatim.
- Ordering/paging relies on **lexicographic string order** of `timestamp` (Firestore `orderBy('timestamp','desc')`). This is chronological only while all values share the same ISO format.
- `null` is a stored value in `sleep.endAt` (open session) and `nutrition.topUp` (cleared top-up).
- Numbers are plain Firestore numbers. If a duration was computed from an unparsable date, `Math.max(1, NaN)` yields `NaN`, which would be stored as a NaN double.
- Booleans: `quickRecorded`, `nutrition.swallowingNoises`.

### 2.4 What a migration must expect

- Documents may carry **any extra fields** the client sent (POST/PUT bodies are stored without a whitelist, server.ts:306, 352-359), including a client-supplied `deletedAt`.
- Soft-deleted documents (with `deletedAt`) still exist and are invisible to the app — copy them to lose nothing, and keep `deletedAt`.
- Older SLEEP docs may lack `loggedByStart`/`loggedByEnd`; edited SLEEP docs lose them (see PUT rule in §3.9). Open sessions have `endAt: null` and no `durationMinutes`.
- Events of type ACTIVITY/SUPPLEMENT etc. may have payload objects missing if the client omitted them; every reader guards with `e.eventType === X && e.<payload>`.
- `firebase-blueprint.json` is an outdated schema (only 5 event types); `src/types.ts` is authoritative.
- Typed paging uses a composite index (`eventType ==` + `timestamp desc`); no `firestore.indexes.json` exists in the repo (`firebase.json` only lists rules). Code has an in-memory fallback if the index is missing (db.ts:211-241).

---

## 3. API routes (16)

Global middleware order (server.ts:34-55, 175-181): `trust proxy` (production only) → `compression()` → `express.json()` (default 100 kb limit) → `express-session` → `/api/login`, `/api/logout` → **auth gate** on `/api` → all other routes.

Auth gate (server.ts:175-181): any request under `/api` without `req.session.parentType` → `401 { "error": "Unauthorized" }`. All errors in this API use the shape `{ "error": "<message>" }`.

Common catch: each route wraps its body in try/catch and returns `500 { error: '<route-specific message>' }`; messages are listed per route.

### 3.1 `POST /api/login` (public) — server.ts:124-162

- Input JSON: `{ username: string, password: string }`.
- Missing/empty username or password (or no body) → `401 { error: 'Invalid credentials' }`.
- If `username === PARENT_A_USERNAME` → bcrypt-compare against `PARENT_A_PASSWORD_HASH`; on match → `PARENT_A`. **Else if** `username === PARENT_B_USERNAME` → compare against `PARENT_B_PASSWORD_HASH` → `PARENT_B`. (If both usernames are equal, only A is ever tried.) Hash env var missing → no match.
- No match → `401 { error: 'Invalid credentials' }`. No rate limiting or lockout.
- Success: sets `req.session.parentType` (session id is not regenerated), reads settings, responds `200 { parentType, parentName }` where `parentName` is `settings.parentAName` or `parentBName`.
- Error → `500 { error: 'Failed to login' }`.

### 3.2 `POST /api/logout` (public) — server.ts:164-173

- No input. `req.session.destroy()`, then `res.clearCookie('connect.sid')`, `200 { success: true }`. Works with no session too (registered before the gate on purpose — bugfix-audit BUG fix).
- Destroy error → `500 { error: 'Failed to logout' }`.

### 3.3 `GET /api/settings` — server.ts:187-201

- Output `200`: all settings fields (§1.2, defaults filled in) plus `currentParent: { parentType, parentName }` for the logged-in session.
- Settings read = `{ ...DEFAULT_SETTINGS, ...storedDoc, userId: 'shared-household' }` (db.ts:79-83) — missing stored keys fall back to defaults; extra stored keys pass through.
- If the Firestore read fails, `getSettings` logs and **returns `DEFAULT_SETTINGS` silently** (db.ts:86-89) — this route then returns defaults with 200.
- Error → `500 { error: 'Failed to fetch settings' }`.

### 3.4 `PUT /api/settings` — server.ts:203-211

- Input: any partial `UserSettings` JSON. No validation.
- Rule: `merged = { ...getSettings(), ...body, userId: 'shared-household' }`; stored with `set(merged, {merge:true})`; cache updated.
- Output `200`: the merged settings object (**without** `currentParent`).
- Note: because the base is `getSettings()`, a failed read (which returns defaults) would cause defaults to be written for keys not in the body.
- Error → `500 { error: 'Failed to update settings' }`.

### 3.5 `GET /api/sleep/open` — server.ts:217-224

- Output `200`: the open SLEEP event (full `BabyEvent`) or JSON `null`.
- "Open" = `eventType == 'SLEEP'` (Firestore query), not soft-deleted, has `sleep`, and `sleep.endAt === null` (db.ts:258-274). If several are open, the **last one in snapshot order** is returned (default order = doc id ascending; ids embed `Date.now()`, so normally the most recently created).
- A Firestore error is swallowed → `null` (db.ts:270-273).
- Error → `500 { error: 'Failed to check open sleep session' }`.

### 3.6 `POST /api/sleep/toggle` — server.ts:226-280

Input JSON (all optional):
- `startLocation` (or legacy alias `location`) — `SleepLocationType`; `req.body.startLocation || req.body.location || undefined`.
- `customStartAt` — any date string parseable by `new Date()`; used only when opening.
- `quickRecorded` — boolean; `|| false`.
- (`activeParent` in the body is **ignored**. The wave-1 plan said to read it from the body; the code uses the session parent `req.session.parentType` for `loggedBy`, `loggedByStart`, `loggedByEnd`.)

Rules:
1. Look up the open session (§3.5).
2. **If one is open → close it:**
   - `endAt = now` (server time, ISO). There is no way to pass a custom end time here.
   - `durationMinutes = max(1, round((now - startAt) / 60000))` (server.ts:243).
   - `loggedByEnd = session parent`.
   - If `quickRecorded` is truthy, set `quickRecorded = true` on the event; otherwise the stored value is left unchanged.
   - `startLocation`/`customStartAt` are ignored.
   - Full document re-written; respond `200` with the updated event (has `sleep.endAt` set — the client uses this to know it was a close).
   - If the open event somehow has no `sleep` → `400 { error: 'Invalid sleep data structure' }` (unreachable in practice since the lookup requires `sleep`).
3. **If none is open → open a new one:**
   - `startAt = customStartAt ? new Date(customStartAt).toISOString() : now`. An unparsable `customStartAt` throws → 500.
   - New event: `{ id: generateId(), timestamp: startAt, eventType: 'SLEEP', loggedBy: parent, quickRecorded, sleep: { startAt, endAt: null, [startLocation if defined], loggedByStart: parent } }` (server.ts:260-272). `startLocation` key is omitted (not `undefined`) when absent; no `durationMinutes`.
   - Respond `200` with the new event.
- A future `customStartAt` is accepted; closing it later yields duration 1 (because of `max(1, …)`).
- Error → `500 { error: 'Failed to toggle sleep state' }`.

### 3.7 `GET /api/events` — server.ts:286-302, db.ts:187-242

Query params:
- `limit` — `parseInt(limit) || 20` (so missing, `0` or non-numeric → 20). No maximum. The client always uses `?limit=400` (App.tsx:1390).
- `cursor` — the `timestamp` string of the last event of the previous page.
- `type` — an `EventType` string to filter by.

Algorithm (primary path):
- `fetchLimit = limit + 5 + 1` (`DELETED_ROW_BUFFER = 5`, db.ts:160,192).
- Query `events` ordered by `timestamp desc`, `where eventType == type` if given, `startAfter(cursor)` if given, `limit(fetchLimit)`.
- Drop soft-deleted docs; `events = active.slice(0, limit)`.
- `hasMore = active.length > limit || snapshot.size >= fetchLimit`; `nextCursor = hasMore && events.length > 0 ? events[last].timestamp : null` (db.ts:175-185).
- Consequences: a page can hold fewer than `limit` events while `nextCursor` is non-null (more than 5 deleted docs in the window); events sharing the exact boundary `timestamp` string can be skipped by `startAfter`.

Fallback path (on query error, e.g. missing composite index for `type`): fetch all (or all of `type`), drop deleted, sort by `new Date(timestamp)` desc, if `cursor` keep only events strictly older than `new Date(cursor)`, then same slicing with `fetchedCount = active.length`. If the fallback also fails → `{ events: [], nextCursor: null }` with 200.

Output `200`: `{ events: BabyEvent[], nextCursor: string | null }`. Events newest first.
Error → `500 { error: 'Failed to fetch events' }`.

### 3.8 `POST /api/events` — server.ts:304-340

- Input: a `BabyEvent`-shaped JSON. Stored verbatim apart from the changes below.
- Validation: only `eventType` must be truthy → else `400 { error: 'eventType is required' }`. No other field, enum or payload check.
- `id` is always replaced by `generateId()` (a client id is ignored).
- `timestamp` defaults to server now if falsy.
- **Single-open-session rule** (server.ts:318-326): if `eventType === 'SLEEP'` and `sleep.endAt === null` (strict), any currently open session is closed first: its `endAt = newEvent.timestamp` (the new event's `timestamp`, not its `sleep.startAt`), `durationMinutes = max(1, round((newEvent.timestamp − open.startAt)/60000))`. `loggedByEnd` is **not** set in this path. Then the new open session is saved.
- **Duration rule** (server.ts:329-333): if SLEEP and both `sleep.startAt` and `sleep.endAt` are truthy → `sleep.durationMinutes = max(1, round((endAt − startAt)/60000))` (overwrites any client value).
- The server does not set `loggedBy`, `loggedByStart` or `quickRecorded`; it stores what the client sent. The client's manual sleep form always sends an `endAt` (defaults to now, App.tsx:1627), so manual entries are closed sessions.
- Output `200`: the saved event (with the server `id`; the client uses it for the "undo" delete).
- Error → `500 { error: 'Failed to create event' }`.

### 3.9 `PUT /api/events/:id` — server.ts:342-377

- Loads the event; not found **or soft-deleted** (db.ts:251) **or Firestore read error** (db.ts:252-255) → `404 { error: 'Event not found' }`.
- Merge is **shallow**: `{ ...existing, ...body, id }` (server.ts:355-359).
  - A top-level key absent from the body keeps its old value. JSON cannot carry `undefined`, so e.g. clearing `notes` on the client (`notes: undefined`) does **not** remove the stored note.
  - A payload object present in the body replaces the stored one **entirely**. The client's sleep edit sends only `{ startAt, endAt, startLocation }` (App.tsx:1735-1739), so `loggedByStart`/`loggedByEnd` are dropped on every sleep edit.
  - `eventType`, `loggedBy`, `deletedAt`, etc. can all be overwritten by the body; `id` cannot.
- Duration rule (server.ts:362-370): if merged is SLEEP with `sleep`: both `startAt` and `endAt` truthy → `durationMinutes = max(1, round((endAt − startAt)/60000))`; otherwise `durationMinutes = undefined`. Because `ignoreUndefinedProperties` is off (§2), saving an object with `sleep.durationMinutes: undefined` makes Firestore `set()` throw, so a PUT on a SLEEP event whose `endAt` is null/absent returns 500.
- No single-open-session enforcement on PUT.
- Output `200`: the merged event.
- Error → `500 { error: 'Failed to update event' }`.

### 3.10 `DELETE /api/events/:id` — server.ts:379-391, db.ts:289-304

- **Soft delete**: stamps `deletedAt = now ISO` via `update()`. Does not check whether it is already deleted (re-deleting re-stamps and returns success).
- Doc does not exist → `404 { error: 'Event not found' }`. A Firestore error also returns `false` → **404** (not 500).
- Output `200 { success: true, deletedId: id }`.
- Error → `500 { error: 'Failed to delete event' }`.

### 3.11 `POST /api/events/clear` — server.ts:393-410, db.ts:306-323

- Input JSON: `{ before?: string }` (ISO date-time).
- Reads **every** doc in `events` (including soft-deleted ones) and **hard-deletes**:
  - all docs if `before` is falsy (missing or `''`);
  - otherwise docs where `new Date(doc.timestamp) <= new Date(before)` (inclusive). Docs with an unparsable/missing `timestamp`, or an unparsable `before`, compare false and are kept (an invalid `before` deletes nothing and still reports success).
- Deletes run in parallel (`Promise.all`), not in a transaction or batch; a failure leaves a partial result and returns `false`.
- Settings doc is never touched.
- The client sends `before = new Date('<YYYY-MM-DD>T00:00:00').toISOString()`, i.e. midnight in the **browser's** timezone of the chosen date (App.tsx:1443-1448). The "clear all" UI requires typing `מחק הכל` (bugfix-audit Milestone 7, Option B — hard delete kept).
- Output `200 { success: true, message }` with `message` = `` `Logged events before ${before} cleared successfully` `` or `'All logged events cleared successfully'`.
- `clearAllEvents` returned false → `500 { error: 'Failed to clear some events' }`; thrown error → `500 { error: 'Failed to clear events' }`.

### 3.12–3.15 Stats routes — see §4. 3.16 Export — see §5.

### Route list (16)

| # | Method | Path | Auth |
|---|---|---|---|
| 1 | POST | `/api/login` | public |
| 2 | POST | `/api/logout` | public |
| 3 | GET | `/api/settings` | session |
| 4 | PUT | `/api/settings` | session |
| 5 | GET | `/api/sleep/open` | session |
| 6 | POST | `/api/sleep/toggle` | session |
| 7 | GET | `/api/events` | session |
| 8 | POST | `/api/events` | session |
| 9 | PUT | `/api/events/:id` | session |
| 10 | DELETE | `/api/events/:id` | session |
| 11 | POST | `/api/events/clear` | session |
| 12 | GET | `/api/stats/nutrition` | session |
| 13 | GET | `/api/stats/sleep` | session |
| 14 | GET | `/api/stats/diapers` | session |
| 15 | GET | `/api/stats/weight` | session |
| 16 | GET | `/api/export/xlsx` | session |

---

## 4. Stats endpoints

### 4.1 Shared rules

- **Data source:** `getAllEvents()` — the entire `events` collection ordered by `timestamp desc`, soft-deleted removed (db.ts:124-158). Cached in process memory for 5 s (`EVENTS_TTL_MS = 5000`, db.ts:117); every write in this process (`saveEvent`, `deleteEvent`, `clearAllEvents`) clears the cache. On query error it retries unordered and sorts in memory; if that also fails it returns `[]` (stats then return `[]` with 200).
- **Timezone:** all day bucketing is in **`Asia/Jerusalem`**: `toIsraelLocalDateStr(iso)` = `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year:'numeric', month:'2-digit', day:'2-digit' })` → `YYYY-MM-DD` (server.ts:63-79). Calendar days run 00:00–24:00 Israel time (the client's 06:00 "baby day" concept is not used on the server).
- **Range params:** `from`, `to` as `YYYY-MM-DD`.
  - `from` present → `parseIsraelDate(from)` = `new Date(`${from}T00:00:00${offset}`)`; absent → `now − 30 days` (exact instant, not midnight).
  - `to` present → `parseIsraelDate(to, true)` = `${to}T23:59:59.999${offset}`; absent → `now`.
  - `offset` = Israel UTC offset (`+02:00`/`+03:00`) evaluated at **12:00 UTC of that date** (server.ts:99-118) — so on a DST-switch day the computed midnight can be off by one hour.
  - Comparison is inclusive on both ends (`>= from && <= to`).
  - A `from`/`to` that is not a plain `YYYY-MM-DD` (e.g. a full ISO string) produces an invalid date inside `getIsraelUtcOffset` → `formatToParts` throws `RangeError` → **500**. The current client calls the stats routes with `from=<full ISO string>` (App.tsx:1424-1431), so in practice these four calls return 500 and the client ignores them (`if (res.ok)`); the dashboards compute from `/api/events` data client-side.
- Days with no matching events are **not** included (except in the export summary). Output day arrays are sorted by date ascending (string sort).

### 4.2 `GET /api/stats/nutrition` — server.ts:416-464

- Events: `eventType === 'NUTRITION'` with `nutrition`; filtered and bucketed by `timestamp`.
- Per day: `feedsCount++` for every feed. If `feedType === 'BOTTLE'`: `bottleCount++`, `offered += amountOfferedMl || 0`, `consumed += amountConsumedMl || 0`. Any other `feedType` (incl. missing) → `breastCount++`. Top-up bottles (`topUp`) are not counted.
- Output: `[{ date, offered, consumed, delta, feedsCount, breastCount, bottleCount }]`, `delta = max(0, offered − consumed)`. Units ml; no rounding (sums of stored numbers).
- Error → `500 { error: 'Failed to generate nutrition stats' }`.

### 4.3 `GET /api/stats/sleep` — server.ts:466-517

- Events: `eventType === 'SLEEP'` with `sleep`; filtered and bucketed by **`sleep.startAt`** (not `timestamp`). A session crossing midnight counts entirely on its start day.
- Duration per session: `durationMinutes || 0`; if `endAt === null` (open) → `round((now − startAt)/60000)` (no `max(1,…)` floor).
- Per day: `totalMinutes += duration`, `sessionCount++`, push `{ id, startAt, endAt, durationMinutes: duration, location: sleep.startLocation, loggedBy: event.loggedBy }` (`location` key omitted in JSON when undefined).
- Output: `[{ date, totalMinutes, sessionCount, sessions: [...] }]`, sessions sorted by `startAt` ascending. Units minutes.
- Error → `500 { error: 'Failed to generate sleep stats' }`.

### 4.4 `GET /api/stats/diapers` — server.ts:519-564

- Events: `eventType === 'DIAPER'` with `diaper`; filtered/bucketed by `timestamp`.
- Per day: `total++`; exactly one of `pee++` (`contains==='PEE'`), `poo++` (`'POO'`), `both++` (`'BOTH'`) — exclusive counters (a BOTH diaper is not counted in pee or poo). Collect `pooColor` and `pooTexture` when truthy.
- Output: `[{ date, pee, poo, both, total, pooColors: string[], pooTextures: string[] }]`; colour/texture arrays are de-duplicated (`new Set`), first-seen order (events iterate newest first).
- Error → `500 { error: 'Failed to generate diaper stats' }`.

### 4.5 `GET /api/stats/weight` — server.ts:566-592

- Events: `eventType === 'WEIGHT'` with `weight`, filtered by `timestamp`. Not grouped by day — one row per weigh-in.
- Output: `[{ id, timestamp, date, weightGrams, percentile }]` sorted by `timestamp` ascending; `date` = Israel date of `timestamp`; `percentile` omitted when undefined. Units grams.
- Error → `500 { error: 'Failed to generate weight stats' }`.

---

## 5. Excel export — `GET /api/export/xlsx` (server.ts:598-931)

### 5.1 Range, data, response

- `from` / `to` as in §4.1, but the default `from` is **now − 14 days** (instant); default `to` = now. The client opens `/api/export/xlsx?from=YYYY-MM-DD&to=YYYY-MM-DD` in a new tab (App.tsx:1873).
- Events: `getAllEvents()` filtered by **`timestamp`** in `[from, to]` for every sheet (including Sleep). Row order within each detail sheet = `getAllEvents` order = `timestamp` **descending**.
- Settings read once for parent names.
- Library: ExcelJS. `workbook.creator = 'Baby Tracker PWA'`, `workbook.created = new Date()`.
- Headers: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`; `Content-Disposition: attachment; filename=baby_tracker_report_<YYYY-MM-DD>.xlsx` (Israel date of the moment of export; filename unquoted). Body streamed with `workbook.xlsx.write(res)`.
- Error → logs `'Failed to export Excel report:'` and `500 { error: 'Failed to generate Excel report' }`.

### 5.2 Formatting applied to all 7 sheets (server.ts:614-644, 915-919)

- Every sheet: `views: [{ rightToLeft: true }]`.
- Header row (row 1): height 25; font Arial 11 bold, colour `FFFFFFFF`; solid fill `FF1F5F5B`; alignment vertical middle, horizontal center.
- Data rows (row > 1): every cell (ExcelJS `eachCell`, which skips empty cells) gets thin borders on all four sides, colour `FFD9D9D9`, and alignment middle/center.
- No frozen panes, auto-filter or number formats except where noted.

"Logged By" mapping used on every detail sheet: `loggedBy === 'PARENT_A' ? (settings.parentAName || 'אמא') : (settings.parentBName || 'אבא')` — anything other than PARENT_A (incl. missing) shows parent B's name. "Notes" = `notes || ''`.

### 5.3 Sheet 1 — `Summary - סיכום יומי` (server.ts:649-735)

Columns (header text / key / width):

| Header | key | width |
|---|---|---|
| `תאריך / Date` | date | 15 |
| `הוצע מ״ל / Offered (ml)` | offered | 22 |
| `נצרך מ״ל / Consumed (ml)` | consumed | 22 |
| `הפרש מ״ל / Delta (ml)` | delta | 18 |
| `אחוז צריכה / Consumed %` | consumedPct | 22 |
| `מספר האכלות / Feeds Count` | feeds | 22 |
| `סה״כ שינה / Total Sleep` | sleep | 24 |
| `חיתולי שתן / Pee Diapers` | pee | 22 |
| `חיתולי צואה / Poo Diapers` | poo | 22 |
| `משקל אחרון (גרם) / Latest Weight` | weight | 26 |

Day list: starts at `from`, adds 1 day with `Date.setDate(+1)` (server-process local time) while `<= to`; each step's key is its Israel date. So every date in the range gets a row, even with no events (with default range: 15 rows). Events whose Israel date (of `timestamp`) is not a key are skipped.

Per day aggregation (by `timestamp` date):
- NUTRITION: `feeds++` (breast and bottle); BOTTLE only: `offered += amountOfferedMl || 0`, `consumed += amountConsumedMl || 0`.
- SLEEP: `sleepMin += durationMinutes || 0` (open sessions add 0).
- DIAPER: `PEE` or `BOTH` → `pee++`; `POO` or `BOTH` → `poo++` (BOTH counts in both columns).
- WEIGHT: `weight = weightGrams` — overwritten by each weight event of the day in iteration order (newest first), so the value kept is the **earliest** weigh-in of that day despite the "Latest Weight" header.
- ACTIVITY, PUMPING, VOMITING, SUPPLEMENT are not summarised.

Rows sorted by date **descending**. Cell values:
- `date`: `YYYY-MM-DD` string.
- `offered`, `consumed`, `feeds`, `pee`, `poo`, `weight`: number, or `''` when 0.
- `delta`: `max(0, offered − consumed)` when `offered > 0` (0 shows as 0), else `''`.
- `consumedPct`: `round(consumed / offered × 100)` + `'%'` as a **string** when `offered > 0`, else `''` (BUG-X2 fix: breast-only days are blank, not 100%).
- `sleep`: string `` `${floor(min/60)}ש ${min%60}ד` `` (e.g. `3ש 25ד`) when > 0, else the string `'0'`.
- Conditional format: when the percentage exists and is `< 75`, that cell gets solid fill `FFFFC7CE` and font colour `FF9C0006` bold. (Applied before the global data-row styling; the later border/alignment pass does not reset fill or font.)

### 5.4 Sheet 2 — `Feeds - האכלות` (NUTRITION events)

| Header | key | width | Value |
|---|---|---|---|
| `תאריך / Date` | date | 15 | Israel date of `timestamp` |
| `שעה / Time` | time | 12 | Israel time `HH:MM` 24h (`Intl.DateTimeFormat('he-IL', {timeZone:'Asia/Jerusalem', hour:'2-digit', minute:'2-digit', hour12:false})`, server.ts:82-97) |
| `סוג האכלה / Type` | type | 18 | BOTTLE + EXPRESSED_MILK → `חלב שאוב`; BOTTLE + anything else → `תמ״ל (פורמולה)`; not BOTTLE → `הנקה` |
| `כמות שהוצעה (מ״ל) / Offered` | offered | 22 | `amountOfferedMl || ''` |
| `כמות שנצרכה (מ״ל) / Consumed` | consumed | 22 | `amountConsumedMl || ''` |
| `החזרה / Spit Up` | spitUp | 18 | LIGHT → `פליטה קלה`; HEAVY_VOMIT → `הקאה`; else (NONE/missing) → `אין` |
| `צד הנקה / Breast Side` | breastSide | 18 | LEFT → `שמאל`; RIGHT → `ימין`; BOTH → `שני הצדדים`; else `''` |
| `משך (דקות) / Duration (m)` | duration | 18 | `durationMinutes || ''` |
| `נרשם על ידי / Logged By` | loggedBy | 18 | parent name |
| `הערה / Notes` | notes | 30 | notes |

`topUp` and `swallowingNoises` are not exported.

### 5.5 Sheet 3 — `Sleep - שינה` (SLEEP events, selected by `timestamp`)

| Header | key | width | Value |
|---|---|---|---|
| `תאריך / Date` | date | 15 | Israel date of `sleep.startAt` |
| `שעת תחילת שינה / Start Time` | start | 20 | Israel `HH:MM` of `startAt` |
| `שעת סיום שינה / End Time` | end | 20 | Israel `HH:MM` of `endAt`, or `ישן כעת` when `endAt` is falsy |
| `משך (דקות) / Duration (m)` | duration | 18 | `durationMinutes || ''` |
| `משך (שעות) / Duration (h)` | durationHours | 18 | if `durationMinutes` truthy: number `parseFloat((min/60).toFixed(1))` with `numFmt '0.0'`; else if `endAt === null`: `ישן כעת`; else `''` (BUG-X3 fix) |
| `מיקום שינה / Location` | location | 18 | CRIB → `מיטה / עריסה`; HANDS → `על הידיים`; CARRIER → `מנשא`; any other non-empty value (STROLLER) → `עגלה`; missing → `''` |
| `נרשם על ידי / Logged By` | loggedBy | 18 | parent name from `event.loggedBy` (not `loggedByStart/End`) |
| `הערה / Notes` | notes | 30 | notes |

### 5.6 Sheet 4 — `Diapers - חיתולים`

| Header | key | width | Value |
|---|---|---|---|
| `תאריך / Date` | date | 15 | Israel date |
| `שעה / Time` | time | 12 | Israel `HH:MM` |
| `תכולה / Contains` | contains | 18 | PEE → `שתן`; POO → `צואה`; else → `שתן + צואה` |
| `רטיבות שתן / Pee Volume` | pee | 18 | LIGHT → `קל`; HEAVY_SOAKED → `רטוב כבד`; else `''` |
| `כמות צואה / Poo Amount` | pooAmount | 18 | SMALL → `קטן`; MEDIUM → `בינוני`; LARGE_OVERFLOW → `גדול מאוד / גלישה`; else `''` |
| `צבע צואה / Poo Color` | pooColor | 20 | YELLOW_MUSTARD → `צהוב חרדל`; GREEN → `ירוק`; BROWN → `חום`; else `''` |
| `מרקם צואה / Poo Texture` | pooTexture | 18 | LIQUID → `נוזלי`; SEEDY → `גרגרי`; PASTY → `משחתי`; HARD → `קשה`; else `''` |
| `נרשם על ידי / Logged By` | loggedBy | 18 | parent name |
| `הערה / Notes` | notes | 30 | notes |

### 5.7 Sheet 5 — `Weight - משקל`

| Header | key | width | Value |
|---|---|---|---|
| `תאריך / Date` | date | 15 | Israel date |
| `שעה / Time` | time | 12 | Israel `HH:MM` |
| `משקל (גרם) / Weight (g)` | weight | 22 | `weightGrams` (number) |
| `משקל (ק״ג) / Weight (kg)` | weightKg | 22 | `(weightGrams/1000).toFixed(3)` — a **string**, e.g. `"3.450"` |
| `אחוזון / Percentile` | percentile | 18 | `percentile || ''` |
| `נרשם על ידי / Logged By` | loggedBy | 18 | parent name |
| `הערה / Notes` | notes | 30 | notes |

### 5.8 Sheet 6 — `Pumping - שאיבות`

| Header | key | width | Value |
|---|---|---|---|
| `תאריך / Date` | date | 15 | Israel date |
| `שעה / Time` | time | 12 | Israel `HH:MM` |
| `שמאל (מ״ל) / Left (ml)` | left | 20 | `leftAmountMl` |
| `ימין (מ״ל) / Right (ml)` | right | 20 | `rightAmountMl` |
| `סה״ך (מ״ל) / Total (ml)` | total | 20 | `left + right` (number; header text has `סה״ך` exactly as written) |
| `נרשם על ידי / Logged By` | loggedBy | 18 | parent name |
| `הערה / Notes` | notes | 30 | notes |

### 5.9 Sheet 7 — `Vomiting - פליטות`

| Header | key | width | Value |
|---|---|---|---|
| `תאריך / Date` | date | 15 | Israel date |
| `שעה / Time` | time | 12 | Israel `HH:MM` |
| `גודל פליטה / Spit Up Size` | size | 22 | SMALL → `קטנה`; MEDIUM → `בינונית`; else → `גדולה` |
| `נרשם על ידי / Logged By` | loggedBy | 18 | parent name |
| `הערה / Notes` | notes | 30 | notes |

ACTIVITY and SUPPLEMENT events have no sheet. `babyProfile` is not written anywhere in the workbook.

---

## 6. Auth

- **Users:** exactly two fixed accounts from env: `PARENT_A_USERNAME` + `PARENT_A_PASSWORD_HASH` → `PARENT_A`; `PARENT_B_USERNAME` + `PARENT_B_PASSWORD_HASH` → `PARENT_B`. Hashes are bcrypt (`bcryptjs.compare`); `.env.example` uses usernames `ama` / `aba` and generates hashes with cost 10. No users in the database, no sign-up, no password change.
- **Flow:** `POST /api/login` → session cookie; `GET /api/settings` returns `currentParent` so the client restores who is logged in on reload; `POST /api/logout` destroys the session. Any 401 makes the client show the login screen.
- **Session:** `express-session` with `secret = SESSION_SECRET` (server refuses to start without it, server.ts:26-28), `resave: false`, `saveUninitialized: false`, cookie `{ httpOnly: true, secure: NODE_ENV === 'production', maxAge: 30 days }` (server.ts:44-55). Cookie name is the default `connect.sid`. No `sameSite` set. Not rolling: expiry is 30 days from login. **No store configured → default in-memory `MemoryStore`**: all sessions are lost on every server restart/redeploy, and sessions are not shared between instances.
- Session data: only `parentType: ParentType`.
- **Protected:** every `/api/*` path except `/api/login` and `/api/logout` (including unknown `/api/...` paths, which return 401 when logged out). Static files and the SPA shell are public.
- When logged in, an unknown `GET /api/...` path is not 404: in production it falls through to the `*` handler and returns `index.html`; other methods get Express's default 404.
- `trust proxy = 1` in production so the `secure` cookie works behind Render's TLS proxy (server.ts:34-36).
- Who is acting is always taken from the session for sleep toggles; for `POST`/`PUT /api/events` the stored `loggedBy` is whatever the client sends.

---

## 7. Other server behaviour

### 7.1 Startup and hosting (server.ts:938-968)

- Port: `parseInt(PORT || '3000')`, bound on `0.0.0.0`; logs `Server running on http://localhost:<PORT>`.
- `NODE_ENV !== 'production'`: Vite dev server in middleware mode (`appType: 'spa'`) serves the frontend with HMR (HMR/watch disabled when `DISABLE_HMR === 'true'`, vite.config.ts:91-93).
- Production: `express.static(<cwd>/dist)` with headers: files ending in `index.html` → `Cache-Control: no-cache`; **every other file** (hashed assets, and also `sw.js`, `manifest.webmanifest`, PWA icons) → `Cache-Control: public, max-age=31536000, immutable`. Then `app.get('*')` → `sendFile(dist/index.html)` for client-side routes (this fallback uses Express's default caching headers, not `no-cache`).
- `vite` is imported at the top of `server.ts` even in production (it is a runtime dependency).
- Build: `vite build` (frontend to `dist/`) + `esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs`; start: `node dist/server.cjs`. Render build command `npm install --include=dev && npm run build`, start `npm start` (plans/deploy-render-free-v1.md:140-141).

### 7.2 Compression and body parsing

- `compression()` (gzip/deflate) on all responses, before routes and static (server.ts:40).
- `express.json()` default options (100 kb limit, `application/json` only).

### 7.3 Caching inside the server (db.ts)

- Events list cache: 5 s TTL, process memory, cleared on any write by this process (db.ts:113-122).
- Settings cache: 5 s TTL, updated on save (db.ts:62-65, 101).
- `getEventsPage`, `getEventById` and `getOpenSleepSession` are not cached.

### 7.4 PWA (client build, vite.config.ts)

- `vite-plugin-pwa`, `registerType: 'autoUpdate'`, dev SW enabled. Manifest: name `Baby Tracker`, short_name `BabyTracker`, description `מעקב תינוק — האכלות, שינה, חיתולים ועוד`, theme `#ffffff`, background `#020617`, `display: standalone`, `orientation: portrait`, `start_url` and `scope` `/`, `lang: he`, `dir: rtl`, icons `pwa-192x192.png` (192) and `pwa-512x512.png` (512, plus a `maskable` entry).
- Workbox: precache `**/*.{js,css,html,ico,png,svg,woff2}`, `navigateFallback: '/index.html'`, runtime CacheFirst for `fonts.googleapis.com` (cache `google-fonts-cache`, 10 entries, 1 year, statuses 0/200). API calls are not cached by the SW.
- Rollup manual chunks: `react-vendor` (react, react-dom) and `motion`.

### 7.5 Environment variables

| Variable | Used in | Meaning |
|---|---|---|
| `PORT` | server.ts:24 | Listen port (default 3000). |
| `NODE_ENV` | server.ts:34,52,939 | `production` → trust proxy, secure cookie, static hosting; else Vite dev middleware. |
| `SESSION_SECRET` | server.ts:26,47 | Required; session signing secret. |
| `PARENT_A_USERNAME`, `PARENT_A_PASSWORD_HASH` | server.ts:135-136 | Parent A login (bcrypt hash). |
| `PARENT_B_USERNAME`, `PARENT_B_PASSWORD_HASH` | server.ts:140-141 | Parent B login. |
| `FIREBASE_ADMIN_CREDENTIALS_JSON` | db.ts:24 | Base64 service-account JSON (takes precedence). |
| `FIREBASE_ADMIN_CREDENTIALS_PATH` | db.ts:25 | Path to service-account JSON (local dev). One of the two is required or startup throws. |
| `FIRESTORE_DATABASE_ID` | db.ts:45 | Named Firestore database id. |
| `DISABLE_HMR` | vite.config.ts:91 | Dev only. |
| `GEMINI_API_KEY`, `APP_URL` | `.env.example` only | Not read by any server code (AI Studio template leftovers; `@google/genai` is a dependency but unused by the server). |

`dotenv/config` is loaded in both `server.ts` and `server/db.ts`.

### 7.6 Error-handling facts that change observable behaviour

- Firestore read failures are mostly swallowed: `getSettings` → defaults; `getAllEvents` → `[]` (after one unordered retry); `getEventsPage` → empty page; `getEventById` → `null` (PUT returns 404); `getOpenSleepSession` → `null` (toggle would then open a second session); `deleteEvent` → `false` (404).
- Write failures (`saveEvent`, `saveSettings`) throw → route 500.
- Server-side logging only via `console.error` / `console.log`; no request logging.
