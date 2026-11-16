// The built-in catalog (brief 3). Data only: inserted through the repositories by seed-catalog.js.

export const FOOD_CATEGORIES = [
  'vegetables',
  'fruits',
  'grains',
  'legumes',
  'proteins',
  'dairy',
  'allergens',
  'other',
]

export const BUILT_IN_ALLERGENS = [
  { key: 'milk', name: 'חלב' },
  { key: 'egg', name: 'ביצה' },
  { key: 'peanut', name: 'בוטנים' },
  { key: 'sesame', name: 'שומשום' },
  { key: 'fish', name: 'דגים' },
  { key: 'wheat', name: 'חיטה (גלוטן)' },
  { key: 'soy', name: 'סויה' },
  { key: 'walnut', name: 'אגוזי מלך' },
  { key: 'almond', name: 'שקדים' },
  { key: 'hazelnut', name: 'אגוזי לוז' },
  { key: 'cashew', name: 'קשיו' },
  { key: 'pistachio', name: 'פיסטוק' },
  { key: 'pecan', name: 'פקאן' },
]

const w = (text, untilMonths = null) => ({ text, untilMonths })
const f = (key, name, emoji, category, allergenKey = null, warning = null) => ({
  key,
  name,
  emoji,
  category,
  allergenKey,
  warning,
})

const BONES = 'לוודא שאין עצמות'

export const BUILT_IN_FOODS = [
  f('sweet-potato', 'בטטה', '🍠', 'vegetables'),
  f('carrot', 'גזר', '🥕', 'vegetables'),
  f('zucchini', 'קישוא', '🥒', 'vegetables'),
  f('pumpkin', 'דלעת', '🎃', 'vegetables'),
  f('potato', 'תפוח אדמה', '🥔', 'vegetables'),
  f('broccoli', 'ברוקולי', '🥦', 'vegetables'),
  f('cauliflower', 'כרובית', '🥬', 'vegetables'),
  f('peas', 'אפונה', '🫛', 'vegetables'),
  f('green-beans', 'שעועית ירוקה', '🫛', 'vegetables'),
  f('tomato', 'עגבנייה', '🍅', 'vegetables'),
  f('cucumber', 'מלפפון', '🥒', 'vegetables'),
  f('red-pepper', 'פלפל אדום', '🫑', 'vegetables'),
  f('beet', 'סלק', '🟣', 'vegetables'),
  f('spinach', 'תרד', '🥬', 'vegetables'),
  f('avocado', 'אבוקדו', '🥑', 'vegetables'),

  f('banana', 'בננה', '🍌', 'fruits'),
  f('apple', 'תפוח', '🍎', 'fruits'),
  f('pear', 'אגס', '🍐', 'fruits'),
  f('peach', 'אפרסק', '🍑', 'fruits'),
  f('plum', 'שזיף', '🟣', 'fruits'),
  f('mango', 'מנגו', '🥭', 'fruits'),
  f('melon', 'מלון', '🍈', 'fruits'),
  f('watermelon', 'אבטיח', '🍉', 'fruits'),
  f('strawberry', 'תות', '🍓', 'fruits'),
  f('kiwi', 'קיווי', '🥝', 'fruits'),
  f('date', 'תמר', '🟤', 'fruits'),
  f('grapes', 'ענבים', '🍇', 'fruits', null, w('לחתוך לרבעים לאורך', 60)),

  f('rice', 'אורז', '🍚', 'grains'),
  f('oats', 'שיבולת שועל', '🥣', 'grains'),
  f('quinoa', 'קינואה', '🌾', 'grains'),
  f('corn', 'תירס', '🌽', 'grains'),
  f('buckwheat', 'כוסמת', '🌾', 'grains'),
  f('bread', 'לחם', '🍞', 'grains', 'wheat'),
  f('pasta', 'פסטה', '🍝', 'grains', 'wheat'),
  f('semolina', 'סולת', '🥣', 'grains', 'wheat'),

  f('lentils', 'עדשים', '🟠', 'legumes'),
  f('hummus', 'חומוס', '🟡', 'legumes'),
  f('white-beans', 'שעועית לבנה', '⚪', 'legumes'),
  f('tofu', 'טופו', '⬜', 'legumes', 'soy'),

  f('chicken', 'עוף', '🍗', 'proteins'),
  f('turkey', 'הודו', '🍗', 'proteins'),
  f('beef', 'בקר', '🥩', 'proteins'),
  f('hard-egg', 'ביצה קשה', '🥚', 'proteins', 'egg'),
  f('omelette', 'חביתה', '🍳', 'proteins', 'egg'),
  f('white-fish', 'דג לבן', '🐟', 'proteins', 'fish', w(BONES)),
  f('salmon', 'סלמון', '🐟', 'proteins', 'fish', w(BONES)),
  f('tuna', 'טונה', '🐟', 'proteins', 'fish'),

  f('yogurt', 'יוגורט', '🥛', 'dairy', 'milk'),
  f('white-cheese', 'גבינה לבנה', '🧀', 'dairy', 'milk'),
  f('cottage', "קוטג'", '🧀', 'dairy', 'milk'),
  f('yellow-cheese', 'גבינה צהובה', '🧀', 'dairy', 'milk'),
  f('cow-milk', 'חלב פרה לשתייה', '🥛', 'dairy', 'milk', w('לא כמשקה לפני גיל שנה', 12)),

  f('peanut-butter', 'חמאת בוטנים', '🥜', 'allergens', 'peanut', w('מרוח דק או מדולל, לא בכפית')),
  f('bamba', 'במבה', '🥜', 'allergens', 'peanut'),
  f('tahini', 'טחינה', '🫙', 'allergens', 'sesame'),
  f('almond-butter', 'חמאת שקדים', '🌰', 'allergens', 'almond'),
  f('ground-walnut', 'אגוזי מלך טחונים', '🌰', 'allergens', 'walnut'),
  f('ground-hazelnut', 'אגוזי לוז טחונים', '🌰', 'allergens', 'hazelnut'),
  f('ground-cashew', 'קשיו טחון', '🌰', 'allergens', 'cashew'),
  f('ground-pistachio', 'פיסטוק טחון', '🌰', 'allergens', 'pistachio'),
  f('ground-pecan', 'פקאן טחון', '🌰', 'allergens', 'pecan'),

  f('honey', 'דבש', '🍯', 'other', null, w('אסור לפני גיל שנה', 12)),
  f('whole-nuts', 'אגוזים שלמים', '🌰', 'other', null, w('סכנת חנק — רק טחון', 60)),
]
