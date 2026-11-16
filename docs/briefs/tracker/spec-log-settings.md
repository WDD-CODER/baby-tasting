# Baby Tracker frontend: behaviour spec (Login, Shell, Log tab, Sheets, Sleep, DateTime24, Settings, PWA)

Source: `C:\coding projects\Cursor\baby-tracker` (read-only). Line refs are `src/App.tsx:N` unless another file is named.
Out of scope here: the timeline (`App.tsx:3202-3492`) and dashboards (`App.tsx:3493-4542`) tabs. Both of them open the **shared entry/edit sheet** described in §6 via `openEditSheet(e)`, so that sheet is specified here in full.

Conventions used throughout:
- The whole app is RTL (`dir="rtl"` on the root, `index.html` has `lang="he" dir="rtl" class="dark"`). It has a dark theme only. The font is Heebo (`src/index.css:1-5`).
- The "Israel wall-clock string" is `"YYYY-MM-DDTHH:mm"`, produced by `new Date().toLocaleString('sv-SE',{timeZone:'Asia/Jerusalem'}).replace(' ','T').slice(0,16)` (`App.tsx:282-285`, `DateTime24.tsx:33-37`). When saving, the app converts it with `new Date(str).toISOString()`, which parses it in the **browser's** local zone. A browser outside Israel gets a shifted time. This is the current behaviour; keep it.
- Icons: names are lucide-react unless marked "icons.tsx". Most event glyphs are emoji literals, and they are quoted below.
- Every API call is a same-origin `fetch` that relies on a session cookie. There are no auth headers.

---

## 0. API surface used by these screens

| Call | Used by | Notes |
|---|---|---|
| `POST /api/login` `{username,password}` | Login | 200 → `{parentType:'PARENT_A'|'PARENT_B', parentName}`. 401 means bad credentials. |
| `POST /api/logout` | Settings → logout | The response is ignored and local logout always proceeds (`1339-1350`). |
| `GET /api/settings` | Boot, after every settings save | 401 → unauthenticated. 200 → `UserSettings & {currentParent:{parentType,parentName}}`. |
| `PUT /api/settings` (partial body) | Parent names/default bottle, baby profile, custom activities, quick-action order | The server merges the partial body. |
| `GET /api/events?limit=400` | Boot, after every mutation, tab focus, Timeline tab tap | → `{events:[...], nextCursor}`, newest first. |
| `GET /api/sleep/open` | Boot, after edit/delete/undo/clear, tab focus | → the open SLEEP event or `null`. |
| `POST /api/sleep/toggle` | Quick sleep button; sleep sheet TIMER location buttons | See §5. |
| `POST /api/events` | Every create (quick and full) | The server assigns `id` (any client id is overwritten) and computes `sleep.durationMinutes` when `endAt` is set. |
| `PUT /api/events/:id` | Edit sheet save | |
| `DELETE /api/events/:id` | Edit sheet delete, toast "בטל" undo | |
| `POST /api/events/clear` `{}` or `{before: ISO}` | Settings data reset | |
| `GET /api/export/xlsx?from=YYYY-MM-DD&to=YYYY-MM-DD` | Settings export | Opened with `window.open(..., '_blank')`. |

Default settings (client initial state `320-326`, which matches the server default):
- `parentAName: 'אמא'`
- `parentBName: 'אבא'`
- `defaultBottleType: 'EXPRESSED_MILK'`
- `customActivities: ['שגרת בוקר','בייבי יוגה','שירים','טיול בעגלה','עיסוי תינוקות']`
- `babyProfile` and `quickActionOrder` are optional.

---

## 1. Boot, auth gate and global state

### 1.1 Boot sequence (`748-760`)
1. `authChecked=false`. While it is false, a full-screen centred `טוען...` shows (bold, slate-400, bg slate-950) (`2156-2162`).
2. `fetchSettings()` runs:
   - 401 → `handleUnauthorized()` (isAuthenticated=false, loggedInParentName='', activeParent='PARENT_A') and returns false.
   - 200 → stores settings (without `currentParent`) and copies them into the inputs: parentA/B names, default bottle type, baby name, DOB and birth weight (`?? ''` / `?? 0`). It also sets `bottleLiquidType` from `defaultBottleType` and reconciles `quickActionOrder` (§3.4). If `currentParent` is present it sets isAuthenticated=true, activeParent and loggedInParentName (`1353-1384`).
   - Network error → returns false with no toast.
3. If authed: `await fetchEvents()` then `await checkOpenSleepSession()`. Otherwise `loading=false`.
4. `authChecked=true`.

### 1.2 Any 401 at runtime
`fetchSettings`, `fetchEvents` and `checkOpenSleepSession` all call `handleUnauthorized()` on a 401. This flips the UI back to the Login screen and nothing else is cleared. Other calls (POST/PUT/DELETE) do not check for 401. They show their generic error toast instead.

### 1.3 Global state to port
| State | Default | Notes |
|---|---|---|
| `activeTab` | `'log'` | `'log'|'timeline'|'dashboards'|'settings'`. It is not persisted, so every app open starts on log. |
| `settingsScreen` | `'main'` | `'main'|'legend'`. It is reset to `'main'` whenever `activeTab !== 'settings'` (`769-773`). |
| `events` | `[]` | Newest-first list from the server, up to 400 items. |
| `openSleepSession` | `null` | |
| `activeParent` | `'PARENT_A'` | It is sent as `loggedBy` on creates. |
| `loggedInParentName` | `''` | Shown in the header pill. |
| `settings` | see §0 | |
| `carouselIndex` | `0` | It is reset to 0 whenever the log tab becomes active (`763-767`). |
| `currentTime` | `Date.now()` | Ticks **every 5 s** (`796-803`). Drives the countdowns, banners and awake widget. The sleep timer ticks separately at 1 s (§5.3). |
| `submitting` | false | Disables submit buttons only. Quick buttons are not disabled, except the Bio Gaya pill. |
| `toast` | null | `{message, variant:'success'|'error', undoEventId?}`. |
| `lastLoggedTimestamps` (ref) | `{}` | Double-submit guard, §1.5. |
| `dismissedBigNapWarning` / `dismissedBathWarning` | from localStorage `bt_dismissed_bignap_${new Date().toDateString()}` / `bt_dismissed_bath_...` === `'true'` | Both reset to false when the calendar day (`toDateString`) changes, checked on the 5 s tick (`806-813`). |
| `dismissedLongSleepWarning` | false | Reset whenever `openSleepSession?.id` changes (`788-790`). |
| `dismissedPumpingBfId`, `sentPumpingBfId`, `feedingNotificationSent` | null/null/false | In memory only. |

### 1.4 Refresh triggers
- `document.visibilitychange` → when `visible` and authenticated: `checkOpenSleepSession()` and `fetchEvents({background:true})`. Background mode does not toggle `loading` (`776-785`).
- The Timeline tab button calls `fetchEvents()` (`6281-6284`).
- After each mutation, see each handler.
- `fetchEvents` error (network) → toast `שגיאה בטעינת הנתונים מהשרת`.

### 1.5 Double-submit guard (`309-318`)
`checkAndRegisterDoubleSubmit(type)`:
- If the same `type` key was registered less than **10 000 ms** ago, it returns true and the action is cancelled with a toast.
- Otherwise it records `now` and returns false.

Keys:
- `NUTRITION` is shared by the quick meal and the bottle sheet.
- `DIAPER` is shared by the quick diaper and the diaper sheet.
- `VOMITING` is shared by the quick vomit and the vomiting sheet.
- `SLEEP` is shared by the quick sleep toggle and the **manual** sleep sheet save.
- `SUPPLEMENT` is used by Bio Gaya.
- `ACTIVITY`, `WEIGHT` and `PUMPING` are used by their sheets.

Subtleties to preserve:
- The guard registers **before** the bottle-amount validation (`1558-1565`). A bottle save rejected by validation therefore still blocks a retry for 10 s, and the retry shows the "duplicate" toast.
- The sleep-sheet TIMER location buttons (`handleSleepToggle`) have **no** guard.
- Edit (`handleUpdateEvent`) has no guard.

### 1.6 Toast (`1267-1280`, render `2469-2500`)
- Position and look: fixed top-6, horizontally centred, z-50, rounded-full, white bold text.
- Variant:
  - error → bg red-600 / border red-400, icon `AlertCircle`.
  - success → bg sky-600 / border sky-400, icon `Sparkles`.
- If the variant is not passed, it is **inferred** (`168-181`). The toast is `error` if the message contains any of `בוטלה למניעת`, `אירעה שגיאה`, `לא ניתן`, `לא יכול`, `לא מוצלח`, `שגיאה`, `תקלה`, `כבר נרשם`, `❌`. Otherwise it is success.
  - Consequence: the sleep "bad cycle" toast (contains `לא מוצלח` and `❌`) renders red.
- Auto-hide is 3500 ms, or **4000 ms** when it carries an undo. A new toast replaces the old one and resets the timer.
- Undo toast (`showUndoToast(id, msg)`): after the message it shows a `·` separator and an underlined button `בטל`. Tapping it:
  1. Clears the toast.
  2. Calls `DELETE /api/events/{id}`.
  3. ok → toast `הפעולה בוטלה`, then `fetchEvents()` and `checkOpenSleepSession()`.
  4. not ok → `לא ניתן לבטל את הפעולה`.
  5. network error → `שגיאה בביטול הפעולה` (`1282-1301`).

### 1.7 Notifications (browser `Notification` API)
- On mount, if the permission is `default`, the app calls `Notification.requestPermission()` (`847-851`).
- `sendLocalNotification(title, body)` (`824-844`):
  - If permission is granted, it calls `new Notification(title,{body,icon:'/favicon.ico'})` inside a try.
  - If permission is not denied, it asks for permission and then sends.
- The effect runs on every `currentTime`/`events` change (`938-973`):
  1. **Feeding overdue** (see §2.3): it sends `"זמן האכלה הגיע! 🍼"` / `"חלפו שעתיים מאז ההאכלה האחרונה. האכלה דחופה נדרשת!"` once, then sets `feedingNotificationSent=true`. The flag resets when the countdown is no longer overdue.
  2. **Pumping**: between hours 8 and 15 (`hrs>=8 && hrs<16`), with today's 08-16 pumping count below 3, and the latest BREAST feed at least 15 min old with no PUMPING after it, not dismissed and not already sent for this feed id. It sends `"שאיבת חלב מונעת 🍼🤱"` / `"חלפו 15 דקות מאז ההנקה האחרונה. הגיע הזמן לבצע שאיבה מונעת לשמירה!"` and sets `sentPumpingBfId` to the feed id.

---

## 2. Login screen (`2329-2385`)

Rendered when `authChecked && !isAuthenticated`. It is a full-screen bg slate-950, vertically centred, px-6. It holds one card (max-w-sm, bg slate-900, border slate-800, rounded-3xl, p-6).

Top to bottom:
1. A round avatar w-14 h-14, bg indigo-600, with the text `BT` (extrabold white).
2. An h1 `מעקב תינוק`.
3. A subtitle `התחברות למערכת`.
4. A form (`onSubmit=handleLogin`):
   - Label `שם משתמש`. `<input type="text" autocomplete="username" required placeholder="הזן שם משתמש">`.
   - Label `סיסמה`. `<input type="password" autocomplete="current-password" required placeholder="הזן סיסמה">`.
   - If `loginError` is set: a centred rose-400 bold xs line showing the error text.
   - A submit button, full width, indigo-600. Text `התחברות`, or `מתחבר...` while submitting, and disabled (opacity-60) while submitting.
5. Footer note (10px slate-500): `אין הרשמה באפליקציה — שני חשבונות הורים מוגדרים מראש בשרת (קובץ .env).`

Behaviour (`1309-1337`):
- The browser's `required` blocks an empty submit.
- Submit → `loginSubmitting=true`, `loginError=null`, then `POST /api/login`.
  - ok: set isAuthenticated, activeParent=`data.parentType` and loggedInParentName=`data.parentName`. Clear both inputs. Then `await fetchSettings(); await fetchEvents(); await checkOpenSleepSession();`.
  - not ok (any status): error `שם משתמש או סיסמה שגויים`.
  - network error: error `שגיאה בחיבור לשרת`.
- `loginSubmitting=false` in all cases.
- There is no "remember me" and no password reveal.
- **After logout and re-login, `activeTab` is not reset.** The user lands back on whatever tab they logged out from, normally `settings`.

---

## 3. App shell (authenticated) (`2387-2549`, `6265-6389`)

The root is `min-h-screen flex flex-col pb-24 select-none dir=rtl transition-all duration-700`, plus a **dynamic background class** (`getAppThemeBgClass`, `2119-2150`). The rules are evaluated in order:
1. Feeding overdue → gradient `from-red-950/80 via-slate-950 to-slate-950`.
2. Else, if a sleep is open:
   - During the nap slot (hours 12-15) → indigo gradient `from-indigo-950/90`.
   - Otherwise → plain `bg-slate-950`.
3. Else, if `awakeMinutes > awakeWidgetMinMinutes` (§4.4):
   - ≤ okayLimit → `from-yellow-950/60`.
   - ≤ yellowLimit → `from-orange-950/60`.
   - Bath time active and below the red limit → `from-amber-950/65`.
   - Otherwise → `from-rose-950/75`.
4. Else, during the nap slot → indigo gradient.
5. Else → `bg-slate-950`.

Text is always slate-100.

### 3.1 Top banners (in DOM order, above the header, not sticky)
1. **Feeding overdue** (`2391-2404`). Shown when `getFeedingCountdown().isOverdue`.
   - If a sleep is open: emerald/teal gradient, `🍼✨`, text `זמן האכלה הגיע, אך התינוק ישן כעת 💤. זוהי תזכורת ידידותית להאכיל כשיתעורר.`
   - Otherwise: red/rose gradient with `animate-pulse`, `🍼🚨`, text `עברו יותר משעתיים מאז הארוחה האחרונה! יש להאכיל את התינוק כעת.`
2. **Pumping reminder** (`2407-2431`). Shown when `checkPumpingReminderStatus()` (`899-925`) is true. The rule is the same as the notification in §1.7 but without the "sent" check.
   - Look: fuchsia gradient, `🤱🍼`, text `עברו 15 דקות מההנקה האחרונה. זהו הזמן המומלץ לשאיבת חלב מונעת (שאיבה {todayCount+1}/3 להיום).`
   - Button `בוצע! תיעוד שאיבה ✔️` calls `setActiveSheet('pumping')`. **It does not call `resetForm()`**, so the sheet opens with whatever values were left from the last form. `customTimestamp` may be `''`, in which case save uses now.
   - Button with icon `X` (title `בטל תזכורת זו`) sets `dismissedPumpingBfId` to the latest breast-feed id.
   - "Today's count" counts PUMPING events from today's calendar date with an hour in 8-15 (`880-890`).
3. **Long open sleep** (`2434-2458`). Shown when a sleep is open, has been open for more than 12 h (from `sleep.startAt || timestamp`), and has not been dismissed.
   - Look: amber gradient, `💤⏰`, text `האם התינוק עדיין ישן? האירוע פתוח מזה 12 שעות.`
   - Button `עריכת שעת סיום` calls `openEditSheet(openSleepSession)`.
   - Button `X` (title `סגור הודעה`) dismisses the banner.
4. **Midday nap window** (`2461-2466`). Shown whenever the hour is 12-15.
   - Look: indigo gradient, lucide `Moon` (indigo-400, pulse), text `צהריים טובים! חלון זמן מומלץ לשנת צהריים גדולה (12:00 - 16:00) 😴`.

### 3.2 Delete confirmation strip (`2503-2525`)
Shown when `pendingDeleteId` is set. It is fixed at bottom-24, z-50, max-w-md, card with a rose border.
- Text `האם למחוק את האירוע הזה?`.
- Button `מחק` (rose-600) calls `confirmDeleteEvent`.
- Button `ביטול` clears `pendingDeleteId`.

`confirmDeleteEvent` (`1763-1778`):
1. Clears the pending id.
2. Calls `DELETE /api/events/:id`.
3. ok → toast `האירוע נמחק בהצלחה`, `fetchEvents`, `checkOpenSleepSession`, close the sheet.
4. Not ok → **nothing happens**.
5. Network error → `תקלה במחיקת האירוע`.

The strip renders at z-50 above the sheet overlay (z-40).

### 3.3 Header (`2528-2546`)
- Sticky top-0, z-30, bg slate-900/85, backdrop-blur, bottom border. Inner content is max-w-md, centred, space-between.
- Right side (RTL start):
  - A w-10 indigo-600 circle with the text `BT`.
  - Title `מעקב תינוק`.
  - Subtitle (10px, uppercase, tracking-wider) `רפואי • {parentAName} ו-{parentBName}`.
- Left side: a pill `👤 {loggedInParentName}` (indigo-600/20 bg, indigo-200 text). The pill is display-only, and there is no parent switcher.

### 3.4 Bottom tab bar (`6266-6315`)
- Fixed bottom-0, h-20, bg slate-900, top border, `justify-around`, px-6. The class is `z-35`, which is a non-standard Tailwind value.
- Four buttons, each an emoji (text-xl) above a label (text-xs):
  1. `✍️` `רישום חדש` → `'log'`.
  2. `📋` `ציר זמן` → `'timeline'` and also `fetchEvents()`.
  3. `📊` `דאשבורדים` → `'dashboards'`. The dashboards stats fetch fires from an effect.
  4. `⚙️` `הגדרות וייצוא` → `'settings'`.
- Active tab: `text-indigo-400 scale-105 font-black`. Inactive: `text-slate-500 font-bold`.

### 3.5 Floating pills (fixed, z-30)
1. **Bio Gaya** (`6318-6339`). Position bottom-36 left-4.
   - Visible when the hour is 6-21 (`>=6 && <22`) and no SUPPLEMENT event exists in the current **baby day** (§4.0).
   - Look: emerald/teal gradient pill, `💧`, text `ביו גאיה — טרם ניתן`, and an inner button (`Check` icon) `נתתי`, disabled while `submitting`.
   - `handleLogBioGaya` (`462-491`):
     1. Guard key `SUPPLEMENT`. If it fires → toast `ביו גאיה כבר נרשם לאחרונה!`.
     2. `POST /api/events` `{timestamp:now ISO, eventType:'SUPPLEMENT', loggedBy, supplement:{name:'ביו גאיה'}}`.
     3. ok → `ביו גאיה נרשם ✔️` and `fetchEvents`. The toast has no undo.
     4. Not ok → `שגיאה בשמירת ביו גאיה`.
     5. Network error → `לא ניתן להתחבר לשרת`.
2. **Big nap missing** (`6342-6364`). Position bottom-24 right-4. The motion button bounces.
   - Visible when the hour is 12-15, `!isBigNapRecorded()` and not dismissed.
   - Look: violet/indigo gradient, `😴`, text `חסרה שנת צהריים גדולה 💤`, and a `✕` circle.
   - Tapping anywhere on the pill sets localStorage `bt_dismissed_bignap_${toDateString}`=`'true'`, dismisses it and shows the toast `ההתראה הוסתרה להיום ✔️`.
   - `isBigNapRecorded` (`992-1036`) is true if either condition holds:
     - A SLEEP event exists today (calendar `toDateString` of `timestamp`) whose start hour is 12-15 and whose duration (max of the stored value and the live value if it is the open one) is **≥ 75 min**.
     - The open sleep started in hours 12-15 and has run **≥ 60 min**.
3. **Bath time** (`6367-6389`). Position bottom-24 left-4. It pulses and has an amber glow.
   - Visible when the hour is 17-20 (`>=17 && <21`) and not dismissed.
   - Look: `🛁` (bouncing), text `זמן לאמבטיה היומית! 🧼🫧`, and `✕`.
   - Tap → localStorage `bt_dismissed_bath_${toDateString}`=`'true'`, toast `תזכורת האמבטיה הוסתרה ✔️`.
   - Bath-time-active (`isBathSlotTime && !dismissedBathWarning`) also changes the awake thresholds (§4.4).

Data-reset modals (§8.7) are also rendered at the shell level.

---

## 4. Log tab (`activeTab==='log'`)

The main column is `max-w-md mx-auto px-4 py-4 flex-col gap-4`. Top to bottom:
1. The "today" carousel (§4.1).
2. The quick action grid section (§4.2-4.5).
3. The daily diaper tracker (§4.6).
4. The daily pumping tracker (§4.7).
5. The Bio Gaya "given" card (§4.8).

### 4.0 "Baby day" definition (`1038-1055`)
The current baby day starts at **06:00 local** today. If the local hour is below 6, it started at 06:00 yesterday. `babyDayEvents` = events with `timestamp` ≥ that start, in server order (newest first). The browser local zone is used here.

### 4.1 Today carousel (`2552-2863`)
**Empty state** (when there are no baby-day events): a card with `☀️🌱` (pulse), heading `יום חדש ורענן!` and text `עדיין לא נרשמו פעילויות ליום זה (החל מ-6:00 בבוקר). השתמשו בכפתורים למטה כדי לתעד ארוחה, שינה או חיתול!`

**Otherwise**, a card with:
- **Header row:**
  - Right: `Clock` icon and `ציר זמן קרוסלה • {i+1} מתוך {N}`.
  - Left: a pill `{date he-IL weekday short, numeric day/month} • {HH:mm 24h}` of the active event.
- **Slider row**, three parts:
  - **Newer peek** (index−1), on the visual right side because the layout is RTL. It is a w-[12%] h-[110px] button at opacity 25%, showing a type glyph and the event's HH:mm. Tap → index−1.
    - Glyph map: NUTRITION `🍼`, DIAPER `DiaperIcon` (icons.tsx, teal), SLEEP `💤`, ACTIVITY lucide `Activity`, WEIGHT lucide `Scale`, PUMPING `🥛`, VOMITING `🤢`, otherwise `•`.
    - At index 0 it is a faded dashed placeholder.
  - **Centre card**: a motion div with `drag="x"`, constraints 0/0 and elastic 0.4.
    - Drag offset > +40 px → newer (index−1, if > 0). Offset < −40 px → older (index+1).
    - Enter/exit animation: x ±20 with opacity, 150 ms.
    - **Click → `openEditSheet(activeEvent)`.**
  - **Older peek** (index+1), mirrored.
- **Centre card content:**
  - A 44 px rounded badge with the icon on a type colour.
  - Title (truncate) and a "time ago" pill (`formatTimeAgo`, `1990-2001`):
    - `ממש עכשיו` (under 1 min)
    - `לפני {m} דק׳`
    - `לפני {h} ש׳ ו-{m} דק׳` (under 24 h)
    - `לפני {d} ימים`
  - The details line, then the notes chip `💬 {notes}` (only if not quickRecorded and notes exist).
  - Footer: `נרשם ע״י {parent name}` and on the left `הגדרות ⚙️` if quickRecorded, otherwise `לחץ לעריכה ✏️`.
- Title, details and badge by type (`2577-2709`):
  - **NUTRITION BOTTLE**
    - Icon and badge: `🍼`, blue-600.
    - Title: `חלב שאוב` if EXPRESSED_MILK, otherwise `תמ״ל (פורמולה)`.
    - Details: `נצרך: {consumed} מ״ל מתוך {offered} מ״ל`, plus ` • פליטה קלה` or ` • הקאה` when spitUp is not NONE.
  - **NUTRITION BREAST**
    - Icon and badge: `🤱`, sky-500.
    - Title: `הנקה`.
    - Details: `צד: {שמאל|ימין|שני הצדדים} • {min} דקות`.
  - **DIAPER**
    - Icon and badge: `DiaperIcon` (white, strokeWidth 2.5), teal-500.
    - Title: `חיתול: שתן` / `חיתול: צואה` / `חיתול: שתן וצואה`.
    - Details: joined with ` • ` from these parts:
      - pee volume, when not POO: `קל` or `רטוב כבד`
      - poo amount, when not PEE: `כמות קטנה` / `כמות בינונית` / `גלישה ⚠️`
      - poo colour, when not PEE: `צהוב חרדל` / `ירוק` / `חום`
  - **SLEEP**: uses `getSleepCycleAnalysis(running?undefined:duration)` (`183-226`).
    - Running: `💤` `שינה פעילה`, indigo badge with pulse.
    - Under 30 min: `❌` `מחזור שינה לא מוצלח`, rose.
    - 30-44 min: `👍` `מחזור שינה טוב`, emerald.
    - 45 min or more: `🌟` `מחזור שינה מצוין ומעולה!`, violet.
    - Details: `מיקום: {עריסה|על הידיים|מנשא|עגלה} • ` (only if there is a location), then `משך: {h}ש׳ {m}ד׳`, or `ישן כעת` when the duration is falsy.
  - **ACTIVITY**
    - Icon and badge: `🎨`, amber-500.
    - Title: `פעילות: {name}`.
    - Details: `מדד בכי ואי שקט: {n}/10`, or `רגוע ושמח` when the intensity is 0 or falsy.
  - **WEIGHT**
    - Icon and badge: `⚖️`, pink-500.
    - Title: `שקילה רפואית`.
    - Details: `{kg.toFixed(3)} ק״ג ({g} גרם)`, plus ` • אחוזון {p}` when a percentile is set.
  - **PUMPING**
    - Icon and badge: `🍼🤱`, fuchsia-600.
    - Title: `שאיבת חלב מונעת`.
    - Details: `שמאל: {L} מ״ל • ימין: {R} מ״ל (סה״ך: {L+R} מ״ל)`.
  - VOMITING and SUPPLEMENT have **no branch**. They fall through with the defaults: icon `🍼`, blue badge, empty title and empty details. This is a known gap; preserve or decide.
  - **quickRecorded overrides** (applied after the type branch, and details are cleared):
    - NUTRITION: `הנקה 🤱` for BREAST, otherwise `האכלה 🍼`. Quick meals have no `nutrition` object, so they get `האכלה 🍼`.
    - DIAPER: `חיתול מהיר: {שתן|צואה|שתן וצואה}`.
    - SLEEP: `שינה 💤`, `💤`, indigo.
- **Dots row:** one dot per event for the first 8 events (the active dot is w-4 indigo-500, the others w-1 slate-800). If there are more than 8, it adds `+{N-8}`.
- Index is clamped: `safeIndex = clamp(carouselIndex, 0, N-1)`.

### 4.2 Quick-action grid: container and fixed rows (`2870-3027`)
`<section class="grid grid-cols-2 gap-3">`. The fixed (not reorderable) items appear first, in this order:
1. The **quick vomiting panel** (if open).
2. The **quick diaper panel** (if open). Both can be open at the same time.
3. The **awake widget** (if shown).
4. The **reorder toggle**.
5. Then the reorderable buttons.

**Quick vomiting panel** (col-span-2, rose border, motion scale/opacity, 150 ms):
- Header: a pinging rose dot and `רישום פליטה מהירה (הקלק לבחירה)`, plus an `X` close button.
- Three tiles:
  - `💧` `פליטה קלה` → `handleQuickVomitingLog('SMALL')`
  - `💦` `פליטה בינונית` → `'MEDIUM'`
  - `⚠️` `הקאה גדולה` → `'LARGE'`

**Quick diaper panel** (teal border):
- Header: `רישום חיתול מהיר (הקלק לבחירה)` and an `X`.
- Three tiles:
  - `💦` `פיפי בלבד` → `PEE`
  - `💩` `קקי בלבד` → `POO`
  - `💦💩` `שניהם יחד` → `BOTH`

**Reorder toggle** (col-span-2, aligned to the RTL start):
- Normal mode: a pill `⠿ ערוך פריסה`, slate. Tap → `reorderMode=true`.
- Reorder mode: a pill `✓ סיום ושמירה`, amber. Tap → `handleSaveQuickActionOrder` (§4.5).

### 4.3 Reorderable quick buttons (`2164-2327`, `3030-3043`)
- Rendered in `quickActionOrder` order. The default order is `['meal','diaper','sleep','activity','weight','vomiting']` (`230-231`).
- **`sleep` always spans 2 columns.** The others take 1.
- Press model for meal, diaper, sleep and vomiting (`624-718`). Pointer events are used, `touch-none select-none`, and the context menu is suppressed:
  - pointerdown (primary button only) starts a **550 ms** timer.
  - When the timer fires: `navigator.vibrate(50)`, then open the full sheet: meal→`bottle`, diaper→`diaper`, sleep→`sleep`, vomiting→`vomiting` (via `openAddSheet`, which calls `resetForm`).
  - pointerup before 550 ms counts as a short press:
    - meal → `handleQuickMealLog`
    - diaper → **toggle** the quick diaper panel
    - sleep → `handleQuickSleepToggle`
    - vomiting → **toggle** the quick vomiting panel
  - Moving more than 10 px in x or y (on move or up), pointercancel, or pointerleave cancels with no action.
  - While pressed, the button gets `scale-95` and a coloured border.
- activity and weight are plain `onClick` buttons → `openAddSheet('activity'|'weight')`.
- In reorder mode, all handlers are removed. Each wrapper becomes a dnd-kit sortable (PointerSensor, `rectSortingStrategy`, the dragged item at opacity 0.4, cursor-grab).

Button contents:
- **meal** (min-h 125, blue). Top to bottom:
  - Tile `🍼`.
  - Title `ארוחה / בקבוק`.
  - Counts line `🍼 בקבוקים: {todayBottlesCount}` `|` `🤱 הנקות: {todayBreastCount}` (baby-day BOTTLE/BREAST counts; quick meals have no feedType, so they count in neither).
  - Hint `קליק: ארוחה מהירה 🍼 | החזק: מלא 🤱`.
  - A countdown pill (`854-874`). It counts from the newest NUTRITION event's timestamp plus **2 h**. With no NUTRITION ever, it shows `02:00:00` and is not overdue.
    - Not overdue: `האכלה הבאה: HH:MM:SS` (slate). It updates every 5 s, so the seconds jump.
    - Overdue and asleep: `הגיע זמן האכלה (תינוק ישן 💤)` (emerald).
    - Overdue and awake: `האכלה דחופה! 🚨` (red, pulse).
- **diaper** (teal):
  - Tile `🧷`.
  - Title `החלפת חיתול`.
  - Counts `💦 {pee}` | `💩 {poo}` | `💦💩 {both}` (baby day).
  - Hint `קליק: מהיר 💦💩 | החזק: מלא 📋`.
- **sleep** (col-span-2, min-h 90, horizontal layout):
  - No open sleep: bg indigo-650. A white tile with an indigo lucide `Moon`. Title `השכבה לישון 💤`. Hint `קליק מהיר: שינה מהירה עכשיו 💤 | החזק: בחירת מיקום 📋`. The left side shows `ער`.
  - Open sleep: bg rose-950/70 with a rose border. A rose-500 tile with a white `Moon` (pulse). Title `להעיר תינוק ⏰`. Hint `קליק מהיר להעיר ⏰ | החזק להגדרת שינה`. The left side shows the `<SleepTimer startAt={sleep.startAt||timestamp}/>` mono clock.
- **activity** (amber): tile `🎨`, label `תיעוד פעילות`.
- **weight** (pink): tile `⚖️`, label `שקילה רפואית`.
- **vomiting** (rose): tile `🤮`, title `פליטות / הקאות`, hint `קליק: מהיר 🤮 | החזק: מלא 📋`.

### 4.4 Awake-time widget (`2971-3013`, thresholds `2107-2117`)
- `lastWakeUp` = `endAt` of the **first** event in `events` (newest first) that is a SLEEP with `endAt`.
- `awakeMinutes = floor((currentTime - lastWakeUp)/60000)`. It is 0 if there is no completed sleep.
- Bath time active (§3.5) switches the threshold set:

| Threshold | Normal | Bath time active |
|---|---|---|
| Widget shows when awake > | 35 | 45 |
| okayLimit | 45 | 60 |
| yellowLimit | 60 | 75 |
| redLimit | 60 | 90 |

- The widget shows only when no sleep is open and `awakeMinutes > widgetMin`. It is col-span-2.
- States, in priority order:
  1. ≤ okay: yellow, `👶🙂`, `זמן עירות תקין ⚡`.
  2. ≤ yellow: orange, `👶🥱`, `חלון שינה בקרוב! 🥱`.
  3. Bath active and below red: amber with pulse, `👶🛀`, `זמן התארגנות לשינה / סיום אמבטיה 🛁`.
  4. Otherwise: rose with pulse, `👶😫`, `עייפות יתר! להרדים מיד ⚠️`.
- Small label above the heading: `מעקב זמן עירות`.
- Left side: the label `משך זמן ער` and either `{h}ש׳ {m}ד׳` (if at least 1 h) or `{m} דק׳`.

### 4.5 Quick-action order persistence
- **Load:** `reconcileQuickActionOrder(saved ?? [])` (`233-238`) keeps the known ids in saved order, drops unknown ids, then appends any missing ids in default order.
- **Drag end:** `arrayMove` in local state. Nothing is saved until "save".
- **Save** (`730-745`):
  1. Leave reorder mode.
  2. `PUT /api/settings {quickActionOrder}`.
  3. ok → toast `סדר הכפתורים נשמר` and `fetchSettings()`.
  4. Not ok → no toast, but the local order stays.
  5. Network error → `שגיאה בשמירת הסדר`.
- Quick-action order is edited **only on the Log tab**. The Settings tab has no order control.

### 4.6 Quick logging handlers
All of these POST `/api/events`. The client sends an `id`, but the server overwrites it, and the returned `data.id` is used for undo.
- **Quick meal** (`493-529`):
  1. Guard key NUTRITION. If it fires → `נרשמה ארוחה ב-10 השניות האחרונות! הפעולה בוטלה למניעת כפל.`
  2. Payload `{timestamp:now, eventType:'NUTRITION', loggedBy, notes:'', quickRecorded:true}`. It has **no `nutrition` object**.
  3. ok → undo toast `ארוחה מהירה נרשמה 🍼`, then `fetchEvents`.
  4. Not ok → `תקלה ברישום ארוחה מהירה`.
  5. Network error → `שגיאת תקשורת עם השרת`.
- **Quick diaper(contains)** (`531-575`):
  1. Guard key DIAPER. If it fires → `נרשם חיתול ב-10 השניות האחרונות! הפעולה בוטלה למניעת כפל.`
  2. Payload `{..., eventType:'DIAPER', quickRecorded:true, diaper:{contains}}`.
  3. ok → undo toast `חיתול נרשם: {פיפי 💦|קקי 💩|פיפי וקקי 💦💩}`, then close the panel.
  4. Not ok → `תקלה ברישום חיתול מהיר`.
  5. Network error → `שגיאת תקשורת עם השרת`.
  6. The panel stays open on error.
- **Quick vomiting(size)** (`577-622`):
  1. Guard key VOMITING. If it fires → `נרשמה פליטה ב-10 השניות האחרונות! הפעולה בוטלה למניעת כפל.`
  2. Payload `vomiting:{size}`, quickRecorded.
  3. ok → undo toast `פליטה נרשמה: {פליטה קלה 💧|פליטה בינונית 💦|הקאה גדולה ⚠️}`, then close the panel.
  4. Not ok → `תקלה ברישום פליטה מהירה`.
- **Quick sleep toggle**: see §5.1.

### 4.7 Daily diaper tracker (`3048-3111`)
- Card header: `🧷` `סבב חיתולים יומי (היום)` and a pill `{n} חיתולים`.
- `todayDiapers` = baby-day DIAPER events **reversed** (oldest first).
- When there is at least one diaper: a 3-column summary:
  - `💦 שתן בלבד` count (blue)
  - `💩 צואה בלבד` (amber)
  - `💦💩 שניהם` (teal)
- Empty: `לא נרשמו חיתולים היום (החל מ-6:00 בבוקר)`.
- Otherwise: a horizontal scroll row of chips. Each chip shows `💦`/`💩`/`💦💩` in a type colour above HH:mm, with tooltip `נרשם ע״י {name}`. Tap → `openEditSheet`.

### 4.8 Daily pumping tracker (`3114-3177`)
- Header: `🍼🤱` `שאיבות חלב יומיות (היום)` and a button `תיעוד שאיבה יזומה +` → `openAddSheet('pumping')`.
- Baby-day PUMPING events, reversed.
- Summary:
  - `⬅️ שד שמאל` `{L} מ״ל`
  - `➡️ שד ימין` `{R} מ״ל`
  - `🔄 סך הכל` `{T} מ״ל`
- Empty: `לא נרשמו שאיבות היום (שאיבות מונעות ורגילות)`.
- Chips: `🍼`, `{total} מ״ל`, `{L}L / {R}R`, HH:mm. Tap → edit.

### 4.9 Bio Gaya given card (`3180-3197`)
Shown only if there is a baby-day SUPPLEMENT event. It uses the first one found (newest).
- Look: emerald card, `💧` `ביו גאיה`, a pill `✓ ניתן ב-{HH:mm}`, and the parent display name. It is display-only.

---

## 5. Sleep: toggle flow, timer, edge cases

### 5.1 Quick sleep (short press on the sleep button) (`1511-1543`)
1. Guard key SLEEP. If it fires → `שונה מצב שינה ב-10 השניות האחרונות! הפעולה בוטלה למניעת כפל.`
2. `POST /api/sleep/toggle {quickRecorded:true}`.
3. The server (`server.ts:226-281`):
   - If an open session exists, it closes it with `endAt=now`, `durationMinutes=max(1, round(minutes))`, `loggedByEnd=current parent`, and quickRecorded=true when quick.
   - Otherwise it creates a SLEEP event with `startAt = customStartAt ?? now`, `endAt:null`, `loggedByStart`, and `startLocation` only if one is given (quick sends none).
4. The client:
   - If the response has `sleep.endAt` → toast `בוקר טוב! {analysis.toastMsg}` and `openSleepSession=null`. toastMsg is `השינה הסתיימה. מחזור שינה לא מוצלח ({d} דק׳) ❌` / `השינה הסתיימה. מחזור שינה טוב ({d} דק׳) 👍` / `השינה הסתיימה. מחזור שינה מצוין ומעולה! ({d} דק׳) 🌟` (thresholds 30 and 45).
   - Otherwise → `לילה טוב! שינה מהירה החלה 💤` and set the open session.
   - Then `fetchEvents`.
5. Not ok → **no toast**. Network error → `שגיאה בשינוי מצב שינה מהיר`.
6. There is no undo toast for sleep.

### 5.2 Long press → sleep sheet (§6.4). TIMER location buttons → `handleSleepToggle(location)` (`1477-1509`)
1. `POST /api/sleep/toggle {startLocation, customStartAt: customTimestamp ? new Date(customTimestamp).toISOString() : undefined}`.
2. Response handling:
   - Closed → `openSleepSession=null` and toast `analysis.toastMsg`, without the "בוקר טוב" prefix.
   - Started → set the open session and toast `השינה החלה! שעון מעקב מופעל`.
   - Then `fetchEvents` and close the sheet.
3. Not ok → no toast and the sheet stays open. Network error → `שגיאה בשינוי מצב שינה`.
4. There is no double-submit guard, but the buttons are not disabled either.

**Edge cases when a sleep is already open:**
- Long press still opens the same sleep sheet. Nothing in the sheet reflects the open session.
- In TIMER mode, tapping **any location button closes the open sleep at server "now"**. The chosen start time and location are ignored on close.
- In MANUAL mode, saving creates a *separate* completed SLEEP via `POST /api/events`. The server only auto-closes an open session when the new sleep has `endAt === null` (`server.ts:316-324`), so the open sleep stays open and the two overlap.
- The open session is also editable through the edit sheet (§6.9). There you can leave the end empty to keep it open, or set an end to close it.
- The long-open (>12 h) banner offers edit (§3.1).
- An open sleep also changes:
  - the sleep button styling (§4.3)
  - the overdue-feeding banner and meal-button pill copy (§3.1, §4.3)
  - the app background (§3)
  - hides the awake widget (§4.4)
  - counts toward the big-nap check (§3.5)

### 5.3 SleepTimer (`src/components/SleepTimer.tsx`)
- Props: `startAt?: ISO`.
- It renders bare text `HH:MM:SS` of elapsed time since `startAt` and updates **every 1000 ms**, with its own interval so only this node re-renders.
- `startAt` missing or in the future → `00:00:00`.
- Hours are not capped (for example `13:05:09`).

---

## 6. Entry sheet (shared modal for create and edit)

### 6.1 Container (`4905-4937`)
- Shown when `activeSheet !== null`.
- Full-screen overlay `fixed inset-0 bg-black/80 z-40`, with the card **centred** (not bottom-anchored despite the "sheet" name): max-w-md, bg slate-900, rounded-[32px], p-5, max-h-[92vh], overflow-y-auto.
- Header: an emoji and title per sheet type (table below), plus a round close button with `X` → `setActiveSheet(null)`.
- Closing does not reset the form.
- Tapping the backdrop does **not** close the sheet, and there is no Esc handler.

| activeSheet | Emoji | Title |
|---|---|---|
| bottle | 🍼 | `תיעוד ארוחה / הנקה` |
| diaper | 🧷 | `תיעוד החלפת חיתול` |
| activity | 🎨 | `תיעוד פעילות` |
| weight | ⚖️ | `שקילת משקל רפואי` |
| pumping | 🍼🤱 | `שאיבת חלב מונעת` |
| vomiting | 🤮 | `תיעוד פליטה / הקאה` |
| sleep | 💤 | `תיעוד שינת תינוק` |
| edit | ✏️ | `עריכת אירוע קיים` |

The body is one `<form>` whose submit runs `handleUpdateEvent` for edit and `handleCreateEvent` otherwise.

### 6.2 Defaults: `resetForm()` (`1877-1931`), called by `openAddSheet` and `openEditSheet`
| Field | Default | Notes |
|---|---|---|
| `noteText` | `''` | |
| `customTimestamp` | Israel now string | |
| `customSleepStartAt` | now − 60 min | |
| `customSleepEndAt` | now | |
| `sleepLocation` | `CRIB` | |
| `sleepLogType` | `TIMER` | |
| `editingEvent` | null | |
| `bottleFeedType` | **`BREAST`** | |
| `bottleLiquidType` | **`EXPRESSED_MILK`** | This **overrides** the settings `defaultBottleType` that `fetchSettings` applied. The "default bottle type" setting therefore has no visible effect on new entries. |
| `amountOfferedMl` / `amountConsumedMl` | 120 / 120 | |
| `consumedManuallyEdited` | false | |
| `breastSide` | `BOTH` | |
| `breastDuration` | 15 | |
| `spitUp` | `NONE` | |
| `swallowingNoises` | false | |
| `showTopUp` | false | |
| `topUpLiquidType` | `EXPRESSED_MILK` | |
| `topUpConsumedMl` | 30 | |
| `diaperContains` | `PEE` | |
| `peeVolume` | `LIGHT` | |
| `pooAmount` | `MEDIUM` | |
| `pooColor` | `YELLOW_MUSTARD` | |
| `pooTexture` | `SEEDY` | |
| `activityName` | `settings.customActivities[0] \|\| 'משחק'` | |
| `cryingIntensity` | **0** | The initial state is 1, but resetForm sets 0. |
| `weightGrams` | newest WEIGHT event's grams, or 3500 | |
| `percentile` | its percentile, or `''` | |
| `pumpLeftAmount` / `pumpRightAmount` | 60 / 60 | |
| `vomitingSizeInput` | **`SMALL`** | The initial state is MEDIUM. |

### 6.3 Shared footer (every sheet except `sleep`) (`6205-6257`)
A grid with 2 columns:
- `שעת האירוע` (10px label) + `<DateTime24 value=customTimestamp>`. This field is hidden when editing a SLEEP.
- `הערה חופשית (אופציונלי)` + a text input with placeholder `למשל: סירב לסיים, פלט מעט`. It spans 2 columns when editing a SLEEP.

Action row:
- Submit, flex-1, indigo-600, text:
  - `שומר...` while submitting
  - `שמור עדכונים` in edit
  - `שמור תיעוד רפואי ✔️` otherwise
- Edit only: `🗑️ מחק אירוע` (rose) → `setPendingDeleteId(id)`, which opens the strip in §3.2.

### 6.4 Create save: `handleCreateEvent` (`1545-1655`)
1. Map the sheet to a guard key. Guard fires → `נרשמה פעולה מסוג זה ב-10 השניות האחרונות! הפעולה בוטלה למניעת כפל.`
2. Bottle validation (only when feedType is BOTTLE): if consumed > offered → toast `כמות שנצרכה לא יכולה להיות גדולה מכמות שהוצעה` (error) and abort.
3. Base payload: `timestamp = customTimestamp ? ISO(customTimestamp) : now`, `loggedBy: activeParent`, `notes: noteText.trim() || undefined`.
4. Add the type-specific fields (sections below).
5. `POST /api/events`.
   - ok → undo toast `האירוע נשמר בהצלחה`, then `resetForm()`, `fetchEvents()` and close the sheet.
   - Not ok → `תקלה בשמירת הנתונים`.
   - Network error → `לא ניתן להתחבר לשרת`.

(Dead code: `activeSheet === 'tummyTime'|'bath'` branches at `1553-1554`, which are unreachable.)

### 6.5 Bottle / breast sheet (`activeSheet='bottle'`, `4945-5283`)
Top to bottom:
1. **Swallowing toggle**, full width:
   - `🦩` `קולות בליעה? (Swallowing noises?)`, with `כן ✓` or `לא` on the left.
   - When on: blue-950 bg and a blue-500 border.
2. **Feed type segmented control**: `🍼 בקבוק (שאוב / תמ״ל)` (active blue-600) | `🤱 הנקה ישירה` (active sky-600). The default is breast.
3. **If BOTTLE:**
   - Liquid segmented control: `חלב אם שאוב` | `תמ״ל (פורמולה)`.
   - **Offered** stepper: label `כמות שהוצעה`, value `{n} מ״ל`, buttons `-10` `-5` `+5` `+10`.
     - `applyOfferedAmount` floors at 0.
     - If consumed has *not* been manually edited, consumed mirrors offered.
   - **Consumed** stepper (blue): label `כמות שנצרכה`, the same 4 buttons, floor 0. Any tap marks consumed as manually edited.
   - Preset row `60 מ״ל` `90 מ״ל` `120 מ״ל` `150 מ״ל` `180 מ״ל`. Each one sets offered = consumed = preset and clears the manual flag.
   - There is no upper bound.
4. **If BREAST:**
   - Label `צד הנקה`, 3 buttons `שמאל` / `ימין` / `שני הצדדים`. The default is BOTH. Active: sky-950 with a sky-500 border.
   - Duration stepper: label `משך זמן כולל`, value `{n} דקות`, buttons `-5` `-1` `+1` `+5`, minimum 1, no maximum.
   - Top-up block (separated by a top border):
     - Collapsed: a button `הוסף השלמה`.
     - Expanded:
       - Heading `השלמה בבקבוק` and a link `הסתר`.
       - Segmented `חלב שאוב` | `פורמולה`.
       - Stepper `כמות שנאכלה` `{n} מ״ל` with `Minus` / `Plus` icon buttons, step 10, range 0..300.
5. **Spit-up** (shown for both feed types): label `פליטות והקאות`, buttons `ללא פליטה` / `פליטה קלה` / `הקאה כבדה` (NONE/LIGHT/HEAVY_VOMIT).
6. Shared footer (§6.3).

Payload `nutrition`:
- `feedType`, `swallowingNoises`.
- BOTTLE only: `bottleLiquidType`, `amountOfferedMl`, `amountConsumedMl`.
- BREAST only: `breastSide`, `durationMinutes`.
- `spitUp` only if not NONE.
- `topUp:{liquidType, consumedMl}` only if BREAST and the top-up is expanded and amount > 0. Otherwise it is undefined.

### 6.6 Diaper sheet (`5288-5425`)
1. `תכולת החיתול`: `💦 שתן בלבד` / `💩 צואה בלבד` / `💦💩 שתן וצואה`. Active: teal-950 with a teal-500 border.
2. If not POO, `רטיבות החיתול (רטיבות שתן)`: `רטיבות קלה` (LIGHT) / `רטוב כבד / נפוח` (HEAVY_SOAKED).
3. If not PEE (with a top border):
   - `כמות צואה`: `קטן / לכלוך` (SMALL) / `בינוני` (MEDIUM) / `גדול / גלישה` (LARGE_OVERFLOW).
   - `צבע צואה`: `צהוב חרדל 🟡` / `ירוק 🟢` / `חום 🟤`.
   - `מרקם צואה` (4 columns): `גרגרי` (SEEDY) / `נוזלי` (LIQUID) / `משחתי` (PASTY) / `קשה` (HARD).
4. Footer.

Payload: `diaper:{contains, peeVolume (if ≠POO), pooAmount/pooColor/pooTexture (if ≠PEE)}`.

### 6.7 Sleep sheet (`activeSheet='sleep'`, `5430-5564`). It has no shared footer and supplies its own controls.
1. Segmented control: `⏱️ מעקב פעיל / טיימר` (TIMER, default) | `📅 תיעוד שינה שהסתיימה` (MANUAL). Active: indigo-650.
2. **TIMER mode:**
   - Info box: `מעקב שינה פעיל. בחר את שעת תחילת השינה ולחץ על מיקום ההשכבה כדי להתחיל את שעון המעקב:`
   - Label `שעת תחילת השינה` + `DateTime24` bound to `customTimestamp` (default now).
   - Label `מיקום השכבה (יתחיל את הטיימר)`, a 2×2 grid of action buttons, each calling `handleSleepToggle(value)` (§5.2):
     - `🛌 עריסה / מיטה` (CRIB)
     - `🤲 על הידיים` (HANDS)
     - `🎒 במנשא` (CARRIER)
     - `🛒 בעגלה` (STROLLER)
   - There is no submit button.
3. **MANUAL mode:**
   - Info: `הזן ידנית את זמני ההירדמות והיקיצה של התינוק כדי ליצור תיעוד מלא:`
   - `💤 שעת תחילת שינה (הלך לישון)` + DateTime24 bound to `customSleepStartAt` (default now−1h).
   - `⏰ שעת התעוררות (הקיץ משנתו)` + DateTime24 bound to `customSleepEndAt` (default now).
   - `📍 מיקום השכבה`: a selectable 2×2 grid `🛌 עריסה` / `🤲 ידיים` / `🎒 מנשא` / `🛒 עגלה` (default CRIB). Active: indigo-950 with an indigo-500 border.
   - `הערה לשינה (אופציונלי)`, text input, placeholder `למשל: נרדם בקושי, התעורר מרעש`.
   - Submit `שמור תיעוד שינה ✔️` (or `שומר...`) → `handleCreateEvent`.
   - Payload: `sleep:{startAt, endAt, startLocation}` with `timestamp = startAt`. The server computes the duration.
   - **There is no client validation that end > start.** The server clamps the duration to at least 1.

### 6.8 Activity, weight, pumping and vomiting sheets
**Activity** (`5569-5609`):
- `סוג הפעילות`: a 2-column grid of buttons from `settings.customActivities`, scrollable up to 140 px. Active: amber-950 with an amber-500 border. The default selection is the first activity.
- Duplicate names share a React key (`key={act}`).
- If the list is empty, no buttons show and the saved name falls back to `'משחק'`.
- `מדד בכי ואי שקט (1-10, 0 = רגוע)`: a range input 0-10 with a value chip that shows `רגוע` at 0, otherwise the number.
- Payload: `activity:{activityName: activityName || customActivities[0] || 'משחק', cryingIntensity}`.

**Weight** (`5614-5680`):
- Stepper: label `משקל התינוק (גרם)`, value `{kg.toFixed(3)} ק״ג ({g} גרם)`.
  - Buttons `-100ג׳` (floor 100), `-10ג׳` (floor 10), `+10ג׳`, `+100ג׳`.
- Two inputs:
  - `הזן משקל מדויק ידנית`, number, placeholder `גרם, למשל: 3450`, unbounded.
  - `אחוזון (אופציונלי)`, number, placeholder `למשל: 15`. Empty → `''`.
- Payload: `weight:{weightGrams, percentile: '' ? undefined : Number}`.
- Defaults come from the latest weight. Because the code uses `percentile || ''`, a stored percentile of 0 shows as empty.

**Pumping** (`5685-5761`). Two identical blocks:
- `⬅️ שד שמאל (מ״ל)` and `➡️ שד ימין (מ״ל)`, each with value `{n} מ״ל` (fuchsia).
- Buttons `-10` (floor 0) and `+10` (no cap).
- A range slider 0-250, step 5.
- Default 60/60.
- Payload: `pumping:{leftAmountMl, rightAmountMl}`.

**Vomiting** (`5766-5810`):
- Label `דרגת/גודל הפליטה`.
- Three tiles:
  - `💧` `פליטה קלה` (SMALL, emerald when active)
  - `💦` `פליטה בינונית` (MEDIUM, amber)
  - `⚠️` `הקאה גדולה` (LARGE, rose)
- The full-sheet default is **SMALL**.
- Payload: `vomiting:{size}`.

### 6.9 Edit mode (`activeSheet='edit'`) (`openEditSheet` `1938-1987`, UI `5815-6202`, save `1657-1757`)
`openEditSheet(event)`:
1. `resetForm()`.
2. Set `editingEvent`.
3. Set `customTimestamp` to the event's Israel string and `noteText` to the event notes.
4. Hydrate the per-type fields:
   - Bottle offered = `amountOfferedMl || 120`, consumed = `?? offered`, with the manual flag set when they differ.
   - Breast side and duration `|| 15`, and the top-up if present.
   - spitUp and swallowing.
   - Diaper fields only if present.
   - Activity name and intensity.
   - Weight and percentile.
   - Pumping.
   - Vomiting size.
   - Sleep start and end strings (`''` if the end is null) and location.

Layout:
1. Info box: `עריכת פרטי האירוע`, then `סוג אירוע: {raw eventType, in English, e.g. NUTRITION} • נרשם ע״י {name}`.
2. Per-type editor:
   - **NUTRITION:**
     - The swallowing toggle (same as §6.5).
     - Segmented `בקבוק` | `הנקה ישירה` (active indigo-650).
     - BOTTLE: number inputs `הוצע (מ״ל)` (`applyOfferedAmount`) and `נצרך (מ״ל)` (manual). There is **no liquid-type control**: the value is preserved from the event, or defaults to EXPRESSED_MILK.
     - BREAST:
       - `<select>` `צד הנקה` with `שמאל` / `ימין` / `שניהם`.
       - Number input `משך זמן (דקות)`, unbounded.
       - Top-up block. It reads `+ תוסף בקבוק` when collapsed and has the heading `תוסף בקבוק` when expanded. The wording differs from create. Otherwise it is identical.
     - There is **no spit-up selector** in edit, so the hydrated value is sent back unchanged.
   - **DIAPER:**
     - `<select>` `חיתול מכיל`: `שתן בלבד` / `צואה בלבד` / `שתן וצואה`.
     - Then the same conditional button groups as in create.
   - **WEIGHT:** number inputs `משקל (גרם)` and `אחוזון`.
   - **PUMPING:** number inputs `⬅️ שד שמאל (מ״ל)` and `➡️ שד ימין (מ״ל)`.
   - **VOMITING:** the same 3 tiles as create.
   - **SLEEP:**
     - `💤 שעת תחילת שינה (הלך לישון)` and `⏰ שעת התעוררות (הקיץ משנתו)` DateTime24 pickers.
     - The `📍 מיקום השכבה` 2×2 grid.
     - The shared "event time" field is hidden.
   - **ACTIVITY** and **SUPPLEMENT:** **no editor**. Only time and note are editable, and the activity's name and intensity are re-sent unchanged.
3. Shared footer with the submit `שמור עדכונים` and `🗑️ מחק אירוע`.

Save (`handleUpdateEvent`):
- Bottle validation applies only when the event has a `nutrition` object and the feed type is BOTTLE.
- Base payload: `timestamp = customTimestamp ? ISO : original`, `loggedBy = original` (not the current parent), notes.
- NUTRITION (only if the event already has `nutrition`):
  - `{...original, feedType, bottle/breast fields as in create, spitUp (sent even if NONE), swallowingNoises}`.
  - `topUp`: for BREAST, `{..}` if expanded and > 0, otherwise **`null`** (an explicit removal). For BOTTLE, the original `topUp` is kept.
  - **A quick-recorded meal has no `nutrition`, so edits to its feeding fields are silently dropped.** Only time and note save.
- DIAPER and the others: the same field mapping as create.
- SLEEP:
  - If the original had an `endAt` and `customSleepEndAt` is empty → toast `שדה סיום שינה לא יכול להיות ריק` and abort. `submitting` is already true at this point and is **not** reset by this early return (`1664`, `1716-1718`), so the submit button stays at `שומר...` until the next submit or reload.
  - `startAt = custom ? ISO : original`. `endAt = custom ? ISO : originalEndAt`, which may be null, so an open sleep stays open. `startLocation`. `timestamp = startAt`.
- `PUT /api/events/:id`.
  - ok → toast `האירוע עודכן בהצלחה`, then `resetForm`, `fetchEvents`, `checkOpenSleepSession` and close the sheet.
  - Not ok → `תקלה בעדכון האירוע`.
  - Network error → `שגיאת תקשורת עם השרת`.
- There is no undo for edits.

---

## 7. DateTime24 picker (`src/components/DateTime24.tsx`)

Contract: `value: "YYYY-MM-DDTHH:mm"` (it may be empty or partial), `onChange(full string)`. It **never emits a partial value**: `emit` drops any value without a date part (`144-147`). Guaranteed 24 h: it never uses a native time or datetime-local input. Intent is in `plans/datetime24-picker-redesign_v1.md`. Container `flex-col gap-2.5 dir=rtl`.

Layout top to bottom:
1. **Preset chips:**
   - `עכשיו` → Israel now. This chip is "active" (indigo) only when `value === nowInIsrael()` to the minute.
   - `לפני 15 דק׳` → now−15. Never shown as active.
   - `לפני שעה` → now−60. Never shown as active.
2. **Fine-tune row** (bg slate-950, rounded-2xl), split in two:
   - **Date part** (RTL start):
     - Chips `היום` and `אתמול`. Each is active when the date matches. Tapping one keeps the hour and minute.
     - Then an icon button `Calendar` (aria `בחר תאריך`). It toggles the native `<input type="date">` row. It is highlighted indigo when the date is neither today nor yesterday.
   - **Time part** (`dir=ltr`): `ChevronLeft` (aria `הפחת 5 דקות`, −5 min) · `HH` button · `:` · `MM` button · `ChevronRight` (aria `הוסף 5 דקות`, +5 min).
     - The nudge rolls over hours and days, using a naive local-Date wall clock (`57-64`).
     - Tapping HH or MM opens a **ScrollColumn** popover: absolute, w-16, max-h-40, scrollable list of `00..23` or `00..59`. The selected item is indigo-600, and the list auto-scrolls so the selected item is centred.
     - A full-screen transparent backdrop at z-40 closes the popover on an outside tap. Picking an item sets the value and closes the popover. Tapping the same HH/MM button again toggles it closed.
     - Setting the hour or minute when there is no date uses today.
3. **Native date input** (only when toggled): picking a date sets it, keeps HH:mm and hides the input.
4. **Live preview** (when a date exists): emerald `Check` icon and `{he-IL weekday short, day numeric, month long} · HH:mm`, for example `יום א׳, 5 ביולי · 14:30`.

Parsing: missing hour or minute shows as `00`. Icons used: lucide `Calendar`, `Check`, `ChevronLeft`, `ChevronRight`. Animation: motion fade/slide at y −6.

---

## 8. Settings tab

### 8.0 Sub-screens
`settingsScreen` is `'main'` (default) or `'legend'`, and it resets to `main` when you leave the tab.

### 8.1 Legend screen (`4543-4592`)
1. Back link: `ChevronRight` icon and `חזרה להגדרות` → main.
2. Card:
   - h2 `מקרא — סמלי איכות וסוגים`.
   - Intro: `הסמלים למטה זהים לאלה שמופיעים בציר הזמן ובדאשבורדים. פני איכות קטנות מופיעות רק בהזנה (עם נתונים) ובמשקל (עם שקילה קודמת).`
   - `רמות איכות`: a 2-column grid over BAD, OKAY, GOOD, GREAT. Each item has `IconTierFace` (icons.tsx, w-8), a right border in the tier colour, and its label: `דורש תשומת לב` / `סביר` / `טוב` / `מצוין`. The colours are the CSS vars `--color-tier-bad #E5484D`, `-okay #F5A623`, `-good #46A758`, `-great #30A46C`.
   - `סמלי סוג אירוע (כמו באפליקציה)`: a 2-column grid of `EVENT_TYPE_LEGEND` (`117-140`), in order:
     1. `🤱` הנקה ישירה
     2. `🍼` בקבוק (חלב שאוב / תמ״ל)
     3. `DiaperIcon` (teal-400) חיתול
     4. `💦` חיתול — שתן בלבד
     5. `💩` חיתול — צואה בלבד
     6. `💦💩` חיתול — שתן וצואה
     7. `💤` שינה — ישן עכשיו
     8. `❌` שינה — מחזור קצר
     9. `👍` שינה — מחזור טוב
     10. `🌟` שינה — מחזור מצוין
     11. `⚖️` שקילת משקל
     12. `🎨` פעילות
     13. `🍼🤱` שאיבת חלב
     14. `🤮` פליטה / הקאה
     15. An amber circle with `!`: יש הערה — כדאי לקרוא

### 8.2 Main screen: section order (`4594-4900`)
1. Install app card (§9).
2. Legend link card: `Sparkles` and `מקרא סמלים ואיכות`, with `ChevronLeft` → legend.
3. Logout card: `LogOut` icon and `התנתקות`.
4. Export section (§8.3).
5. Parents and settings form (§8.4).
6. Baby profile (§8.5).
7. Custom activities (§8.6).
8. Data management (§8.7).

**Logout** (`1339-1350`):
- There is no confirmation.
- `POST /api/logout`, and any errors are ignored.
- Then `handleUnauthorized()`, clear the login inputs, `events=[]` and `openSleepSession=null`.
- `settings`, `activeTab` and the other state are **not** cleared.

### 8.3 Export (`4625-4685`)
- Heading: `FileSpreadsheet` and `ייצוא דוח רופא ילדים (Excel)`.
- Text: `ייצוא דוח מקיף המיועד לרופא הילדים. הדוח כולל גיליונות סיכום, תזונה יומית, פערים, שינה, חיתולים ומשקל.`
- An inner box with:
  - Two native date inputs, `מתאריך` (default today − 14 days) and `עד תאריך` (default today).
    - The defaults use `toISOString().split('T')[0]`, which is a **UTC** date and can be off by one near midnight Israel time.
  - A presets row: `בחירה מהירה:` with links `7 ימים אחרונים`, `14 ימים אחרונים`, `30 ימים אחרונים`. Each sets from = today−N and to = today (UTC dates).
- There is no from ≤ to validation.
- Button (green-700): `Download` and `הורד דוח Excel מעוצב (.xlsx)`. It runs `window.open('/api/export/xlsx?from=…&to=…','_blank')` and always shows the toast `הדוח נוצר ונשלח להורדה כקובץ Excel`.

### 8.4 Parents and default bottle form (`4688-4735`)
- Heading: `Settings` icon and `הגדרות ושמות ההורים`.
- Fields:
  - `שם הורה א׳ (אמא כברירת מחדל)`, text, placeholder `אמא`.
  - `שם הורה ב׳ (אבא כברירת מחדל)`, text, placeholder `אבא`.
  - `סוג ברירת מחדל לבקבוקים`, `<select>` with:
    - `חלב אם שאוב (Expressed)` = EXPRESSED_MILK
    - `תמ״ל / פורמולה (Formula)` = FORMULA
- Submit: `שמור הגדרות מערכת` (`שומר שינויים...` while submitting, and disabled).
- `PUT /api/settings {parentAName, parentBName, defaultBottleType}`.
  - ok → `ההגדרות עודכנו בהצלחה` and `fetchSettings`.
  - Not ok → no toast.
  - Network error → `שגיאה בעדכון ההגדרות`.
- There is no empty-name validation.
- After a rename, the header pill `loggedInParentName` and the header subtitle both update through the `fetchSettings()` that runs after the save (`currentParent.parentName`).

### 8.5 Baby profile (`4738-4796`)
- Heading: `Baby` (pink) and `פרטי תינוק`.
- Fields:
  - `שם התינוק`, text, placeholder `שם התינוק`.
  - `תאריך לידה`, native date input.
  - `משקל לידה (גרם)`, shown as `{n} גרם`, with `Minus` / `Plus` buttons at ±10 g and a floor of 0. There is no direct text input, and the default is 0 when there is no profile.
- Button `שמירה` (`שומר...`). It is disabled while submitting or when the trimmed name is empty.
- `PUT /api/settings {babyProfile:{name:trim, dateOfBirth, birthWeightGrams}}`.
  - ok → `פרטי התינוק נשמרו בהצלחה` and `fetchSettings`.
  - Network error → `שגיאה בשמירת פרטי התינוק`.

### 8.6 Custom activities (`4799-4838`)
- Heading: `PlusCircle` (amber) and `ניהול כפתורי פעילויות`.
- Text: `צור כפתורים מותאמים אישית לתיעוד פעילויות מהיר בלחיצה אחת בלבד.`
- Row: a text input (placeholder `למשל: שחיית תינוקות, סיפור`) and a button `הוסף`. Enter in the input does nothing because it is not in a form.
- `handleAddCustomActivity`:
  1. A blank name is ignored.
  2. `PUT /api/settings {customActivities:[...current, trimmed]}`. Duplicates are not checked.
  3. ok → clear the input, toast `הפעילות החדשה נוספה לרשימה` and `fetchSettings`.
  4. Network error → `תקלה בהוספת פעילות`.
- List: one row per activity with its name and a `Trash2` button (title `מחק כפתור זה`).
  - Delete filters by name, so it removes **all** duplicates.
  - ok → `הפעילות הוסרה מהרשימה`. Network error → `תקלה בהסרת פעילות`.
  - There is no delete confirmation.

### 8.7 Data management and reset (`4841-4897`, modals `6392-6475`)
- Heading: `RefreshCw` (rose) and `ניהול ואתחול נתוני מערכת`.
- Intro: `כאן תוכלו לנקות את היסטוריית המערכת - לאתחל מחדש לגמרי או למחוק נתונים ישנים כדי להשאיר את המידע מעודכן בלבד.`
- **Option A**:
  - Heading `🧹 אפשרות א׳: ניקוי נתונים מתאריך מסוים ואחורה`.
  - Text: `המערכת תמחק לצמיתות את כל האירועים שהתרחשו בתאריך הנבחר ואחורה. המידע מהתאריך הזה והלאה יישאר ללא שינוי, כך שתתחילו מחדש מאותו היום.`
  - Label `בחר תאריך יעד למחיקה אחורה:` with a date input (default today as a UTC date).
  - Button: `Trash2` and `מחק נתונים מתאריך {date} ואחורה` → `clearType='cutoff'`.
  - This opens a confirm modal:
    - `⚠️` and the title `מחיקת נתונים מתאריך מסוים ואחורה`.
    - Body: `האם אתה בטוח שברצונך למחוק לצמיתות את כל האירועים שנרשמו בתאריך {date} ואחורה? נתוני המערכת יישארו פעילים רק עבור אירועים מהתאריך הזה והלאה.`
    - Buttons `ביטול` and `כן, למחוק לצמיתות` (`מוחק...`).
  - The body sent is `{before: new Date(`${date}T00:00:00`).toISOString()}`, which is local midnight **of** the chosen date. So events *on* the chosen date are kept, even though the copy says "on the chosen date and backwards".
- **Option B**:
  - Heading `⚠️ אפשרות ב׳: אתחול מחדש מלא (התחלה מאפס)`.
  - Text: `מוחק לצמיתות את כל האירועים, הארוחות, השינה והנתונים במערכת. פעולה זו אינה הפיכה ותחזיר את האפליקציה למצב נקי לחלוטין.`
  - Button: `RefreshCw` and `אתחל את כל הנתונים והתחל מאפס` → `pendingClearAll=true`.
  - This opens a typed-confirmation modal:
    - `⚠️` and the title `אתחול מלא ומחיקת כל הנתונים`.
    - Body: `פעולה זו תמחק לצמיתות את כל האירועים במערכת ולא ניתן לשחזר אותם. כדי לאשר, הקלד 'מחק הכל'`
    - An input with placeholder `מחק הכל`.
    - Buttons: `ביטול` (clears the text and closes) and `כן, למחוק לצמיתות`. The confirm button is disabled unless the text is exactly `מחק הכל`.
  - Confirm → `handleClearData('all')` with body `{}`.
  - (The `clearType==='all'` variant of the generic modal, with the longer copy at `6451`, is unreachable from the UI.)
- `handleClearData` (`1442-1474`):
  1. `POST /api/events/clear`.
  2. ok → toast `כל נתוני המערכת נמחקו ואותחלו מחדש ✨` (all) or `הנתונים הישנים נמחקו בהצלחה. המערכת עודכנה ✨` (cutoff), then `fetchEvents`, `checkOpenSleepSession` and `fetchStats`.
  3. Not ok → `אירעה שגיאה במחיקת הנתונים`.
  4. Network error → `שגיאה בחיבור לשרת`.
  5. Always: close both modals and clear the typed text.
- The modals are fixed inset-0, bg black/85, z-50, with a centred max-w-sm card. Clicking the backdrop does not close them.

---

## 9. PWA install

### 9.1 `usePwaInstall` (`src/hooks/usePwaInstall.ts`)
- On mount it sets `isInstalled_` when either of these is true:
  - `matchMedia('(display-mode: standalone)')` matches.
  - `navigator.standalone === true` (iOS).
- `beforeinstallprompt`: `preventDefault()`, store the event and set `canInstall_=true`.
- `appinstalled`: clear the stored event, `canInstall_=false`, `isInstalled_=true`.
- `promptInstall_()`:
  1. If there is no stored event, return false.
  2. Otherwise `await prompt()` and `await userChoice`.
  3. Always clear the event and set `canInstall_=false`. On `accepted`, set `isInstalled_=true`.
  4. Return whether the choice was accepted.

### 9.2 `InstallAppButton` (the first card on Settings main)
Three states, in priority order:
1. **Installed:**
   - Emerald border, `📱`, title `האפליקציה מותקנת`.
   - Text: `Baby Tracker מותקן על המכשיר שלך ופועל במצב standalone.`
2. **Cannot prompt** (no event yet, iOS, or already dismissed):
   - Title `התקנת אפליקציה`.
   - Text: `ב-Chrome/Android: פתח תפריט הדפדפן ובחר "הוסף למסך הבית". ב-iPhone/Safari: לחץ על כפתור השיתוף ובחר "הוסף למסך הבית".`
3. **Can prompt:**
   - Indigo border, title `התקנת אפליקציה`.
   - Text: `התקן את Baby Tracker על המכשיר לגישה מהירה, מסך מלא ועבודה offline לקבצים שמורים במטמון.`
   - Button: `Download` and `התקן Baby Tracker`, which calls `promptInstall_()`.
   - After a dismissed prompt it falls back to state 2.

### 9.3 Manifest and service worker (`vite.config.ts`, `src/main.tsx`, `index.html`)
- `vite-plugin-pwa` with `registerType:'autoUpdate'`. `registerSW({immediate:true})` is called at startup. `devOptions.enabled:true`.
- Manifest:
  - `name 'Baby Tracker'`, `short_name 'BabyTracker'`
  - `description 'מעקב תינוק — האכלות, שינה, חיתולים ועוד'`
  - `theme_color '#ffffff'`, `background_color '#020617'`
  - `display 'standalone'`, `orientation 'portrait'`
  - `start_url '/'`, `scope '/'`
  - `lang 'he'`, `dir 'rtl'`
  - Icons: `pwa-192x192.png` (192), `pwa-512x512.png` (512), and `pwa-512x512.png` with purpose maskable.
- Workbox:
  - Precaches `**/*.{js,css,html,ico,png,svg,woff2}`.
  - `navigateFallback '/index.html'`.
  - Google Fonts use CacheFirst (`google-fonts-cache`, 10 entries, 1 year, statuses 0/200).
  - API calls are **not** cached.
- `index.html`:
  - `<title>מעקב תינוק — Baby Tracker</title>`
  - Viewport `width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover`
  - `theme-color #ffffff`
  - Apple meta: `apple-mobile-web-app-capable yes`, `status-bar-style black-translucent`, title `BabyTracker`
  - `apple-touch-icon /pwa-192x192.png`
  - The body has `overflow-x-hidden antialiased select-none`.

---

## 10. Icon inventory for these screens
- **lucide-react:** `Moon` (sleep button, nap banner), `Clock` (carousel header), `Activity`, `Scale` (carousel peeks), `X` (banner dismiss, quick panels, sheet close), `AlertCircle` / `Sparkles` (toast, legend link), `Minus` / `Plus` (top-up, birth weight), `Check` (Bio Gaya, DateTime24 preview), `ChevronLeft` / `ChevronRight` (legend nav, DateTime24 nudge), `Calendar` (DateTime24), `LogOut`, `FileSpreadsheet`, `Download` (export, install), `Settings`, `Baby`, `PlusCircle`, `Trash2`, `RefreshCw`.
  - Imported but not used in these screens: `Droplet`, `TrendingUp`, `User`, `ChevronDown`, `ChevronUp`, `Calendar` in App.
- **icons.tsx:**
  - Used here: `DiaperIcon` (carousel, legend), `IconTierFace` (legend).
  - Exported but not used in these screens: `IconBreast`, `IconBottleExpressed`, `IconBottleFormula`, `IconPoo`, `IconPeeDrop`, `IconWeightScale`, `IconSleepMoon` (listed in `src/design-system.ts`).
- **Libraries:**
  - `motion/react` handles the carousel drag, quick panels, pills and DateTime24 popover.
  - `@dnd-kit/core` and `@dnd-kit/sortable` handle quick-action reorder.
