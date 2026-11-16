// Every icon in the app has a named slot: a default Material Symbols Rounded name that parents may override
// (stored in the Tracker settings `iconOverrides`). Later plans add their slots here.
// After adding a slot key run `node server/lib/gen-icon-names.mjs` so the server accepts overrides for it.

export interface IconSlot {
  default: string
  label: string
  group: string
  keywords: string[]
}

export const ICON_SLOTS = {
  'nav.log': {
    default: 'edit_note',
    label: 'תיעוד',
    group: 'ניווט',
    keywords: ['log', 'record', 'תיעוד', 'רישום'],
  },
  'nav.timeline': {
    default: 'timeline',
    label: 'ציר זמן',
    group: 'ניווט',
    keywords: ['timeline', 'history', 'ציר זמן'],
  },
  'nav.stats': {
    default: 'monitoring',
    label: 'סטטיסטיקה',
    group: 'ניווט',
    keywords: ['stats', 'chart', 'סטטיסטיקה', 'גרף'],
  },
  'nav.tasting': {
    default: 'restaurant',
    label: 'טעימות',
    group: 'ניווט',
    keywords: ['tasting', 'food', 'טעימות', 'אוכל'],
  },
  'nav.settings': {
    default: 'settings',
    label: 'הגדרות',
    group: 'ניווט',
    keywords: ['settings', 'gear', 'הגדרות'],
  },
  'quick.meal': {
    default: 'water_bottle',
    label: 'ארוחה / בקבוק',
    group: 'כפתורים מהירים',
    keywords: ['meal', 'bottle', 'ארוחה', 'בקבוק'],
  },
  'quick.diaper': {
    default: 'baby_changing_station',
    label: 'החלפת חיתול',
    group: 'כפתורים מהירים',
    keywords: ['diaper', 'change', 'חיתול'],
  },
  'quick.sleep': {
    default: 'bedtime',
    label: 'שינה',
    group: 'כפתורים מהירים',
    keywords: ['sleep', 'moon', 'שינה', 'ירח'],
  },
  'quick.activity': {
    default: 'palette',
    label: 'תיעוד פעילות',
    group: 'כפתורים מהירים',
    keywords: ['activity', 'play', 'פעילות', 'משחק'],
  },
  'quick.weight': {
    default: 'scale',
    label: 'שקילה רפואית',
    group: 'כפתורים מהירים',
    keywords: ['weight', 'scale', 'שקילה', 'משקל'],
  },
  'quick.vomiting': {
    default: 'sick',
    label: 'פליטות / הקאות',
    group: 'כפתורים מהירים',
    keywords: ['vomit', 'spit up', 'פליטה', 'הקאה'],
  },
  'event.nutrition.bottle': {
    default: 'water_bottle',
    label: 'בקבוק',
    group: 'סוגי אירועים',
    keywords: ['bottle', 'formula', 'בקבוק', 'תמ״ל'],
  },
  'event.nutrition.breast': {
    default: 'breastfeeding',
    label: 'הנקה',
    group: 'סוגי אירועים',
    keywords: ['breast', 'nursing', 'הנקה'],
  },
  'event.diaper': {
    default: 'baby_changing_station',
    label: 'חיתול',
    group: 'סוגי אירועים',
    keywords: ['diaper', 'חיתול'],
  },
  'event.diaper.pee': {
    default: 'water_drop',
    label: 'חיתול — שתן',
    group: 'סוגי אירועים',
    keywords: ['pee', 'wet', 'שתן', 'פיפי'],
  },
  'event.diaper.poo': {
    default: 'circle',
    label: 'חיתול — צואה',
    group: 'סוגי אירועים',
    keywords: ['poo', 'stool', 'צואה', 'קקי'],
  },
  'event.diaper.both': {
    default: 'opacity',
    label: 'חיתול — שתן וצואה',
    group: 'סוגי אירועים',
    keywords: ['both', 'שניהם'],
  },
  'event.sleep': {
    default: 'bedtime',
    label: 'שינה',
    group: 'סוגי אירועים',
    keywords: ['sleep', 'nap', 'שינה'],
  },
  'event.activity': {
    default: 'palette',
    label: 'פעילות',
    group: 'סוגי אירועים',
    keywords: ['activity', 'play', 'פעילות'],
  },
  'event.weight': {
    default: 'scale',
    label: 'שקילה',
    group: 'סוגי אירועים',
    keywords: ['weight', 'scale', 'שקילה'],
  },
  'event.pumping': {
    default: 'water_drop',
    label: 'שאיבת חלב',
    group: 'סוגי אירועים',
    keywords: ['pumping', 'milk', 'שאיבה', 'חלב'],
  },
  'event.vomiting': {
    default: 'sick',
    label: 'פליטה / הקאה',
    group: 'סוגי אירועים',
    keywords: ['vomit', 'spit up', 'פליטה', 'הקאה'],
  },
  'event.supplement': {
    default: 'medication',
    label: 'תוסף (ביו גאיה)',
    group: 'סוגי אירועים',
    keywords: ['supplement', 'drops', 'תוסף', 'ביו גאיה'],
  },
  'location.crib': {
    default: 'crib',
    label: 'עריסה / מיטה',
    group: 'מיקומי שינה',
    keywords: ['crib', 'bed', 'עריסה', 'מיטה'],
  },
  'location.hands': {
    default: 'back_hand',
    label: 'על הידיים',
    group: 'מיקומי שינה',
    keywords: ['hands', 'arms', 'ידיים'],
  },
  'location.carrier': {
    default: 'backpack',
    label: 'מנשא',
    group: 'מיקומי שינה',
    keywords: ['carrier', 'sling', 'מנשא'],
  },
  'location.stroller': {
    default: 'stroller',
    label: 'עגלה',
    group: 'מיקומי שינה',
    keywords: ['stroller', 'pram', 'עגלה'],
  },
  'card.biogaya': {
    default: 'water_drop',
    label: 'ביו גאיה',
    group: 'כרטיסים',
    keywords: ['bio gaia', 'probiotic', 'ביו גאיה'],
  },
} as const satisfies Record<string, IconSlot>

export type SlotKey = keyof typeof ICON_SLOTS

export function isSlotKey(key: string): key is SlotKey {
  return Object.hasOwn(ICON_SLOTS, key)
}
