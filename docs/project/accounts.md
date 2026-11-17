# Accounts

Two parents, one shared household. Where accounts live depends on `APP_USERS`.

## Two modes
- **`env` mode** — `APP_USERS` is set (local dev, the `wt-N` slots, e2e): it is the account list, sign-up is off, the sign-up endpoints answer `409 signup_closed`.
- **`db` mode** — `APP_USERS` is empty or unset (Render): accounts live in the `users` collection and sign-up is on.

## Render settings
Only `MONGODB_URI`, `SESSION_SECRET` and the optional Cloudinary keys. No user list.

## Sign-up (`db` mode)
1. The first visitor opens the app and creates the first account (`יצירת חשבון`). It becomes parent A.
2. Parent A opens Settings and taps `יצירת קישור הזמנה`, then copies or shares the link (`/join/<token>`; single use, 7 days; only its SHA-256 is stored).
3. Parent B opens the link and creates the second account. Sign-up is then closed.

Username: 2-30 characters (Hebrew or Latin letters, digits, `-`, `_`), unique ignoring case. Password: 4-200 characters.

## Parent B forgot the password
Parent A taps `איפוס סיסמה להורה השני` in Settings. Parent B is signed out and signs up again with the new link. The same name brings back their per-user settings.

## Parent A forgot the password
There is no email, so no in-app reset. In Atlas, delete the `PARENT_A` document from the `users` collection (and, to sign out old phones, the matching `sessions` documents). The first-account sign-up is open again.
