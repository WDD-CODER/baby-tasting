# Brief T1 — Shared base: password sign-in, navigation, baby profile, Tracker settings

Read `00-tracker-program.md` first (P1, P2, P3, P4, F2) and `docs/briefs/00-program.md`.

## Goal
One app with two areas: the parents sign in once with username and password, land on the Tracker home, and reach
Tasting from the navigation; both areas use the same baby profile and settings.

## Scope
- Server: extend `POST /api/v1/auth/login` to `{ username, password }` checked with `bcryptjs` against `APP_USERS`
  (`name:hash,name:hash`); keep the rate limit, the generic failure and the MongoDB sessions; `auth/me` returns
  `{ username, parentType: 'PARENT_A'|'PARENT_B', parentName }` (A = first entry in `APP_USERS`).
  `.env.example` documents how to make a hash: `node -e "import('bcryptjs').then(b=>b.hash('pw',10).then(console.log))"`.
- Tracker settings (spec-server-data §1.2, §3.3–3.4): `GET`/`PUT /api/v1/tracker/settings` with `parentAName`,
  `parentBName`, `defaultBottleType`, `customActivities`, `quickActionOrder` and the defaults of §1.2; `currentParent`
  in the GET like today. Stored in the existing `settings` document of the household (Tasting rule values stay there).
- Baby profile (P3): the existing baby document gains `birthWeightGrams`; `GET`/`PUT /api/v1/baby` accept it.
- Frontend: sign-in page with `שם משתמש` and `סיסמה` (spec-log-settings §2 texts and behaviour, adapted to the
  existing page), the new bottom navigation of P2 (five tabs, emoji or icon per tab, active state), Tasting's three
  pages moved under `/tasting` (`/tasting`, `/tasting/foods`, `/tasting/allergens`, all existing deep routes under it)
  with a small top tab bar; `/` becomes the Tracker log page (empty state only in this brief: `יום חדש ורענן!`);
  `ציר זמן` and `סטטיסטיקה` routes with empty states; settings page grows a `מעקב תינוק` section (parents names,
  default bottle, baby profile with birth weight) above the Tasting section.

- Stay signed in (P1): the session cookie is renewed on every authenticated request (rolling, 1-year idle limit);
  `יציאה` ends it; opening the app on a signed-in phone goes straight to `/` with no sign-in screen flash.
- Icons (P7): self-host Material Symbols Rounded (`material-symbols` package, the rounded font only); the slot
  registry `src/app/core/icons/icon-slots.ts` (slot key → default icon name + Hebrew label + keywords); `app-icon`
  (`slot` input, or `name` for a fixed icon) reading `iconOverrides` from settings; the navigation uses slots.
  `iconOverrides` is stored in the Tracker settings and accepted by `PUT /api/v1/tracker/settings` (only known slot
  keys, only names that exist in the library's name list shipped with the package).

## Out of scope
Events, log tab content, timeline, dashboards, export (T2–T6).

## Done when
- [auto] build, lint, test pass; server tests: right password → session; wrong password or unknown name → 401 generic;
  11th attempt → 429; `auth/me` returns parentType A for the first `APP_USERS` entry; tracker settings defaults and save.
- [ui] Sign-in with name and password opens `/` and shows `יום חדש ורענן!`; the five tabs are visible at 360px.
- [ui] `טעימות` opens the tasting calendar; its `מזונות` top tab opens the foods page; every Tasting e2e check still passes under `/tasting`.
- [ui] Settings shows the baby's birth weight field and saving parent names updates the name shown in the top bar.
- [ui] After signing in, closing the browser and opening `/` again shows the Tracker home without the sign-in page.
- [auto] Server test: an authenticated request renews the session expiry; after `logout` the same cookie gets 401.
- [human] Navigation feels natural with Tracker first and Tasting one tap away.
