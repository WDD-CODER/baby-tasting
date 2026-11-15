# Brief 7 — Reactions, photos and locks

Read `docs/briefs/00-program.md` first (R7, D6, section 5, section 8).

## Goal

When the baby reacts to something, a parent records it in under a minute with text and photos, and the suspected
foods are locked until a parent explicitly releases them.

## Scope

- Server: `/api/v1/reactions` CRUD. A reaction has: date and time it was noticed, the calendar item(s) it relates to
  (chosen from that day's given items), symptoms (multi-select: `פריחה`, `אדמומיות סביב הפה`, `נפיחות`, `הקאה`,
  `שלשול`, `קושי בנשימה`, `אחר`), severity (`קל`, `בינוני`, `חמור`), free text, photos, who recorded it.
- Photos: `POST /api/v1/uploads/signature` returns a signed Cloudinary upload for an authenticated user; the browser
  uploads directly to Cloudinary; the reaction stores the returned public id and URL. Folder per household. Client
  resizes to a maximum of 1600px before upload; up to 5 photos per reaction. Deleting a reaction photo deletes it in
  Cloudinary.
- Locks (R7): saving a reaction locks each allergen whose food was in the related items and each regular food in
  them. `locked` is layered onto brief 5's state. A locked food: cannot be added or dropped on the calendar
  (`{food} נעול בעקבות תגובה`), its future `planned` items show a lock and an alert, and suggestions skip it (brief 6
  already honours a `locked` flag — wire it).
- Release: `POST /api/v1/allergens/:id/release` and `POST /api/v1/foods/:id/release`, with confirmation in the UI
  (`לשחרר את {name}? ודאו שהתייעצתם עם רופא/ה`), recording who and when. After release an allergen returns to the
  state the engine computes from its history.
- Frontend: `תגובה` action on any `given` calendar item opens the reaction page (a separate page, not a sheet);
  reactions list and detail under the `אלרגנים` area and on the food's detail; lock indicators on calendar items, the
  foods page and the `אלרגנים` page; a `שחרור` action where the lock is shown.
- Fixed notice at the top of the reaction form when `קושי בנשימה` or `חמור` is chosen:
  `במקרה של קושי בנשימה או החמרה מהירה — התקשרו 101`.

## Out of Scope

Diagnosis or advice of any kind, exporting reactions, sharing with a doctor, video.

## Rules

- A reaction always relates to at least one given item of the same date or the day before.
- Editing or deleting a reaction does not release a lock; only the explicit release does.
- With Cloudinary variables missing, the server still starts, photo upload answers with a clear error, and a reaction
  can be saved without photos.
- Uploads accept images only; the signature endpoint requires a session.

## Done when

- [auto] Server tests: a reaction on a meal with "טחינה" and "בננה" locks the sesame allergen and the banana food;
  adding either to the calendar is refused; the status route reports `locked`; release restores the computed state
  and records the releasing user; deleting the reaction leaves the lock; the signature route answers 401 without a
  session and a clear error when Cloudinary is not configured.
- [auto] Domain test: a locked allergen produces no R2 / R6 alerts and one lock alert.
- [ui] From a given "ביצה קשה" item, record a reaction with `פריחה`, `קל`, text and one photo: it appears in the
  reactions list with the photo, and ביצה shows a lock on the `אלרגנים` page.
- [ui] Trying to add "חביתה" to the calendar shows `חביתה נעול בעקבות תגובה`.
- [ui] `שחרור` on ביצה asks for confirmation; after confirming, the lock disappears and "חביתה" can be added.
- [ui] Choosing `קושי בנשימה` shows the 101 notice.
- [human] Recording a reaction on a phone, including a photo from the camera, takes under a minute.
