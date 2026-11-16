# Baby Tracker rebuild — Program Addendum

Status: **draft for the Human's approval** (2026-11-16). It extends `docs/briefs/00-program.md`; where they disagree,
this file wins for the Tracker part and the Planner raises it as an `open:` line.

## 1. What this is

Baby Tracker (`WDD-CODER/baby-tracker`, React 19 + Vite + Express + Firestore, in daily use) is rebuilt inside this
project on its stack (Angular, Express ESM, MongoDB) as a second area of the same app, next to Tasting. When the new
app reaches parity, the Tracker data is copied once from Firestore to MongoDB and the parents switch over. The old
Tracker keeps running until then and is archived after.

**Source of truth for behaviour:** the three specs read from the Tracker code (2026-11-16), copied here:
- `spec-server-data.md` — data model, Firestore layout, all 16 routes, stats math, Excel export, auth, hosting.
- `spec-log-settings.md` — sign-in, shell, log tab, entry/edit sheets, sleep, DateTime24, settings, PWA.
- `spec-timeline-dashboards.md` — timeline, dashboards, edit/delete, design tokens, icons.

Every brief points to spec sections instead of repeating them. **Rule:** behaviour in the specs is rebuilt as is,
except the items in section 4 (fixes) and the decisions in section 3. Exact Hebrew texts in the specs are binding.

## 2. Decided (Human)

| # | Decision |
|---|---|
| TR1 | Rebuild on Angular + Express + MongoDB inside this project (not React, not Firestore). 2026-11-16 |
| TR2 | Old Tracker stays live until parity is validated; one-time Firestore → MongoDB copy; then switch. 2026-11-16 |

## 3. Proposed defaults — the Human confirms or changes before planning

| # | Proposal | Why |
|---|---|---|
| P1 | **Sign-in with username + password** for both areas (replaces Tasting's username-only D7). Users from env `APP_USERS` as `name:bcryptHash` pairs, compared case-insensitively on the name; parent display names come from settings (`parentAName`, `parentBName`, defaults `אמא` / `אבא`). Sessions stay in MongoDB, 180 days. | Tracker holds months of real data. |
| P2 | **Navigation**: five bottom tabs — `תיעוד` (Tracker log, the new home), `ציר זמן`, `סטטיסטיקה` (dashboards), `טעימות` (Tasting: calendar with its own top tabs `יומן` / `מזונות` / `אלרגנים`), `הגדרות` (one settings page with a Tracker section and a Tasting section). | One app, Tracker first because it is used many times a day. |
| P3 | **One baby profile**: Tracker's `babyProfile` (name, date of birth, birth weight) is the baby document Tasting already has (`babies` collection), extended with `birthWeightGrams`. | One source for age. |
| P4 | **Time zone**: every "day" and every wall-clock time is Asia/Jerusalem on both server and client (today the client uses the browser's zone). The Tracker "baby day" starts at 06:00 Israel time. | Same answer on any device. |
| P5 | **Design**: the Tasting design system (`DESIGN.md`, tokens with Baby Tracker names) is used; Tracker's per-event colours and icons (spec `spec-timeline-dashboards.md` §5.5–5.7) become tokens and shared icon components. | One look. |
| P6 | **Stats on the server**: dashboards read server stats routes (fixed, see F1); the browser does not recompute. Pure stats functions live in `server/domain/tracker/` (INV-1). | Testable, same numbers in export and screen. |

## 4. Fixes — bugs in today's Tracker that the rebuild does NOT copy (Human confirms)

| # | Today | Rebuild |
|---|---|---|
| F1 | Stats routes get a full ISO `from` and return 500; the client ignores it (spec-server-data §4.1). | Routes take `YYYY-MM-DD`, the client sends that; covered by tests. |
| F2 | Sessions live in memory; every redeploy signs both parents out (§6). | Sessions in MongoDB (already true in this project). |
| F3 | "Default bottle type" setting never applies to new entries (spec-log-settings §6.2). | New bottle entries start with the setting's value. |
| F4 | The 10 s double-submit guard starts before validation, so a refused save blocks a retry (§1.5). | Guard starts only after validation passes. |
| F5 | Editing a quick-recorded meal drops feeding details (§6.9). | Edit keeps and edits every field. |
| F6 | Sleep edit with empty end time leaves the button on `שומר...` (§6.9). | Empty end = still open; save works or shows a field error. |
| F7 | "Delete from date backwards" keeps events of the chosen date (§8.7). | Includes the chosen date; the confirm text says so. |
| F8 | Edit sheet lacks spit-up and liquid type; activity and supplement have no editor (§6.9). | Every event type is editable with every field it has. |
| F9 | Starting a sleep while one is open: timer mode ignores the chosen time/location; manual mode creates overlapping sleeps (§5.2). | One open sleep at a time everywhere; the sheet offers "end current sleep" with the chosen time; overlaps refused with a message. |
| F10 | Clearing a note does not remove it; editing a sleep loses who started/ended it; edit header shows the raw English type; a failed delete shows nothing (spec-timeline-dashboards §4). | Note can be cleared; starter/ender kept; Hebrew type title; error toast on failed delete. |
| F11 | Excel "Latest Weight" shows each day's earliest weigh-in (spec-server-data §5). | Shows the latest. |
| F12 | Editing an open sleep probably returns 500 (undefined field) (spec-server-data §7.6). | Covered by a test. |
| F13 | Undefined Tailwind classes render unstyled; the app may not use Heebo (spec-timeline-dashboards §5.2). | Tokens only; Heebo everywhere. |

## 5. Rules carried over from the main program

Sections 6 (design), 7 (merge-readiness → now: domain purity, repositories, one auth middleware, `/api/v1`, tokens),
and 8 (standing behaviours) of `00-program.md` apply to every Tracker brief. The old `/api/*` paths are **not** kept;
the new API is `/api/v1/tracker/*`.

## 6. Briefs and run order

| Brief | Title | Depends on |
|---|---|---|
| T1 | Shared base: password sign-in, navigation, baby profile, Tracker settings | Tasting plans 001–008 merged |
| T2 | Events and sleep: data model, API, rules | T1 |
| T3 | Log tab: today carousel, quick actions, entry sheets, sleep timer, trackers | T2 |
| T4 | Timeline and the shared edit/delete sheet | T3 |
| T5 | Dashboards and stats | T2, T4 |
| T6 | Settings (Tracker part), Excel export, data reset, PWA | T5 |
| T7 | Firestore → MongoDB copy and switch-over | T6 |

T1–T6 can run as one orchestrator run (like briefs 1–8). T7 runs with the Human (it needs the Firebase key and the
Atlas connection string), after the Human has validated T1–T6 on the phone.
