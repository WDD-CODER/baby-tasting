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
} as const satisfies Record<string, IconSlot>

export type SlotKey = keyof typeof ICON_SLOTS

export function isSlotKey(key: string): key is SlotKey {
  return Object.hasOwn(ICON_SLOTS, key)
}
