// The Tracker settings of a household: defaults (spec-server-data §1.2) and validation (pure, no I/O).
import { ICON_NAMES, ICON_SLOT_KEYS } from './icon-names.js'

export const BOTTLE_TYPES = Object.freeze(['EXPRESSED_MILK', 'FORMULA'])
export const QUICK_ACTION_IDS = Object.freeze(['meal', 'diaper', 'sleep', 'activity', 'weight', 'vomiting'])

export const TRACKER_DEFAULTS = Object.freeze({
  parentAName: 'אמא',
  parentBName: 'אבא',
  defaultBottleType: 'EXPRESSED_MILK',
  customActivities: Object.freeze(['שגרת בוקר', 'בייבי יוגה', 'שירים', 'טיול בעגלה', 'עיסוי תינוקות']),
  quickActionOrder: QUICK_ACTION_IDS,
  quickActionsMinimized: Object.freeze([]),
  iconOverrides: Object.freeze({}),
})

const NAME_MAX = 40
const ACTIVITY_MAX = 40
const ACTIVITIES_MAX = 50

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

function checkName(value) {
  return typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= NAME_MAX
}

const CHECKS = {
  parentAName: (v) => (checkName(v) ? null : `parentAName must be 1-${NAME_MAX} characters`),
  parentBName: (v) => (checkName(v) ? null : `parentBName must be 1-${NAME_MAX} characters`),
  defaultBottleType: (v) => (BOTTLE_TYPES.includes(v) ? null : `defaultBottleType must be one of ${BOTTLE_TYPES.join(', ')}`),
  customActivities: (v) => {
    if (!Array.isArray(v) || v.length > ACTIVITIES_MAX) return `customActivities must be a list of at most ${ACTIVITIES_MAX}`
    const bad = v.some((a) => typeof a !== 'string' || a.trim().length < 1 || a.trim().length > ACTIVITY_MAX)
    return bad ? `each activity must be 1-${ACTIVITY_MAX} characters` : null
  },
  quickActionOrder: (v) => {
    if (!Array.isArray(v)) return 'quickActionOrder must be a list'
    if (v.some((id) => !QUICK_ACTION_IDS.includes(id))) return `quickActionOrder ids must be ${QUICK_ACTION_IDS.join(', ')}`
    return new Set(v).size === v.length ? null : 'quickActionOrder has a repeated id'
  },
  quickActionsMinimized: (v) => {
    if (!Array.isArray(v)) return 'quickActionsMinimized must be a list'
    if (v.some((id) => !QUICK_ACTION_IDS.includes(id))) return `quickActionsMinimized ids must be ${QUICK_ACTION_IDS.join(', ')}`
    return new Set(v).size === v.length ? null : 'quickActionsMinimized has a repeated id'
  },
  iconOverrides: (v) => {
    if (!isPlainObject(v)) return 'iconOverrides must be an object'
    for (const [slot, name] of Object.entries(v)) {
      if (!ICON_SLOT_KEYS.has(slot)) return `${slot} is not an icon slot`
      if (typeof name !== 'string' || !ICON_NAMES.has(name)) return `${String(name)} is not an icon name`
    }
    return null
  },
}

// Checks a partial set of Tracker settings: every given key must be known and valid.
export function validateTrackerSettings(partial) {
  if (!isPlainObject(partial)) return { ok: false, errors: [{ field: '', message: 'settings must be an object' }] }
  const errors = []
  for (const [field, value] of Object.entries(partial)) {
    const check = CHECKS[field]
    const message = check ? check(value) : `${field} is not a tracker setting`
    if (message) errors.push({ field, message })
  }
  return { ok: errors.length === 0, errors }
}

// The values to store: names and activities trimmed.
export function normalizeTrackerSettings(partial) {
  const out = { ...partial }
  if (typeof out.parentAName === 'string') out.parentAName = out.parentAName.trim()
  if (typeof out.parentBName === 'string') out.parentBName = out.parentBName.trim()
  if (Array.isArray(out.customActivities)) out.customActivities = out.customActivities.map((a) => a.trim())
  return out
}

// Known ids in the saved order, then any missing id in the default order.
export function reconcileQuickActionOrder(saved) {
  const known = Array.isArray(saved) ? saved.filter((id, i) => QUICK_ACTION_IDS.includes(id) && saved.indexOf(id) === i) : []
  return [...known, ...QUICK_ACTION_IDS.filter((id) => !known.includes(id))]
}

// Stored values (possibly partial or empty) over the defaults; invalid stored values are ignored.
export function withTrackerDefaults(stored) {
  const out = {
    ...TRACKER_DEFAULTS,
    customActivities: [...TRACKER_DEFAULTS.customActivities],
    quickActionsMinimized: [],
    iconOverrides: {},
  }
  if (!isPlainObject(stored)) return { ...out, quickActionOrder: [...QUICK_ACTION_IDS] }
  for (const field of Object.keys(CHECKS)) {
    if (field in stored && CHECKS[field](stored[field]) === null) out[field] = stored[field]
  }
  out.quickActionOrder = reconcileQuickActionOrder(out.quickActionOrder)
  const minimized = stored.quickActionsMinimized
  out.quickActionsMinimized = Array.isArray(minimized)
    ? minimized.filter((id, i) => QUICK_ACTION_IDS.includes(id) && minimized.indexOf(id) === i)
    : []
  out.iconOverrides = { ...out.iconOverrides }
  out.customActivities = [...out.customActivities]
  return out
}

export function parentNameFor(tracker, parentType) {
  return parentType === 'PARENT_B' ? tracker.parentBName : tracker.parentAName
}
