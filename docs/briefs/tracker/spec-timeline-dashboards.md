# Baby Tracker — behaviour spec: Timeline tab, Dashboards tab, Edit/Delete flow, design tokens

Source of truth: `C:\coding projects\Cursor\baby-tracker` (read-only). Line refs are `src/App.tsx:N` unless another file is named.
Scope: `activeTab === 'timeline'` (App.tsx:3202–3490), `activeTab === 'dashboards'` (App.tsx:3493–4540), the edit sheet + delete confirm both tabs open (App.tsx:4905–6262, 2503–2525), and tokens. Log tab, shell, login, sleep timer and settings are covered elsewhere.

Global facts that matter for both tabs:
- Document is `<html lang="he" dir="rtl" class="dark">` (index.html:2); app root is `dir="rtl"` (2388). In RTL, flex row children start on the **right**; `border-r-*` is the **leading/start** edge (right side on screen).
- Content column: `<main class="flex-1 w-full max-w-md mx-auto px-4 py-4 flex flex-col gap-4">` (2549) — max width 28rem, 16px gutters. Root has `pb-24` for the fixed 80px bottom nav.
- Root text colour is `text-slate-100` (from `getAppThemeBgClass`, 2119+). This matters because undefined border colours fall back to `currentColor` (see §4.4).
- No chart library anywhere. Every "chart" is plain `div`s with percentage widths. No SVG charts. dnd-kit is used **only** for quick-action reorder on the Log tab (App.tsx:240–271, 3030–3043) — there is **no drag/reorder in Timeline or Dashboards**.
- Single shared data source `events: BabyEvent[]`, loaded by `fetchEvents()` → `GET /api/events?limit=400` (1386–1404). Server returns `{events, nextCursor}` sorted **timestamp descending** (server/db.ts:195, 229). `nextCursor` is ignored by the client (no pagination UI).
- Open sleep session: `openSleepSession`, from `GET /api/sleep/open` (1406–1420); body is the open SLEEP event or null.
- Times shown in browser local time (no explicit timeZone) via `toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'[, hour12:false]})` → `"09:05"`, `"14:05"` (24h). Dates via `toLocaleDateString('he-IL', {weekday:'short', month:'numeric', day:'numeric'})` → `"יום ב׳, 16.11"`.

---

## 1. Bottom-nav entry points (for context)

- Nav item 2 "📋 / ציר זמן": `onClick → setActiveTab('timeline'); fetchEvents()` (6280–6291). So **every** entry into Timeline triggers a foreground fetch → the loading spinner shows each time.
- Nav item 3 "📊 / דאשבורדים": `setActiveTab('dashboards')` only (6294–6302). A `useEffect([activeTab, dashboardDays])` calls `fetchStats()` when the tab is dashboards (1261–1265). Dashboards do **not** refetch `events`.
- Active nav style: `text-indigo-400 scale-105 font-black`; inactive `text-slate-500 hover:text-slate-400 font-bold`.
- On `visibilitychange → visible` (while authenticated): `checkOpenSleepSession()` + `fetchEvents({background:true})` (no spinner) (776–785).
- A 5-second `setInterval` updates `currentTime` (798–803), forcing re-render; this is what keeps running-sleep durations in the dashboard sequence chart live.

---

## 2. Timeline tab (`activeTab === 'timeline'`, 3202–3490)

### 2.1 Layout, top to bottom
Container: `div.flex.flex-col.gap-4`.

1. **Header row** (`flex items-center justify-between`)
   - Right (start): `<h2 class="text-lg font-black text-slate-100">📋 ציר הזמן ההיסטורי</h2>`
   - Left (end): `flex items-center gap-2` containing:
     - **Day-window pill group**: wrapper `bg-slate-950 p-1 rounded-2xl border border-slate-850 flex gap-1`. Buttons for `[1, 7, 14]` in that DOM order (so on screen right→left: היום, 7 ימים, 14 ימים). Label: `days === 1 ? 'היום' : \`${days} ימים\`` → **"היום"**, **"7 ימים"**, **"14 ימים"**. Classes `px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer`; selected `bg-indigo-600 text-white shadow-sm`; unselected `text-slate-400 hover:text-slate-300`. `type="button"`.
     - **Refresh button**: `p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl`, `title="רענן"`, icon lucide `RefreshCw` `w-4 h-4`. `onClick={fetchEvents}` (click event is passed as `opts`; `opts.background` is undefined → foreground fetch → spinner).
2. **Body**: one of three states (3233–3488).

### 2.2 Filter (day window)
- State `timelineDays`, `useState(1)`; comment: "rolling day window; never persisted → resets to 1 on app open" (352). No storage.
- It is a **rolling window from now**, not calendar days: `cutoffMs = Date.now() - timelineDays * 24h`; keep events with `new Date(e.timestamp) >= cutoffMs` (3275–3279). "היום" = last 24 hours (can include yesterday evening). This differs from Dashboards, which use a 06:00 "baby day" boundary (§3.2).
- Filtering is purely client-side over the ≤400 fetched events; changing the window makes no API call.
- The open sleep session is always excluded from the list (`e.id === openSleepSession?.id → false`) and instead shown as the pinned card (2.4), regardless of window.
- No event-type filter exists. No search.

### 2.3 States
- **Loading** (`loading === true`): `flex flex-col items-center justify-center py-16 gap-3`; spinner `w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin`; text `text-xs text-slate-400 font-bold` **"טוען אירועים אחרונים..."** (3233–3237). `loading` starts `true` (336).
- **Empty** (`events.length === 0`, i.e. nothing fetched at all): card `bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center flex flex-col items-center gap-3`: `📭` (`text-3xl`), **"עדיין לא רשמתם אירועים."** (`text-sm text-slate-400 font-bold`), **"לחצו על כפתור למטה כדי להתחיל."** (`text-xs text-slate-500`) (3238–3243).
- Edge: if events exist but **none fall inside the window**, there is **no** empty message — just the (empty) list container with its vertical line (and the active-sleep card if sleeping).
- Fetch failure: toast **"שגיאה בטעינת הנתונים מהשרת"** (1400); 401 → `handleUnauthorized()` (logs out to login screen).
- **List**: `flex flex-col gap-3 relative` with a decorative vertical rail `before:absolute before:top-0 before:bottom-0 before:right-6 before:w-0.5 before:bg-slate-800/80` (2px line, 24px from the right edge, behind icons — icons have `z-10`).

### 2.4 Pinned "sleeping now" card (only when `openSleepSession`) (3248–3273)
- Container `relative flex items-start gap-3 bg-indigo-950/35 border border-indigo-500/40 p-4 rounded-3xl shadow-md animate-pulse`. **Not clickable**.
- Icon tile: `w-12 h-12 bg-indigo-500 text-white rounded-2xl flex items-center justify-center font-bold shrink-0 z-10 text-lg shadow-lg` containing `💤`.
- Text column `flex-1 min-w-0 text-right`:
  - Row `flex justify-between items-start`: `<h4 class="text-base font-black text-indigo-200">ישן עכשיו</h4>` + pill `text-[10px] text-indigo-400 font-extrabold bg-indigo-900/50 px-2 py-0.5 rounded-full` **"שינה פעילה"**.
  - `p.text-xs.text-indigo-300.font-bold.mt-1`: **"התחיל ב-{HH:MM}"** (time of `sleep.startAt || timestamp`, `hour12:false`), then if `sleep.startLocation`: **" (מיקום: X)"** where CRIB → "עריסה / מיטה", HANDS → "על הידיים", CARRIER → "במנשא", anything else → "בעגלה".
  - `p.text-[10px].text-slate-400.mt-2`: **"רשם: {name}"** using `loggedBy` (PARENT_A → `settings.parentAName`, else `parentBName`).

### 2.5 Event row (one per filtered event, newest first) (3421–3485)
Order = server order (timestamp desc). **No grouping by day, no date headers** in the timeline — only a time on each row.

Row container: `div` (not a button), `onClick → openEditSheet(e)`; classes `relative flex items-center gap-4 p-3.5 rounded-3xl border border-slate-850 hover:border-slate-700/80 hover:bg-slate-900 transition-all cursor-pointer select-none text-right {bgClass} {accent}` where accent = `border-r-4` + inline `borderRightColor: TIER_MAP[tier].color` when a tier face applies (§2.7), otherwise the per-type `borderClass` (`border-r-4 border-r-<colour>`).

Structure:
1. **Icon tile** (`shrink-0 z-10` wrapper): `relative w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm bg-slate-950 border border-slate-800` containing the type icon.
   - **Memo badge** if `notes.trim()` non-empty (`hasEventMemo`, 113): `span.absolute.-top-1.-start-1.w-4.h-4.rounded-full.bg-amber-500.text-slate-950.text-[10px].font-black.leading-none.flex.items-center.justify-center.border.border-amber-200.shadow-sm.pointer-events-none`, text `!`, `title="יש הערה — כדאי לקרוא"`, `aria-label="יש הערה"`. `-start-1` = top-right corner in RTL.
2. **Text column** `flex-1 min-w-0`:
   - Row `flex justify-between items-baseline gap-2`: `<h4 class="text-sm font-black text-slate-100">{title}</h4>` and time `text-[10px] font-mono font-black text-slate-500 shrink-0` = `HH:MM` of `e.timestamp` (`getHeberwTimeStr`, `hour12:false`, 2003–2010).
   - `p.text-xs.text-slate-300.font-medium.mt-1.leading-relaxed` = `{details}` (always rendered, even if empty).
   - Optional **big-nap badge** (SLEEP only, §2.6): `inline-flex items-center gap-1 mt-1.5 text-[10px] font-black text-indigo-300 bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-0.5 rounded-full` **"🌙 שנת צהריים גדולה"**.
   - Optional **top-up chip** (NUTRITION, BREAST, `nutrition.topUp` truthy): `inline-block mt-1.5 text-[10px] text-slate-400 font-bold bg-slate-950/60 px-2 py-0.5 rounded-full border border-slate-850/50` **"+{topUp.consumedMl} מ״ל"**.
   - Optional **notes box** if `e.notes` truthy (not trimmed — whitespace-only notes show the box but no `!` badge): `text-xs text-slate-500 bg-slate-950/40 px-2.5 py-1.5 rounded-xl mt-2 border border-slate-900/50 inline-block` **"📝 {notes}"**.
   - **Footer** `flex justify-between items-center mt-2.5 pt-2 border-t border-slate-850/45`:
     - `span.text-[9px].text-slate-500.font-bold`: SLEEP → `getSleepAttributionLabel(e)`; otherwise **"רשם: {parent name}"**.
     - If `e.quickRecorded`: `text-[9px] text-indigo-400 font-extrabold bg-indigo-950/45 border border-indigo-900/30 px-1.5 py-0.5 rounded-md` **"⚡ מהיר"**.

`getSleepAttributionLabel` (2032–2044): `nameStart` = name of `sleep.loggedByStart` or, if absent, of `loggedBy`.
- open (`!endAt`) and `loggedByStart` set → **"מתחיל: {nameStart}"**
- `loggedByStart` and `loggedByEnd` both set and different → **"התחיל: {A} · סיים: {B}"** (middle dot U+00B7)
- else → **"רשם: {nameStart}"**

### 2.6 Per-type rendering (title / details / icon / colours) (3280–3413)
Default before branching: icon `🍼`, `border-r-4 border-r-blue-500`, bg `bg-blue-950/20`, title `''`, details `''` (used if payload missing or type unknown). `•` separators are `" • "` (U+2022 with spaces). Missing numeric fields are interpolated raw (e.g. `"undefined"`), there is no fallback.

| Type / case | Icon | Border (start edge) | Row bg | Title | Details |
|---|---|---|---|---|---|
| NUTRITION, BOTTLE | `🍼` | `border-r-blue-500` | `bg-blue-950/15` | `bottleLiquidType === 'EXPRESSED_MILK'` → **"חלב שאוב בבקבוק"**, else **"תמ״ל (פורמולה)"** | **"הוצע: {amountOfferedMl} מ״ל • נצרך: {amountConsumedMl} מ״ל"**; if `spitUp` set and ≠ NONE append **" • פליטה קלה"** (LIGHT) or **" • הקאה"** (otherwise) |
| NUTRITION, BREAST (any non-BOTTLE) | `🤱` | `border-r-sky-500` | `bg-sky-950/15` | **"הנקה ישירה (שמאל)"** / **"(ימין)"** / **"(שני הצדדים)"** (LEFT / RIGHT / else) | **"משך: {durationMinutes} דקות"** (spit-up not shown for breast) |
| NUTRITION, either, `swallowingNoises` | — | — | — | — | append **" • 🦩 נשמעו קולות בליעה"** |
| DIAPER | `<DiaperIcon class="w-5 h-5 text-teal-400" strokeWidth=2.5>` | `border-r-teal-500` | `bg-teal-950/15` | PEE **"חיתול: שתן"**, POO **"חיתול: צואה"**, BOTH **"חיתול: שתן + צואה"** | Join with " • " of: (if not POO and `peeVolume`) LIGHT **"קל"** else **"רטוב כבד"**; (if not PEE and `pooAmount`) **"כמות {קטן / בינוני / גדול / גלישה}"** (SMALL / MEDIUM / else); (if not PEE and `pooColor`) **"צהוב חרדל" / "ירוק" / "חום"** (YELLOW_MUSTARD / GREEN / else). Texture is never shown. |
| SLEEP | from `getSleepCycleAnalysis` (below) | ACTIVE → `indigo-500`; BAD → `rose-500`; GOOD → `indigo-500`; EXCELLENT → `emerald-500` | ACTIVE `bg-indigo-950/15`; BAD `bg-rose-950/20`; GOOD `bg-indigo-950/15`; EXCELLENT `bg-emerald-950/15` | analysis text | **"משך: {h}ש {m}ד • תחילת שינה ב-{HH:MM start}"** then **" עד {HH:MM end}"** if `endAt`, else **" • עדיין ישן"**. Duration text is **"לא הוגדר"** when `durationMinutes` is 0/undefined. `h = floor(d/60)`, `m = d%60`, no zero padding (e.g. "1ש 5ד", "0ש 40ד"). |
| ACTIVITY | `🎨` | `border-r-amber-500` | `bg-amber-950/15` | **"פעילות: {activityName}"** | `cryingIntensity` truthy → **"מדד בכי/אי שקט: {n}/10"**, else (0/undefined) **"רגוע ושמח"** |
| WEIGHT | `⚖️` | `border-r-pink-500` | `bg-pink-950/15` | **"שקילה בקליניקה"** | **"משקל: {(g/1000).toFixed(3)} ק״ג ({g} גרם)"**; if `percentile` truthy append **" • אחוזון: {p}%"** |
| PUMPING | `🍼🤱` | `border-r-fuchsia-500` | `bg-fuchsia-950/15` | **"שאיבת חלב מונעת"** | **"שמאל: {L} מ״ל • ימין: {R} מ״ל (סה״ך: {L+R} מ״ל)"** (note spelling "סה״ך" with final kaf, kept as-is) |
| VOMITING | `🤮` | `border-r-rose-400` | `bg-rose-950/15` | **"תיעוד פליטה / הקאה"** | **"דרגה: {X}"**, X = SMALL **"פליטה קלה 💧"**, MEDIUM **"פליטה בינונית 💦"**, else **"הקאה גדולה ⚠️"** |
| SUPPLEMENT | `💧` | `border-r-emerald-500` | `bg-emerald-950/15` | `{supplement.name}` | **"נרשם ע״י {parent name}"** (footer also says "רשם: …", so the name appears twice) |

`getSleepCycleAnalysis(duration)` (183–226), called with `undefined` when the sleep is running (`!endAt`), else with `durationMinutes`:
- `undefined` → status ACTIVE, text **"שינה פעילה"**, icon `💤`
- `< 30` → BAD, **"מחזור שינה לא מוצלח"**, `❌`
- `< 45` → GOOD, **"מחזור שינה טוב"**, `👍`
- `>= 45` → EXCELLENT, **"מחזור שינה מצוין ומעולה!"**, `🌟`
- Edge: a closed sleep with `durationMinutes` undefined is passed `undefined` → renders as ACTIVE "שינה פעילה".

**Big-nap badge** rule (3359–3378): show on a SLEEP row only if it is closed with `durationMinutes`, its start (`startAt || timestamp`, local time) hour is in **[12, 16)** and duration **≥ 75 min**, and it is the **earliest-starting** such sleep on the same local calendar day (`toDateString()`), searched across all loaded `events` (not only the filtered window).

### 2.7 Quality-tier accent on rows (3415–3426, 70–111)
- `tier = getEventQualityTier(e, events)`; `showTierFace = shouldShowTierFace(e, tier, events)`.
- `shouldShowTierFace` is true only for: NUTRITION BOTTLE with `amountOfferedMl > 0`; NUTRITION BREAST with `durationMinutes > 0`; WEIGHT when a previous weight exists (an earlier-timestamped WEIGHT event in `events`, different id). **Always false for SLEEP and DIAPER** and all other types.
- When true, the start border colour becomes the tier colour (inline style, `borderRightWidth: 4`), replacing the per-type colour; the row bg stays the per-type bg. **No face icon is drawn in the timeline** — only the border colour changes. (Faces appear on dashboards, §3.)
- Tier rules (src/types.ts:128–181):
  - Nutrition BREAST: `<5` min BAD; `<=15` GOOD; else GREAT.
  - Nutrition BOTTLE: offered ≤ 0 → OKAY; pct = consumed/offered·100: `<50` BAD, `<80` OKAY, `<100` GOOD, else GREAT.
  - Sleep (closed only): `<30` BAD; `<=45` GOOD; else GREAT. **Note boundary mismatch** with the icon rule: at exactly 45 min the tier is GOOD but the icon/text is 🌟 EXCELLENT.
  - Diaper: HARD texture or LARGE_OVERFLOW → BAD; has pee & LIGHT → OKAY; has pee & HEAVY_SOAKED → GOOD; has poo → GOOD; else OKAY.
  - Weight: no previous → OKAY; lower → BAD; higher → GOOD; equal → OKAY.
- `TIER_MAP` (types.ts:121–126): BAD `var(--color-tier-bad)` "דורש תשומת לב"; OKAY `var(--color-tier-okay)` "סביר"; GOOD `var(--color-tier-good)` "טוב"; GREAT `var(--color-tier-great)` "מצוין".

### 2.8 Interactions
- Tap any event row → edit sheet (§4). The pinned sleeping card is not tappable.
- No swipe, long-press, drag, inline delete, or pagination ("load more").

---

## 3. Dashboards tab (`activeTab === 'dashboards'`, 3493–4540)

### 3.1 Layout, top to bottom
`div.flex.flex-col.gap-4`:
1. **Header row** `flex items-center justify-between`: `<h2 class="text-lg font-black text-slate-100">📊 דאשבורדים ומדדים</h2>` + range pill group (same markup/classes as Timeline's, §2.1) with options **`[1, 3, 7, 14]`** → **"היום"**, **"3 ימים"**, **"7 ימים"**, **"14 ימים"**. State `dashboardDays`, `useState(1)`, not persisted. No refresh button.
2. Six section cards, in this order: Nutrition → Sleep → Diapers → Pumping → Vomiting → Weight.

Each section: `<section class="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-sm space-y-4">` (Weight omits `space-y-4` and adds `mt-3` on its inner blocks).
- **Section header** `flex justify-between items-center border-b border-slate-850 pb-2`:
  - Start: `flex items-center gap-2` → `<h3 class="text-sm font-black text-{c}-300">{title}</h3>` + toggle button `px-2 py-0.5 text-[10px] font-black rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-750 cursor-pointer`: label **"הרחב 📂"** when collapsed, **"צמצם 📁"** when expanded; toggles `expandedDashboards[key]`.
  - End: a one-line summary (per section below).
- **Collapsed body** (default) `bg-slate-950/60 p-4 rounded-2xl border border-slate-850 space-y-3.5` → KPI tiles grid, optional split bar, footer with "latest" + a CTA button that sets expanded = true.
- **Expanded body**: per-day list/cards or bar chart. Lists scroll inside `max-h-[380px] overflow-y-auto pr-1` (sleep sequence `max-h-[350px]`).
- `expandedDashboards` initial: all six false (409–416). Kept for the session (switching tabs does not reset it).

KPI tile pattern: `bg-{c}-950/20 border border-{c}-900/20 p-2.5 rounded-xl text-center`; label `text-[10px] font-bold text-slate-400 block mb-0.5`; value `text-sm font-black text-{c}-300` with unit in nested `span.text-[10px]`. (4-column grids use `p-2` and `text-[9px]` labels.)
Split-bar pattern: label row `flex justify-between text-[9px] font-extrabold text-slate-400 px-1`; track `h-2 w-full bg-slate-900 rounded-full overflow-hidden flex`; segments `bg-* h-full transition-all` with `style.width = pct%`. In RTL the **first segment sits on the right**, matching the first label. Percentages are rounded independently (`Math.round`), so they can sum to 99/101.
Footer pattern: `flex justify-between items-center text-right pt-2 border-t border-slate-850/60`; left part `text-[10px]` with `span.text-slate-400.font-bold` **"אחרון: "** + value `text-{c}-200 font-extrabold` (or empty text `text-slate-500`); CTA `text-[10px] text-{c}-300 hover:text-{c}-100 font-black cursor-pointer bg-{c}-950/30 px-2 py-1 rounded-lg border border-{c}-900/30 transition-all`.
Day-group pill pattern (expanded lists): `text-[10px] font-black text-slate-400 bg-slate-950/40 px-2.5 py-1 rounded-lg inline-block` showing `dateStr` like **"יום ב׳, 16.11"**. Event cards in `grid grid-cols-2 gap-2`, each `p-3 rounded-2xl border {theme} flex flex-col justify-between shadow-sm cursor-pointer hover:opacity-85 transition-all`, `onClick → openEditSheet(e)`; top row `flex items-start justify-between` = icon (`text-lg` or `text-sm`) + time `text-[10px] font-extrabold text-slate-400`; body `mt-1.5 text-right` = `h4.text-xs.font-black.text-slate-100` + details `p.text-[10px].text-slate-400.mt-0.5.font-bold.leading-tight`.
Empty state for expanded lists: `p.text-xs.text-slate-500.text-center.py-6` **"אין נתונים לתקופה הנבחרת."** (exceptions noted per section).

### 3.2 Date range semantics and data sources
- `getCutoffDate()` (1057–1067): "baby day" starts at **06:00 local**; if now is before 06:00, today's baby day started yesterday 06:00. Cutoff = that start minus `(dashboardDays − 1)` days. So "היום" = since the latest 06:00; "3 ימים" = since 06:00 two days earlier; etc. No upper bound (includes up to now / future).
- **Two data paths**:
  1. **Client-side from `events`** (≤400 newest events; range-filtered by `timestamp >= cutoff`): all collapsed KPI tiles and split bars, all expanded day lists, the sleep sequence chart, vomiting header count. Helpers `getFeedingDashboardData` (1069), `getDiaperDashboardData` (1101), `getPumpingDashboardData` (1133), `getVomitingDashboardData` (1165), `getSleepTimelineData` (1196). Grouping key = he-IL short-date string of `timestamp` (sleep: of `sleep.startAt || timestamp`). Groups sorted newest day first; events within a day sorted **ascending** by time — except vomiting, which is sorted **descending** within the day (1186).
  2. **Server stats** via `fetchStats()` (1422–1440): four parallel GETs with `from = getCutoffDate().toISOString()`: `/api/stats/nutrition`, `/api/stats/sleep`, `/api/stats/diapers`, `/api/stats/weight`. Results go to `nutritionStats`, `sleepStats`, `diaperStats`, `weightStats`. Used for: Nutrition header counts, Sleep header totals, Sleep expanded bar chart, Diaper header counts, Weight header count and **both** Weight bodies. Non-OK responses are ignored silently (state keeps previous value, initially `[]`); exceptions only `console.error`. No loading indicator on this tab.
  - Response shapes (server.ts:416–592), all ascending by `date` (`YYYY-MM-DD`, Israel-local):
    - nutrition: `[{date, offered, consumed, delta, feedsCount, breastCount, bottleCount}]`
    - sleep: `[{date, totalMinutes, sessionCount, sessions:[{id,startAt,endAt,durationMinutes,location,loggedBy}]}]` (open session counted with duration up to now)
    - diapers: `[{date, pee, poo, both, total, pooColors[], pooTextures[]}]`
    - weight: `[{id, timestamp, date, weightGrams, percentile}]` ascending by timestamp
  - **Current observed behaviour (important for parity):** the client sends a full ISO string (`2026-11-16T04:00:00.000Z`), but the server's `parseIsraelDate` (server.ts:114–118) expects `YYYY-MM-DD` and builds `"<iso>T12:00:00Z"`; `Intl.DateTimeFormat.formatToParts` on that invalid date throws `RangeError: Invalid time value` (verified with Node). So all four stats endpoints currently answer **500**, and every stats-driven value shows its empty/zero form: Nutrition header "🍼 בקבוקים: 0 | 🤱 הנקות: 0", Sleep header "💤 0ש׳ 0ד׳ (0 פעמים)", Sleep bars → "אין נתונים לתקופה הנבחרת.", Diaper header "💦 0 | 💩 0 | 💦💩 0", Weight header "שקילות: 0", weight tiles "אין שקילה" / "+0.000 ק״ג", weight list "עדיין לא הוזנו שקילות רפואיות". The intended contract (plans/bugfix-audit-v1.md:42–78) is `from` as an Israel-local date string. Decide whether the rebuild replicates the bug or sends `YYYY-MM-DD`.
- Stats are refetched only when entering the tab or changing the range — not after an edit/delete made from a dashboard card. Client-side parts update immediately because `fetchEvents()` runs after edits.
- Averages always divide by `max(1, dashboardDays)` (the chosen range length), not by days that have data.

### 3.3 Section 1 — Nutrition "🍼 יומן תזונה מפורט" (3516–3701), colour family blue/sky
- Header end: `text-[11px] text-blue-400 font-extrabold` **"🍼 בקבוקים: {rangeBottleCount} | 🤱 הנקות: {rangeBreastCount}"** (sums of `bottleCount` / `breastCount` over `nutritionStats`, 2097–2098).
- Collapsed (client data):
  - Totals over range: `totalEvents` = all NUTRITION events; BREAST → `breastCount++`, `breastDuration += durationMinutes || 15` (**missing/0 duration counts as 15**); else → `bottleCount++`, `totalMl += amountConsumedMl || 0`.
  - 3 tiles (`grid-cols-3 gap-2.5`):
    1. blue: **"סה״כ בקבוק"** → **"{totalMl} מ״ל"**
    2. sky: **"סה״כ הנקות"** → **"{breastCount} ({breastDuration} ד׳)"**
    3. indigo: **"ממוצע יומי"** → **"{(totalEvents/days).toFixed(1)} ארוחות"**
  - Split bar (only if `totalEvents > 0`): labels **"הנקה ישירה ({breastPct}%)"** | **"האכלת בקבוק ({bottlePct}%)"**; segments `bg-sky-500` (breast) then `bg-blue-500` (bottle), each rendered only if pct > 0.
  - Footer: latest = first NUTRITION in `events` (newest overall, **not range-limited**). Text: **"{הנקה 🤱 | בקבוק 🍼} • {durationMinutes||15} דק׳ | {amountConsumedMl||0} מ״ל ({HH:MM})"**; none → **"אין נתונים"**. CTA **"גרף ופרטים 📊"**.
- Expanded: per-day groups (pill = date) → 2-col cards:
  - BREAST: theme `bg-sky-950/20 border-sky-900/40 text-sky-200`, icon `🤱`, title **"הנקה ישירה"**, details **"צד: {שמאל ⬅️ | ימין ➡️ | דו-צדדי 🔄} • {durationMinutes||15} דק׳"**.
  - BOTTLE (and missing feedType): theme `bg-blue-950/20 border-blue-900/40 text-blue-200`, icon `🍼`, title FORMULA → **"פורמולה / תמ״ל"**, else **"חלב אם שאוב"**; details **"נצרך: {consumed||0} מ״ל • הוצע: {offered||0} מ״ל"**.
  - Spit-up badge if `spitUp` ≠ NONE: `flex items-center gap-1.5 mt-1.5 text-[9px] text-rose-400 font-bold` with pulsing dot `w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse` + **"הקאה ⚠️"** (HEAVY_VOMIT) or **"פליטה קלה"**.
  - Tier: if a tier face applies (§2.7 rule), card gets `border-r-4` + inline style `borderRightColor: tierColour; backgroundColor: color-mix(in srgb, tierColour 10%, transparent)` (156–164), and a **tier badge** next to the icon: `w-6 h-6 rounded-lg flex items-center justify-center bg-slate-950 border` with `borderColor: tierColour`, `title` = Hebrew tier label, containing `IconTierFace` `w-4 h-4` (142–154).

### 3.4 Section 2 — Sleep "💤 שינה יומית" (3703–3936), colour family indigo/emerald/violet
- Header end: `text-[11px] text-indigo-400 font-extrabold` **"💤 {h}ש׳ {m}ד׳ ({count} פעמים)"** from `sleepStats` (sum `totalMinutes`, sum `sessionCount`; 2099–2102).
- Collapsed (client data from `getSleepTimelineData`):
  - `sleepCount`, `totalMinutes` (sum of item durations; running sleeps counted with minutes so far), location counts for CRIB/HANDS/CARRIER/STROLLER.
  - 3 tiles: indigo **"סה״כ שינה"** → **"{h}ש׳ {m}ד׳"**; emerald **"ממוצע ליום"** → **"{(totalMinutes/60/days).toFixed(1)} שעות"**; violet **"מס׳ תנומות"** → **"{sleepCount} פעמים"**.
  - If `sleepCount > 0`: label `text-[9px] font-bold text-slate-400 block px-1` **"מיקומי שינה פופולריים:"** + chips (`flex gap-1.5 flex-wrap`), one per location with count > 0, in fixed order CRIB, HANDS, CARRIER, STROLLER: `inline-flex items-center gap-1 bg-slate-900 border border-slate-800 text-[9px] font-extrabold text-slate-300 px-2 py-0.5 rounded-full` + dot `w-1.5 h-1.5 rounded-full` (CRIB `bg-indigo-500`, HANDS `bg-amber-500`, CARRIER `bg-teal-500`, STROLLER `bg-rose-500`) + **"{עריסה|ידיים|מנשא|עגלה} ({n})"**. Not sorted by popularity.
  - Footer label **"סטטוס: "** (not "אחרון"): if `openSleepSession` → `text-emerald-400 font-black animate-pulse` **"ישן כעת 💤 (התחיל ב-{HH:MM})"**; else latest closed SLEEP in `events` → `text-indigo-200 font-extrabold` **"קם ב-{HH:MM end} ({durationMinutes||0} דק׳)"**; none → **"אין נתונים קודמים"**. CTA **"גרפים ורצף 📊"**.
- Expanded part A — **daily totals bar chart** (server `sleepStats`): empty → "אין נתונים לתקופה הנבחרת."; else `space-y-3`, one row per stat (ascending date): `flex items-center gap-3` → date label `w-16 text-xs text-slate-300 font-bold truncate` showing raw **`YYYY-MM-DD`**; track `flex-1 bg-slate-950/40 h-5 rounded-lg border border-slate-850 overflow-hidden relative flex items-center pr-2`; fill `h-full bg-indigo-600/70 rounded-l transition-all duration-300` width = `min(100, round(totalMinutes / 960 * 100))%` (**target 16 h**); overlay label `absolute left-2 text-[10px] font-bold text-indigo-300` **"{(totalMinutes/60).toFixed(1)} שעות ({sessionCount} פעמים)"**.
- Expanded part B — **sleep/awake sequence chart** (client): wrapper `border-t border-slate-850 pt-3 mt-3`; header `flex justify-between items-center mb-3`: `h4.text-xs.font-black.text-violet-300` **"📊 תרשים רצף שינה ועירות (רצף ורווחים)"** + `span.text-[9px].text-slate-500.font-bold` **"מציג דפוסי עירות בין שינות"**. Empty → `text-[10px] text-slate-500 text-center py-4` "אין נתונים לתקופה הנבחרת.". Else per day (newest first) a card `bg-slate-950/30 p-3 rounded-2xl border border-slate-850/80 space-y-2.5` with date `text-[10px] font-extrabold text-slate-300`, then a vertical `flex flex-col gap-1.5` of items in start-time order, alternating:
  - **Sleep item** (tappable → edit): `border p-2.5 rounded-xl flex items-center justify-between shadow-sm cursor-pointer hover:opacity-85 transition-all border-r-4` with inline `borderRightColor: tier`, `borderColor: color-mix(in srgb, tier 35%, transparent)`, `backgroundColor: color-mix(in srgb, tier 12%, transparent)` where `tier = classifySleep(duration)` (applies to running sleeps too, using minutes so far). Start side: icon `text-base` = `getSleepCycleAnalysis(duration).icon` (never 💤, since duration is always defined here) + `span.text-xs.font-black.text-indigo-200` **"שינה • {duration} דקות"** + `span.text-[9px].text-indigo-400.block.font-bold.leading-none.mt-0.5` **"מיקום: {עריסה 🛏️ | על הידיים 🤱 | עגלה 🛒 | מנשא 🎒}"** (CRIB/HANDS/STROLLER/else) or **"מיקום: לא צוין"**. End side: `text-[10px] font-mono font-extrabold text-indigo-300 bg-indigo-950/50 px-2 py-1 rounded-md border border-indigo-500/20` **"{HH:MM start} - {HH:MM end}"**, or **"{start} - ישן כעת ⏰"** if running.
  - Duration = `durationMinutes || floor((end − start)/60000)` with `end = endAt || now`.
  - **Awake gap** between consecutive sleeps of the same day group only (not across days): `flex items-center justify-center gap-2 py-1.5 my-0.5 px-3 border border-dashed border-slate-800 rounded-xl bg-slate-900/30 text-[10px] text-slate-400 font-bold` → `🌱` (`text-emerald-400 animate-pulse`) + **"חלון עירות בין שינות:"** + `font-mono text-emerald-300 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/10` value: `gap = max(0, floor((nextStart − thisEnd)/60000))`; `h>0` → **"{h} ש׳ {m} דק׳"**, else **"{m} דק׳"**. Not tappable.

### 3.5 Section 3 — Diapers "🧷 יומן חיתולים" (3938–4125), colour family teal/cyan/amber/fuchsia
- Header end: `text-[11px] text-teal-400 font-extrabold` **"💦 {pee} | 💩 {poo} | 💦💩 {both}"** from `diaperStats` sums.
- Collapsed (client): counts PEE / POO / BOTH, total.
  - 4 tiles (`grid-cols-4 gap-2 text-center`, `p-2`, labels `text-[9px]`): cyan **"💦 רק פיפי"** → n; amber **"💩 רק קקי"** → n; fuchsia **"💦💩 שניהם"** → n; teal **"ממוצע יומי"** → `(total/days).toFixed(1)` (no unit).
  - Split bar if total > 0: labels (3 spans, justify-between) **"💦 פיפי ({p}%)"**, **"💦💩 שניהם ({b}%)"**, **"💩 קקי ({q}%)"**; segments in that order: `bg-cyan-400`, `bg-fuchsia-500`, `bg-amber-500` (each only if > 0).
  - Footer latest (first DIAPER in `events`): **"{💦 פיפי | 💩 קקי | 💦💩 פיפי וקקי} • {HH:MM}"**; none **"אין נתונים"**. CTA **"גרף ופרטים 📊"**.
- Expanded: per-day groups → 2-col cards (no tier styling here):
  - PEE (default): theme `bg-sky-950/20 border-sky-900/40 text-sky-200`, icon `💦`, title **"שתן בלבד"**
  - POO: `bg-amber-950/20 border-amber-900/40 text-amber-200`, `💩`, **"צואה בלבד"**
  - BOTH: `bg-teal-950/30 border-teal-900/40 text-teal-200`, `💦💩`, **"שתן וצואה"**
  - Details join " • ": (not POO, `peeVolume`) LIGHT **"קל"** else **"כבד מאוד 💦"** (differs from timeline's "רטוב כבד"); (not PEE, `pooAmount`) SMALL **"קטן"**, MEDIUM **"בינוני"**, else **"גלישה ⚠️"**.
  - Poo colour row (not PEE, `pooColor`): `flex items-center gap-1.5 mt-1.5 text-[9px] text-slate-400 font-bold` + dot `w-2.5 h-2.5 rounded-full border border-white/15` with YELLOW_MUSTARD `bg-amber-400`, GREEN `bg-green-600`, else `bg-amber-850` (**undefined class → no fill; BROWN dot renders transparent with only the faint border**) + **"צהוב חרדל" / "ירוק" / "חום"**.

### 3.6 Section 4 — Pumping "🍼🤱 יומן שאיבות חלב" (4127–4274), colour family fuchsia/purple/pink
- Header end: `text-[11px] text-fuchsia-400 font-extrabold` **"סה״ך שאיבות היום: {todayPumpingTotal} מ״ל"** — always the **current baby day** (since 06:00, `getBabyDayEvents`, 1040–1055, 2075–2078), **ignores the selected range**. Spelling "סה״ך" kept.
- Collapsed (client, range): `leftTotal`, `rightTotal`, `sessionCount`, `grand = L+R`, `avg = Math.round(grand/days)` (integer).
  - 3 tiles: fuchsia **"סה״כ נשאב"** → **"{grand} מ״ל"**; purple **"ממוצע ליום"** → **"{avg} מ״ל"**; pink **"מס׳ שאיבות"** → **"{n} פעמים"**.
  - Split bar if grand > 0: labels **"⬅️ שמאל: {L} מ״ל ({l}%)"** | **"ימין: {R} מ״ל ({r}%) ➡️"**; segments `bg-fuchsia-400` (left) then `bg-purple-500` (right), both always rendered. (Fallback pct 50/50 when grand = 0 is unused because the bar is hidden.)
  - Footer latest PUMPING: **"שמאל: {L} מ״ל | ימין: {R} מ״ל ({HH:MM})"**; none **"אין נתונים"**. CTA **"גרף ופרטים 📊"**.
- Expanded: per-day header is a full-width bar `flex justify-between items-center bg-slate-950/40 px-2.5 py-1.5 rounded-lg`: date `text-[10px] font-black text-slate-400` + `text-[10px] font-black text-fuchsia-400` **"יומי: {T} מ״ל (שמאל: {L} | ימין: {R})"**. Cards: `bg-fuchsia-950/20 border-fuchsia-900/30 text-fuchsia-200 … hover:bg-fuchsia-950/35` (hover changes bg, not opacity), icon `🍼` `text-sm`, title **"שאיבה"**, `p.text-[11px].text-fuchsia-300.mt-1.font-extrabold` **"שמאל: {L} מ״ל • ימין: {R} מ״ל"**, chip `text-[9px] bg-fuchsia-950 px-2 py-0.5 rounded-full inline-block mt-1 font-black text-fuchsia-100` **"סך הכל: {L+R} מ״ל"**.

### 3.7 Section 5 — Vomiting "🤮 יומן פליטות והקאות" (4276–4422), colour family rose/red
- Header end: `text-[11px] text-rose-400 font-extrabold` **"פליטות/הקאות שנרשמו: {n}"** — n = client count in the selected range.
- Collapsed: size = `vomiting.size || 'MEDIUM'`; counts SMALL / MEDIUM / LARGE.
  - 4 tiles: `bg-rose-950/10 border-rose-900/10` **"💧 קלה"**; `bg-rose-950/20 border-rose-900/20` **"💦 בינונית"**; `bg-red-950/30 border-red-900/30` **"⚠️ הקאה"** (value `text-red-300`); `bg-slate-950/20 border-slate-900/20` **"ממוצע יומי"** (value `text-slate-300`, `(n/days).toFixed(1)`). First two values `text-rose-300`.
  - Split bar if n > 0: labels **"💧 קלה ({s}%)"**, **"💦 בינונית ({m}%)"**, **"⚠️ הקאה ({l}%)"**; segments `bg-rose-300`, `bg-rose-500`, `bg-red-600`.
  - Footer latest: **"{פליטה קלה 💧 | פליטה בינונית 💦 | הקאה גדולה ⚠️} • {HH:MM}"**; none **"אין פליטות/הקאות"**. CTA **"פרטים 📊"**.
- Expanded: empty text **"לא נרשמו פליטות או הקאות בטווח הזמן שנבחר"**. Day header bar like pumping: date + `text-rose-400` **"כמות: {n}"**. Cards (newest first within the day): LARGE theme `bg-rose-950/20 border-rose-900/40 text-rose-200`, else `bg-slate-950/20 border-slate-850 text-slate-300`; icon `🤮` `text-sm`; title = size label; if notes → `p.text-[10px].text-slate-400.mt-1.italic.leading-tight.truncate` `{notes}`.

### 3.8 Section 6 — Weight "⚖️ מעקב משקל בקליניקה" (4424–4537), colour family pink/emerald
- Header end: `text-[10px] text-slate-400 font-bold` **"שקילות: {weightStats.length}"**.
- All data from server `weightStats` (range-limited, ascending).
- Collapsed: `latest` = last, `earliest` = first; `diff = latest − earliest` only if both truthy and different ids, else 0.
  - 2 tiles (`grid-cols-2 gap-2.5`): pink **"⚖️ משקל אחרון"** → **"{(g/1000).toFixed(3)} ק״ג"** or `text-xs text-slate-500` **"אין שקילה"**; emerald **"📈 שינוי מצטבר"** → `text-emerald-400` if diff ≥ 0 else `text-red-400`: **"{+ if ≥0}{(diff/1000).toFixed(3)} ק״ג"** (zero shows "+0.000 ק״ג"; negative shows "-0.120 ק״ג").
  - If `latest.percentile`: `bg-slate-900 border border-slate-850 p-2.5 rounded-xl flex justify-between items-center text-xs` → **"אחוזון גדילה נוכחי:"** (`text-slate-400 font-bold`) + **"אחוזון {p}%"** (`text-pink-300 font-black`).
  - Footer label **"תאריך שקילה: "** + he-IL short date of latest (`יום ב׳, 16.11`) or **"אין נתונים"**. CTA **"גרף גדילה 📊"** (despite the name, the expanded view is a list, not a graph).
- Expanded: empty → **"עדיין לא הוזנו שקילות רפואיות"**. Else rows (ascending) `flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-slate-850` (+ tier style/badge as in §3.3 when the matching event in `events` has a previous weight): start `⚖️` (`text-pink-400 font-extrabold`) + tier badge + raw date **`YYYY-MM-DD`** (`text-xs text-slate-300 font-bold`); end `text-left`: `text-base font-black text-slate-100` **"{kg.toFixed(3)} ק״ג"** + optional `text-[10px] text-slate-400 font-bold mr-1.5 bg-slate-800 px-1.5 py-0.5 rounded` **"אחוזון {p}%"**. Rows are **not** tappable.

---

## 4. Edit sheet and delete (opened from Timeline rows and dashboard cards)

### 4.1 Opening (`openEditSheet`, 1938–1987)
`resetForm()` then: `editingEvent = e`, `activeSheet = 'edit'`, `customTimestamp = Israel-wall-clock "YYYY-MM-DDTHH:mm"` of `e.timestamp` (`toLocaleString('sv-SE', {timeZone:'Asia/Jerusalem'})`, 282–285), `noteText = e.notes || ''`, and per type:
- NUTRITION: `bottleFeedType = feedType`. BOTTLE: liquid (default EXPRESSED_MILK), `offered = amountOfferedMl || 120`, `consumed = amountConsumedMl ?? offered`, `consumedManuallyEdited = consumed !== offered`. BREAST: side (default BOTH), duration `|| 15`, top-up shown and prefilled if present. Both: `spitUp || 'NONE'`, `swallowingNoises`.
- DIAPER: contains; peeVolume/pooAmount/pooColor/pooTexture only if present (else resetForm defaults).
- ACTIVITY: name; `cryingIntensity || 0`.
- WEIGHT: grams; `percentile || ''`.
- PUMPING: left/right ml. VOMITING: size.
- SLEEP: start/end as Israel wall-clock strings (end `''` if running); location `|| 'CRIB'`.

### 4.2 Modal frame (4905–4937)
- Overlay `fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4` (centred dialog, not a bottom sheet; tapping the overlay does nothing).
- Panel `w-full max-w-md bg-slate-900 border border-slate-800 rounded-[32px] p-5 shadow-2xl max-h-[92vh] overflow-y-auto z-50`.
- Header `flex items-center justify-between pb-4 border-b border-slate-800 mb-4`: `✏️` (`text-xl`) + `h3.text-base.font-black.text-slate-100` **"עריכת אירוע קיים"**; close button `p-1.5 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400` with lucide `X` `w-4 h-4` → `activeSheet = null` (no save, no confirm).
- Body is a `<form class="space-y-4">` submitting to `handleUpdateEvent`.

### 4.3 Body content, top to bottom (5815–6257)
1. Info box `p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-2xl`: `text-[11px] text-indigo-300 font-bold block mb-1` **"עריכת פרטי האירוע"**; `text-xs text-slate-400` **"סוג אירוע: <b class=text-slate-200>{eventType}</b> • נרשם ע״י {parent name}"** — `eventType` is the **raw English enum** (e.g. `NUTRITION`).
2. Type-specific editor:
   - **NUTRITION**: (a) swallowing toggle, full width `py-2.5 px-4 rounded-2xl text-xs font-black border flex items-center justify-between`: on `bg-blue-950 text-blue-300 border-blue-500 shadow-md`, off `bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200`; start `🦩` + **"קולות בליעה? (Swallowing noises?)"**, end `font-mono` **"כן ✓"** / **"לא"**. (b) segmented `grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl`: **"בקבוק"** | **"הנקה ישירה"**; selected class `bg-indigo-650 text-white` (**`indigo-650` is undefined → the selected segment has no background, only white text**), unselected `text-slate-400`. (c) BOTTLE panel `bg-slate-950/40 p-3 rounded-2xl border border-slate-850`: two number inputs **"הוצע (מ״ל)"** (changing it also sets consumed unless consumed was manually edited) and **"נצרך (מ״ל)"** (marks manual). BREAST panel: select **"צד הנקה"** options **"שמאל" / "ימין" / "שניהם"**; number **"משך זמן (דקות)"**; then top-up area: collapsed button **"+ תוסף בקבוק"** (`text-sky-400`); expanded → **"תוסף בקבוק"** + **"הסתר"** link, segmented **"חלב שאוב" | "פורמולה"** (selected `bg-slate-850 text-blue-300`, again undefined bg), stepper box **"כמות שנאכלה"** / **"{n} מ״ל"** with − / + buttons (`w-11 h-11`, step 10, clamp 0–300). Spit-up is not editable here (kept from state).
   - **DIAPER**: label **"חיתול מכיל"** + select **"שתן בלבד" / "צואה בלבד" / "שתן וצואה"**. If not POO: **"רטיבות החיתול (רטיבות שתן)"** 2 buttons **"רטיבות קלה"**, **"רטוב כבד / נפוח"**. If not PEE: **"כמות צואה"** → **"קטן / לכלוך"**, **"בינוני"**, **"גדול / גלישה"**; **"צבע צואה"** → **"צהוב חרדל 🟡"**, **"ירוק 🟢"**, **"חום 🟤"**; **"מרקם צואה"** (4-col) → **"גרגרי"**, **"נוזלי"**, **"משחתי"**, **"קשה"**. Selected `bg-slate-800 text-teal-300 border-teal-500`, else `bg-slate-950 border-slate-850 text-slate-400`.
   - **WEIGHT**: two number inputs **"משקל (גרם)"**, **"אחוזון"** (empty → no percentile).
   - **PUMPING**: **"⬅️ שד שמאל (מ״ל)"**, **"➡️ שד ימין (מ״ל)"**.
   - **VOMITING**: label **"דרגת/גודל הפליטה"**; 3 big buttons: 💧 **"פליטה קלה"** (selected emerald), 💦 **"פליטה בינונית"** (selected amber), ⚠️ **"הקאה גדולה"** (selected rose) — selected classes `bg-{c}-950/40 border-{c}-500/50 text-{c}-300 shadow-md`.
   - **SLEEP**: **"💤 שעת תחילת שינה (הלך לישון)"** + DateTime24; **"⏰ שעת התעוררות (הקיץ משנתו)"** + DateTime24 (empty for a running sleep: shows 00:00, no preview; picking a time fills today's date and so closes the sleep on save); **"📍 מיקום השכבה"** 2×2: **"🛌 עריסה"**, **"🤲 ידיים"**, **"🎒 מנשא"**, **"🛒 עגלה"** (selected `bg-indigo-950 text-indigo-300 border-indigo-500 shadow-md`).
   - **ACTIVITY / SUPPLEMENT**: no type-specific fields (only time + note).
3. Shared fields `space-y-3 pt-3.5 border-t border-slate-800/80`, `grid grid-cols-2 gap-3.5`: **"שעת האירוע"** + DateTime24 bound to `customTimestamp` (hidden for SLEEP edits); **"הערה חופשית (אופציונלי)"** text input, placeholder **"למשל: סירב לסיים, פלט מעט"** (spans both columns for SLEEP).
4. Actions `flex gap-3.5 pt-2`: submit `flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 rounded-2xl text-sm shadow-xl` **"שמור עדכונים"** (**"שומר..."** while submitting, disabled); delete `bg-rose-950/50 hover:bg-rose-900 border border-rose-900/60 text-rose-300 font-extrabold px-4 rounded-2xl text-xs` **"🗑️ מחק אירוע"**.

DateTime24 (src/components/DateTime24.tsx), as used here: preset chips **"עכשיו"**, **"לפני 15 דק׳"**, **"לפני שעה"**; date chips **"היום"**, **"אתמול"** + calendar icon button (`aria-label="בחר תאריך"`) opening a native `<input type="date">`; 24h time `HH : mm` (each opens a scroll list 00–23 / 00–59), chevrons nudge −5/+5 min (`aria-label` "הפחת 5 דקות" / "הוסף 5 דקות"); live preview in `text-emerald-400` with a check icon: **"יום א׳, 5 ביולי · 14:30"**. Value contract `YYYY-MM-DDTHH:mm` in Israel wall time.

### 4.4 Save (`handleUpdateEvent`, 1657–1757) → `PUT /api/events/{id}`
- Pre-check (BOTTLE): consumed > offered → toast **"כמות שנצרכה לא יכולה להיות גדולה מכמות שהוצעה"**, abort.
- Payload: `{timestamp, loggedBy (unchanged), notes: noteText.trim() || undefined}` + one type object:
  - NUTRITION: `{...existing nutrition, feedType, bottleLiquidType/amounts (BOTTLE only, else undefined), breastSide/durationMinutes (BREAST only), spitUp, swallowingNoises, topUp: BREAST ? (shown && >0 ? {liquidType, consumedMl} : null) : existing}`.
  - DIAPER: `{contains, peeVolume (not POO), pooAmount/pooColor/pooTexture (not PEE)}`.
  - ACTIVITY `{activityName, cryingIntensity}`; WEIGHT `{weightGrams, percentile?}`; PUMPING `{leftAmountMl, rightAmountMl}`; VOMITING `{size}`.
  - SLEEP: `{startAt, endAt, startLocation}` and `timestamp = startAt`. If the original had an end and the end field is empty → toast **"שדה סיום שינה לא יכול להיות ריק"** and abort (this path returns after `setSubmitting(true)` without resetting it, so the button would stay "שומר..."; practically unreachable because DateTime24 never emits an empty value).
- `timestamp` conversion: `new Date(customTimestamp).toISOString()` parses the Israel wall-clock string in the **browser's** timezone (correct only on devices set to Israel time).
- Server does a **shallow top-level merge** (`{...existing, ...body}`, server.ts:355–359) and recomputes sleep `durationMinutes = max(1, round((end−start)/60000))` or `undefined` if no end. Consequences of the current client: JSON drops `notes: undefined`, so **clearing a note does not remove it**; the SLEEP payload replaces the whole `sleep` object, so **`loggedByStart`/`loggedByEnd` are lost after any sleep edit** (attribution falls back to "רשם: …").
- Results: OK → toast **"האירוע עודכן בהצלחה"**, `resetForm()`, `fetchEvents()` (foreground → timeline spinner), `checkOpenSleepSession()`, close sheet. Non-OK → **"תקלה בעדכון האירוע"**. Network error → **"שגיאת תקשורת עם השרת"**. Always `submitting = false` afterwards.

### 4.5 Delete (1759–1778, 2503–2525) → `DELETE /api/events/{id}`
- "🗑️ מחק אירוע" sets `pendingDeleteId`; the edit modal stays open underneath.
- Confirm strip: `fixed bottom-24 left-0 right-0 z-50 px-4` → `max-w-md mx-auto bg-slate-900 border border-rose-900/60 rounded-2xl p-4 shadow-2xl`: `p.text-sm.font-bold.text-slate-100.text-center.mb-3` **"האם למחוק את האירוע הזה?"**; buttons (`flex gap-3`, each `flex-1 … font-extrabold py-2.5 rounded-xl text-sm`): **"מחק"** (`bg-rose-600 hover:bg-rose-500 text-white`) and **"ביטול"** (`bg-slate-800 hover:bg-slate-700 text-slate-200`, clears `pendingDeleteId`).
- Confirm: clears pending, calls DELETE (server soft-deletes; returns `{success, deletedId}` or 404). OK → toast **"האירוע נמחק בהצלחה"**, `fetchEvents()`, `checkOpenSleepSession()`, close the sheet. Non-OK → nothing happens (no toast; the sheet stays open). Network error → **"תקלה במחיקת האירוע"**. No undo for this delete.
- Toast colour is inferred from text (168–181): messages containing any of "בוטלה למניעת", "אירעה שגיאה", "לא ניתן", "לא יכול", "לא מוצלח", "שגיאה", "תקלה", "כבר נרשם", "❌" are error-styled; others success. Duration 3.5 s.

---

## 5. Design tokens

### 5.1 Tokens defined in `src/index.css` (`@theme`, lines 4–22)
| Token | Value | Used by |
|---|---|---|
| `--font-family-sans` | `'Heebo', 'Rubik', 'Assistant', system-ui, sans-serif` | `html, body { font-family: var(--font-family-sans) }` (index.css:26) |
| `--color-cat-nutrition` | `#F6C9A8` | defined, **not referenced anywhere in src** |
| `--color-cat-sleep` | `#C8C3E8` | not referenced |
| `--color-cat-diaper` | `#A8D8CE` | not referenced |
| `--color-cat-activity` | `#F4A8A0` | not referenced |
| `--color-cat-weight` | `#A8C5E0` | not referenced |
| `--color-tier-bad` | `#E5484D` | `TIER_MAP.BAD` (borders, faces, color-mix tints) |
| `--color-tier-okay` | `#F5A623` | `TIER_MAP.OKAY` |
| `--color-tier-good` | `#46A758` | `TIER_MAP.GOOD`; also hard-coded in the weight-scale glyph |
| `--color-tier-great` | `#30A46C` | `TIER_MAP.GREAT` |
| `--color-canvas` | `#FDFBF7` | not referenced (app is dark) |

Base layer (index.css:24–47): `html, body` background `#020617` (slate-950), text `#f1f5f9` (slate-100), `color-scheme: dark`. Scrollbars: 6px, track `#020617`, thumb `#1e293b` (hover `#334155`), radius 9999px.
Font: Heebo from Google Fonts, weights **400/500/700/800** only (index.css:1). The UI uses `font-black` (900) heavily → browser falls back to 800/synthesised.
Font caveat (Tailwind v4 semantics, not verified in a build because the repo has no `node_modules`/`dist`): v4's font utilities read `--font-*`, not `--font-family-*`, so the root `font-sans` class (2388) resolves to Tailwind's default stack (`ui-sans-serif, system-ui, sans-serif, emoji…`) and overrides the body's Heebo for everything inside the app root. Check in a browser before deciding which font to replicate.

`design-system.ts` contains no tokens; it only re-exports `DateTime24`, `InstallAppButton`, `SleepTimer`, and the glyphs from `components/icons.tsx`.

### 5.2 Undefined Tailwind classes in use (render as "no style")
Tailwind's palette has no 650/750/850 steps and `@theme` does not add them, so these produce no CSS: `border-slate-850` (very common: pill groups, section header rules, KPI panels, timeline rows), `border-slate-850/45`, `border-slate-850/50`, `border-slate-850/60`, `border-slate-750`, `bg-slate-850`, `bg-indigo-650`, `bg-amber-850`. Effects: in Tailwind v4 an element with `border` but no valid colour uses `currentColor` (inherited text colour, usually slate-100 near-white, or the card's text colour); a missing `bg-*` is transparent. For pixel parity, inspect the running app; for intent, they were meant as a step between 800 and 900 (e.g. `#172033`-ish for slate-850).

### 5.3 Tailwind palette steps in use (Tailwind defaults; hex = v3 values, v4 uses near-identical oklch)
- slate: 100 `#f1f5f9`, 200 `#e2e8f0`, 300 `#cbd5e1`, 400 `#94a3b8`, 500 `#64748b`, 700 `#334155`, 800 `#1e293b`, 900 `#0f172a`, 950 `#020617`
- indigo: 200 `#c7d2fe`, 300 `#a5b4fc`, 400 `#818cf8`, 500 `#6366f1`, 600 `#4f46e5`, 800 `#3730a3`, 900 `#312e81`, 950 `#1e1b4b`
- blue: 200 `#bfdbfe`, 300 `#93c5fd`, 400 `#60a5fa`, 500 `#3b82f6`, 900 `#1e3a8a`, 950 `#172554`
- sky: 200 `#bae6fd`, 300 `#7dd3fc`, 400 `#38bdf8`, 500 `#0ea5e9`, 900 `#0c4a6e`, 950 `#082f49`
- teal: 200 `#99f6e4`, 300 `#5eead4`, 400 `#2dd4bf`, 500 `#14b8a6`, 900 `#134e4a`, 950 `#042f2e`
- cyan: 300 `#67e8f9`, 400 `#22d3ee`, 900 `#164e63`, 950 `#083344`
- amber: 200 `#fde68a`, 300 `#fcd34d`, 400 `#fbbf24`, 500 `#f59e0b`, 900 `#78350f`, 950 `#451a03`
- fuchsia: 100 `#fae8ff`, 200 `#f5d0fe`, 300 `#f0abfc`, 400 `#e879f9`, 500 `#d946ef`, 900 `#701a75`, 950 `#4a044e`
- purple: 300 `#d8b4fe`, 500 `#a855f7`, 900 `#581c87`, 950 `#3b0764`
- pink: 200 `#fbcfe8`, 300 `#f9a8d4`, 400 `#f472b6`, 500 `#ec4899`, 900 `#831843`, 950 `#500724`
- rose: 200 `#fecdd3`, 300 `#fda4af`, 400 `#fb7185`, 500 `#f43f5e`, 600 `#e11d48`, 900 `#881337`, 950 `#4c0519`
- red: 300 `#fca5a5`, 400 `#f87171`, 600 `#dc2626`, 900 `#7f1d1d`, 950 `#450a0a`
- emerald: 300 `#6ee7b7`, 400 `#34d399`, 500 `#10b981`, 900 `#064e3b`, 950 `#022c22`
- violet: 300 `#c4b5fd`, 900 `#4c1d95`, 950 `#2e1065`
- green: 600 `#16a34a`; white; black (`bg-black/80` overlay)
Opacity suffixes (`/15`, `/20`, `/30`, `/35`, `/40`, `/45`, `/50`, `/60`, `/80`) are alpha on the colour.

### 5.4 Type scale, weights, radii, spacing in use
- Font sizes: `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-xs` 12px/16px, `text-sm` 14px/20px, `text-base` 16px/24px, `text-lg` 18px/28px, `text-xl` 20px, `text-2xl` 24px, `text-3xl` 30px. `font-mono` for times/durations.
- Weights: `font-medium` 500, `font-bold` 700, `font-extrabold` 800, `font-black` 900.
- Radii: `rounded` 4px, `rounded-md` 6px, `rounded-lg` 8px, `rounded-xl` 12px, `rounded-2xl` 16px, `rounded-3xl` 24px, `rounded-[32px]` (modal), `rounded-full`; `rounded-l` (sleep bar fill).
- Spacing: Tailwind 4px base (e.g. `p-3.5` 14px, `gap-2.5` 10px, `p-10` 40px, `py-16` 64px). Max widths `max-w-md` 28rem. Fixed heights: bottom nav `h-20` 80px; delete strip at `bottom-24` 96px.
- Shadows: `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`. Animations: `animate-pulse`, `animate-spin`, `transition-all`, `duration-300`.

### 5.5 Per-event-type colours and icons (as rendered in Timeline / Dashboards)
| Type | Timeline icon | Start-border | Row bg | Dashboard section accent (title `-300`, header `-400`) | Dashboard card theme |
|---|---|---|---|---|---|
| Bottle | 🍼 | blue-500 | blue-950/15 | blue | `bg-blue-950/20 border-blue-900/40 text-blue-200` |
| Breastfeed | 🤱 | sky-500 | sky-950/15 | (blue section) | `bg-sky-950/20 border-sky-900/40 text-sky-200` |
| Diaper | `DiaperIcon` teal-400, stroke 2.5 (dashboard cards use 💦 / 💩 / 💦💩) | teal-500 | teal-950/15 | teal (section title icon 🧷) | PEE sky, POO amber, BOTH `bg-teal-950/30 border-teal-900/40 text-teal-200` |
| Sleep | 💤 / ❌ / 👍 / 🌟 | indigo-500 (active, good), rose-500 (bad), emerald-500 (excellent); dashboard sequence uses tier colour | indigo/rose/emerald 950 at 15–20% | indigo | inline `color-mix` of tier colour (12% bg, 35% border) |
| Activity | 🎨 | amber-500 | amber-950/15 | — (no dashboard) | — |
| Weight | ⚖️ | pink-500 | pink-950/15 | pink | rows `bg-slate-950/40` |
| Pumping | 🍼🤱 | fuchsia-500 | fuchsia-950/15 | fuchsia | `bg-fuchsia-950/20 border-fuchsia-900/30 text-fuchsia-200` (card icon 🍼) |
| Vomiting | 🤮 | rose-400 | rose-950/15 | rose | LARGE rose, else slate |
| Supplement | 💧 | emerald-500 | emerald-950/15 | — | — |
| Unknown / missing payload | 🍼 | blue-500 | blue-950/20 | — | — |

Tier overlay (Nutrition with a measurement, Weight with a previous weighing): start-border = tier colour; on dashboards also a 10% tier tint background and the tier-face badge.

### 5.6 SVG glyphs (`src/components/icons.tsx`)
All `viewBox="0 0 24 24"`, default size `w-5 h-5` (tier face `w-6 h-6`). Only `DiaperIcon` and `IconTierFace` are used in App.tsx; the others are exported for the design system.
- `DiaperIcon({className, strokeWidth=2})`: outline, `stroke=currentColor`, round caps/joins, `display:inline-block; vertical-align:middle`; paths `M3 5h18`, `M3 5v5a9 9 0 0 0 18 0V5`, `M3 10c1.5 2 4.5 4 9 4s7.5-2 9-4`, `M7 5v3`, `M17 5v3`.
- `IconTierFace({tier})`: `style.color = TIER_MAP[tier].color`; background disc `r=10` fill currentColor opacity 0.2; ring `r=9` stroke 1.5. Expressions: BAD (worried brows, frown, tear dot at 9,14), OKAY (dot eyes r=1.2 at 9,10 / 15,10, flat mouth `M9 15h6`), GOOD (arched eyes, smile `M8.5 14.5c1.5 1.5 5.5 1.5 7 0`), GREAT (squint eyes, big smile stroke 1.75, sparkle ticks at the corners). Exact paths: icons.tsx:119–154.
- Others (unused in these tabs): `IconBreast`, `IconBottleExpressed` (liquid accents `#93C5FD`), `IconBottleFormula`, `IconPoo` (fills from `POO_GLYPH_FILL`: YELLOW_MUSTARD `#E8B923`, GREEN `#2D8A4E`, BROWN `#8B5A2B`), `IconPeeDrop` (fill `#60A5FA`, stroke `#3B82F6`), `IconWeightScale` (accent stroke `#46A758`), `IconSleepMoon`.
- Lucide icons used in these screens: `RefreshCw` (timeline refresh), `X` (modal close), `Plus`/`Minus` (top-up stepper), plus `Calendar`, `Check`, `ChevronLeft`, `ChevronRight` inside DateTime24.

### 5.7 Legend content (Settings → legend screen, App.tsx:117–140, 4543–4592; shown here because it defines the icon vocabulary)
Tier order BAD, OKAY, GOOD, GREAT with labels "דורש תשומת לב", "סביר", "טוב", "מצוין". Event legend entries: "הנקה ישירה" 🤱; "בקבוק (חלב שאוב / תמ״ל)" 🍼; "חיתול" DiaperIcon; "חיתול — שתן בלבד" 💦; "חיתול — צואה בלבד" 💩; "חיתול — שתן וצואה" 💦💩; "שינה — ישן עכשיו" 💤; "שינה — מחזור קצר" ❌; "שינה — מחזור טוב" 👍; "שינה — מחזור מצוין" 🌟; "שקילת משקל" ⚖️; "פעילות" 🎨; "שאיבת חלב" 🍼🤱; "פליטה / הקאה" 🤮; "יש הערה — כדאי לקרוא" (amber "!" badge).
