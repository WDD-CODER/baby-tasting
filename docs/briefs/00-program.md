# Baby Tasting — Program Document

Status: approved by the Human in chat, 2026-11-14. This file is the single source of product decisions for every
brief in this folder. A brief never repeats these rules; it points here. When a brief and this file disagree, this file
wins and the Planner raises it as an `open:` line.

## 1. What the product is

A mobile-first Hebrew (RTL) web app for two parents to plan and record their baby's food tasting: which food is
given on which day and in which meal, with strict tracking of allergen introduction and allergen maintenance.

It is a planning and tracking tool. It gives no medical advice and never decides for the parents; every rule below is a
default the parents can see and change in Settings.

## 2. Decisions already made (do not ask again)

| # | Decision |
|---|---|
| D1 | New standalone repository `baby-tasting`, private, local folder `C:\coding projects\Cursor\baby-tasting`. |
| D2 | Stack: Angular (latest stable the CLI installs, standalone components, signals, SCSS) at the repo root; Node + Express (JavaScript, ESM) in `server/`; MongoDB. Package manager: pnpm. |
| D3 | Kit: `WDD-CODER/ai-workflow-kit` release `v3.3.0`, packs `angular,node-express`. |
| D4 | One Render Web Service: Express serves the Angular production build and `/api/*`. The app also runs locally. Both are configured from day one. |
| D5 | Data: production data lives in MongoDB Atlas (used by Render). Local development uses a separate development database. Never point local dev at production data by default. |
| D6 | Photos: Cloudinary (the Human's account), uploaded through the server. Nothing is stored on Render's disk. |
| D7 | Access: no registration screen. A user signs in with a username only; the username is also the secret. Allowed usernames come from the server environment (`APP_USERS`, comma-separated). All users share one household and one baby. Session cookie lasts 180 days. Login is rate-limited. |
| D8 | All data is entered by hand, including history for past dates. No real baby data is ever seeded in code. |
| D9 | UI language: Hebrew only, RTL. Code, comments, commit messages, docs: English. |
| D10 | Design follows the Baby Tracker look: dark slate canvas, Heebo font, indigo accent (section 6). Agents make no design decision that section 6 or `DESIGN.md` does not cover; they ask. |
| D11 | Out of version 1: recipes, shopping list, nutrition values, push notifications, multiple babies in the UI, English UI. |
| D12 | The product will probably be merged into Baby Tracker later (section 7). Build it standalone now, merge-ready. |

## 3. Domain model (names are binding)

- **Household** — one per deployment in v1. Every stored document carries `householdId` and `babyId`.
- **Baby** — name, birth date. Age is always computed from the birth date.
- **Allergen** — a named allergen group (for example "ביצה"). Built-in list in brief 3; parents can add, rename and
  archive allergens.
- **Food** — name (Hebrew), category, emoji icon, optional `allergenId`, optional warning. Built-in catalog in brief 3;
  parents can add, edit and archive foods. A food with an `allergenId` is an **allergen food**; any other is a
  **regular food**.
- **Calendar item** — one food on one date in one meal: `{ date, meal: 1|2|3, foodId, status: planned|given|skipped,
  amount?, note?, createdBy, givenBy? }`. Meals are numbered, not timed. A `given` item is the tasting record; there
  is no separate tasting log collection.
- **Reaction** — a recorded reaction linked to one or more calendar items (brief 7).
- **Settings** — the rule values of section 4, per household.

## 4. Rules (defaults; each one is a Settings value unless marked fixed)

**Allergen states:** `not_started → introducing → maintenance → finished`, plus `locked` from any state.

- R1 **Introduction.** An allergen starts `introducing` on the first day one of its foods is `given`. Introduction is
  complete after it was given on 3 different days (`introDays`, default 3). Parents may keep giving it longer.
- R2 **Missing day — alert, never restart.** While an allergen is `introducing`, every day from its first given day
  until completion should have it. When a day passes without it, the count does not reset. The app shows an alert
  on the calendar and on the status page: "חסר יום ברצף — כדאי לתת היום {allergen}". The alert clears when it is given.
- R3 **One at a time — warning only.** Starting a second allergen while another is `introducing` shows a
  confirmation ("{allergen} עדיין בחשיפה. להתחיל גם {new}?"). The parent may continue.
- R4 **Meal 1 (fixed).** An allergen food is always in meal 1. The calendar refuses to drop or add an allergen food in
  meal 2 or 3 and says why ("אלרגן ניתן בארוחה הראשונה"). Moving it to meal 1 of another day is allowed.
- R5 **Mixing is fine.** A regular food may be given on introduction days, in any meal, including meal 1 next to the
  allergen. New regular foods are allowed on those days too.
- R6 **Maintenance.** After introduction the allergen is in `maintenance` until the baby is 24 months old
  (`maintenanceUntilMonths`, default 24); then `finished`. Target: given at least 2 times in each calendar week
  (`maintenancePerWeek`, default 2; the week runs Sunday–Saturday). Alert when more than 5 days passed since it was
  last given (`maintenanceGapDays`, default 5): "עברו {n} ימים בלי {allergen}".
- R7 **Lock on reaction.** A reaction recorded on an item locks every allergen whose food was in that meal — and locks
  each regular food in it — until a parent releases it explicitly. A locked food cannot be added to the calendar, its
  future `planned` items are flagged (not deleted), and the suggestion engine skips it. Release asks for confirmation
  and records who released and when.
- R8 **Warnings on foods (fixed text, parents can still add the food).** Honey: not before 12 months. Cow's milk as a
  drink: not before 12 months. Choking-risk foods (whole nuts, whole grapes, and the others listed in brief 3): show
  the preparation note. A warning never blocks; it is shown when the food is added to the calendar while the baby is
  below the age in the warning.
- R9 **Regular-food status.** `never tried`, or `tried` with first date, times given, and a "liked" mark the parents
  can set. Nothing is inferred beyond that.

## 5. The calendar is the product

The calendar is the home screen and the place where almost everything is done. Detail screens with many fields
(reaction form, food editor, settings, allergen status) are separate pages, not crowded into the calendar.

- **Week view (default, home).** Seven day columns (week starts Sunday, RTL: Sunday on the right), three meal rows.
  Each cell shows the emoji icons of its items. Allergen foods are visually distinct at a glance: accent ring plus a
  small badge; `introducing` and `maintenance` use different badge colours; a locked food shows a lock.
- **Month view.** Overview only: each day shows up to 4 icons then "+N", with allergen items first. Tapping a day opens
  the day sheet.
- **Day sheet.** The three meals of one day as lists, with an "add food" action per meal.
- **Actions in the calendar:** add a food to a meal (search / pick from catalog), remove, drag an item to another meal
  or another day (Angular CDK drag-drop, works with touch), mark `given` (one tap; optional amount: `טעימה` / `כפית` /
  `מנה`, optional note and "liked"), mark `skipped`, undo. Past dates work the same way, so history is entered here.
- **Alerts** (R2, R6, R7, R8) appear as a compact strip above the calendar; tapping one jumps to the day or page that
  resolves it.
- **Suggestions** (brief 6) appear in the calendar as dashed "suggested" items that a parent accepts or dismisses,
  one by one or all at once. A suggestion never overwrites or moves an item a parent placed.

## 6. Design baseline (until `DESIGN.md` exists; brief 1 writes it from this section)

- Dark theme only. Canvas `#020617`, surfaces `#0f172a`, text `#f1f5f9` / secondary `#94a3b8`.
- Font: Heebo (400, 500, 700, 800), fallback `system-ui`.
- Primary accent: indigo (`#4f46e5` solid, `#6366f1` on borders at 30% opacity).
- Semantic colours (same values as Baby Tracker): bad `#E5484D`, okay `#F5A623`, good `#46A758`, great `#30A46C`.
  Nutrition category colour `#F6C9A8`.
- Allergen marking: `introducing` = okay colour, `maintenance` = good colour, `locked` = bad colour, alert = bad colour.
- Radius 16px for cards, 24px for sheets. Touch targets at least 44px. Logical CSS properties only.
- Icons for foods are emoji stored on the food. No icon library for foods.
- Tokens are CSS custom properties with the Baby Tracker names (`--color-tier-bad`, `--color-cat-nutrition`, …).
- Every reusable visual piece (button, card, sheet, chip, alert strip, empty state, confirm dialog) is one shared
  component used everywhere. A plan that needs a new visual piece adds it to the shared set, never a one-off.

## 7. Merge-readiness with Baby Tracker (constraints on every brief)

Baby Tracker today is React + Vite + Express + Firestore, single shared household, dark theme, Heebo. The merge shape is
not decided. To keep every option open:

- M1 All domain rules (section 4) live in one framework-free module, `server/domain/`, as pure functions with no
  Express, MongoDB or Angular import. It is the part that will be reused as is.
- M2 All database access goes through repository modules in `server/repositories/`. No route or domain file imports
  the MongoDB driver directly.
- M3 Authentication is one middleware that sets `req.user` and `req.householdId`. Nothing else knows how login works.
- M4 The REST API is versioned under `/api/v1/` and returns plain JSON; dates are ISO `YYYY-MM-DD` for calendar days and
  ISO timestamps for moments.
- M5 Design tokens keep the Baby Tracker names (section 6).

## 8. Standing product behaviours (apply to every screen without being repeated in a brief)

- A form with unsaved changes asks before the user leaves it.
- Every destructive action (delete, archive, release a lock) asks for confirmation.
- Every create / update / delete records who did it and when (`createdBy`, `updatedBy`, timestamps).
- Every list has an empty state with one action. Every request has loading and error states in Hebrew.
- Every screen works at 360px width; nothing scrolls horizontally except the week view when it must.
- All UI strings are in one Hebrew dictionary file, never inline in templates.

## 9. Briefs and run order

| Brief | Title | Depends on | How it runs |
|---|---|---|---|
| 0 | Bootstrap: empty app + kit installed | — | Solo session, before the kit exists |
| 1 | Foundation: shell, design system, server base, Render file | 0 | Orchestrator |
| 2 | Sign-in, household, baby profile | 1 | Orchestrator |
| 3 | Food and allergen catalog | 2 | Orchestrator |
| 4 | Calendar core | 3 | Orchestrator |
| 5 | Allergen rules engine and alerts | 4 | Orchestrator |
| 6 | Suggestions | 5 | Orchestrator (may share files with 7; `plan-order` decides) |
| 7 | Reactions, photos and locks | 5 | Orchestrator |
| 8 | Status pages and settings | 6, 7 | Orchestrator |
| 9 | Deploy to Render and end-to-end check | 8 | Solo, with Human steps |

After brief 0: in the main folder, give the Planner this file and briefs 1–8, choose **b** (plan it) at the brief
gate for each, approve the plans, then run them as one orchestrator run in the order above.

## 10. What only the Human can do

1. Before brief 0: nothing (the agent creates the private GitHub repository with `gh`; if `gh` is not signed in, the
   Human creates an empty private repository named `baby-tasting`).
2. After brief 0: GitHub → repository Settings → Actions → General → Workflow permissions → tick "Allow GitHub Actions
   to create and approve pull requests" (the kit's todo-sync needs it).
3. Before brief 7: Cloudinary account values `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in
   `server/.env`.
4. Before brief 9: a free MongoDB Atlas cluster and its connection string; a Render account connected to the
   repository; the two real usernames for `APP_USERS`.
5. Merging the orchestrator's run branch into `main`, and answering validation cards.
