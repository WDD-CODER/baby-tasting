# Brief 3 — Food and allergen catalog

Read `docs/briefs/00-program.md` first (section 3, R8, R9, section 8).

## Goal

A Hebrew catalog of foods and allergens that the parents can extend and edit freely, ready to be placed on the
calendar.

## Scope

- Server: CRUD under `/api/v1/allergens` and `/api/v1/foods` (create, list, update, archive, restore). Archive instead
  of delete once a food or allergen is used by any calendar item.
- Built-in catalog (below) inserted once per household on first use, marked `builtIn: true`; parents may edit or
  archive built-in entries, and their edits are never overwritten.
- Frontend page `מזונות`: search, filter by category and by "allergens only", list with emoji, name, allergen chip and
  status (`לא נוסה` at this stage); add / edit food form (name, category, emoji picker, allergen select with "new
  allergen" inline, optional warning text and warning age in months); allergen management list (add, rename, archive).

## Built-in allergens

`חלב`, `ביצה`, `בוטנים`, `שומשום`, `דגים`, `חיטה (גלוטן)`, `סויה`, `אגוזי מלך`, `שקדים`, `אגוזי לוז`, `קשיו`, `פיסטוק`, `פקאן`.

## Built-in foods (name · emoji · allergen · warning)

- **ירקות:** בטטה 🍠 · גזר 🥕 · קישוא 🥒 · דלעת 🎃 · תפוח אדמה 🥔 · ברוקולי 🥦 · כרובית 🥬 · אפונה 🫛 · שעועית ירוקה 🫛 ·
  עגבנייה 🍅 · מלפפון 🥒 · פלפל אדום 🫑 · סלק 🟣 · תרד 🥬 · אבוקדו 🥑
- **פירות:** בננה 🍌 · תפוח 🍎 · אגס 🍐 · אפרסק 🍑 · שזיף 🟣 · מנגו 🥭 · מלון 🍈 · אבטיח 🍉 · תות 🍓 · קיווי 🥝 · תמר 🟤 ·
  ענבים 🍇 (warning: "לחתוך לרבעים לאורך", until 60 months)
- **דגנים:** אורז 🍚 · שיבולת שועל 🥣 · קינואה 🌾 · תירס 🌽 · כוסמת 🌾 · לחם 🍞 (חיטה) · פסטה 🍝 (חיטה) · סולת 🥣 (חיטה)
- **קטניות:** עדשים 🟠 · חומוס 🟡 · שעועית לבנה ⚪ · טופו ⬜ (סויה)
- **חלבונים:** עוף 🍗 · הודו 🍗 · בקר 🥩 · ביצה קשה 🥚 (ביצה) · חביתה 🍳 (ביצה) · דג לבן 🐟 (דגים; warning: "לוודא שאין
  עצמות") · סלמון 🐟 (דגים; same warning) · טונה 🐟 (דגים)
- **חלב ומוצריו:** יוגורט 🥛 (חלב) · גבינה לבנה 🧀 (חלב) · קוטג' 🧀 (חלב) · גבינה צהובה 🧀 (חלב) · חלב פרה לשתייה 🥛
  (חלב; warning: "לא כמשקה לפני גיל שנה", until 12 months)
- **אלרגנים נוספים:** חמאת בוטנים 🥜 (בוטנים; warning: "מרוח דק או מדולל, לא בכפית") · במבה 🥜 (בוטנים) · טחינה 🫙
  (שומשום) · חמאת שקדים 🌰 (שקדים) · אגוזי מלך טחונים 🌰 (אגוזי מלך) · אגוזי לוז טחונים 🌰 (אגוזי לוז) · קשיו טחון 🌰
  (קשיו) · פיסטוק טחון 🌰 (פיסטוק) · פקאן טחון 🌰 (פקאן)
- **אזהרות בלבד:** דבש 🍯 (warning: "אסור לפני גיל שנה", until 12 months) · אגוזים שלמים 🌰 (warning: "סכנת חנק — רק
  טחון", until 60 months)

## Out of Scope

Calendar placement, status beyond `לא נוסה`, locks, age-based recommendations of which food to try.

## Rules

- Names are unique per household among non-archived entries (compare trimmed).
- The warning is text plus an age in months; the UI shows it, nothing blocks (R8).
- The seed is data in one file in `server/`, inserted through the repositories, and is idempotent.

## Done when

- [auto] Server tests: first call seeds 13 allergens and the built-in foods; a second call adds nothing; an edited
  built-in food keeps the edit after another seed call; a duplicate name is refused with a clear error; a food in use
  is archived, not deleted.
- [ui] The `מזונות` page lists the catalog; filter "allergens only" shows only foods with an allergen chip.
- [ui] Adding a food "קוסקוס" with a new allergen created inline shows it in the list with that allergen chip.
- [ui] The food form with changes asks before leaving; archive asks for confirmation.
- [human] The emoji and names read well on a phone; the catalog feels complete enough to start.
