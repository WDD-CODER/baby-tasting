# Brief 2 — Sign-in, household and baby profile

Read `docs/briefs/00-program.md` first (D7, D8, M3, section 8).

## Goal

Two parents sign in with a username and share one household and one baby; every later API call knows who is asking
and for which household and baby.

## Scope

- Server: `POST /api/v1/auth/login` `{ username }`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`. A username is
  accepted only when it is in `APP_USERS` (compared case-insensitively, trimmed). Session in an http-only cookie,
  180 days, secure in production, stored in MongoDB. Login limited to 10 attempts per 15 minutes per IP; a refused
  username gets the same generic answer as any failure.
- One authentication middleware (M3) on every `/api/v1/*` route except `health` and `auth/login`. It sets `req.user`
  and `req.householdId`.
- Household: created automatically on the first successful login; every allowed user belongs to it.
- Baby: `GET` / `PUT /api/v1/baby` — name and birth date. Age in months and days is computed, never stored.
- Frontend: sign-in page (one field `שם משתמש`, one button `כניסה`), route guard, HTTP interceptor that sends the
  cookie and redirects to sign-in on 401, sign-out in Settings, first-run screen that asks for the baby's name and
  birth date when none exists, baby name and age shown in the top bar.

## Out of Scope

Registration, passwords, password reset, roles, more than one household, more than one baby in the UI (the data model
keeps `babyId` on everything so a second baby is possible later).

## Rules

- No screen and no API ever lists the allowed usernames.
- The middleware is the only place that reads the session. Routes and repositories receive `householdId` as a value.
- `APP_USERS` default in `.env.example` is two placeholder names for development only.

## Done when

- [auto] Server tests: an allowed username gets a session and `auth/me` returns it; an unknown username gets 401 with
  the generic message; the 11th attempt in the window gets 429; any `/api/v1/baby` call without a session gets 401.
- [auto] Server test: two different allowed usernames read and write the same baby document.
- [ui] Sign-in with an allowed name opens the app; with an unknown name the page shows `שם המשתמש לא מזוהה` and stays.
- [ui] With no baby saved, the first-run screen appears; after saving name and birth date the top bar shows the name
  and the age in months.
- [ui] Editing the baby form and pressing back asks before leaving (standing behaviour).
- [human] Sign-in feels fast enough to do one-handed on a phone.
