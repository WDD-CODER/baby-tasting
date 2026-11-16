// Tracker events: enums (spec-server-data §1.1), per-type validation (§1.3) and the stored shape. Pure, no I/O.

export const PARENT_TYPES = Object.freeze(['PARENT_A', 'PARENT_B'])
export const EVENT_TYPES = Object.freeze([
  'NUTRITION',
  'DIAPER',
  'SLEEP',
  'ACTIVITY',
  'WEIGHT',
  'PUMPING',
  'VOMITING',
  'SUPPLEMENT',
])
export const BOTTLE_LIQUID_TYPES = Object.freeze(['EXPRESSED_MILK', 'FORMULA'])
export const SPIT_UP_TYPES = Object.freeze(['NONE', 'LIGHT', 'HEAVY_VOMIT'])
export const BREAST_SIDES = Object.freeze(['LEFT', 'RIGHT', 'BOTH'])
export const FEED_TYPES = Object.freeze(['BREAST', 'BOTTLE'])
export const DIAPER_CONTENTS = Object.freeze(['PEE', 'POO', 'BOTH'])
export const PEE_VOLUMES = Object.freeze(['LIGHT', 'HEAVY_SOAKED'])
export const POO_AMOUNTS = Object.freeze(['SMALL', 'MEDIUM', 'LARGE_OVERFLOW'])
export const POO_COLORS = Object.freeze(['YELLOW_MUSTARD', 'GREEN', 'BROWN'])
export const POO_TEXTURES = Object.freeze(['LIQUID', 'SEEDY', 'PASTY', 'HARD'])
export const SLEEP_LOCATIONS = Object.freeze(['CRIB', 'HANDS', 'CARRIER', 'STROLLER'])
export const VOMITING_SIZES = Object.freeze(['SMALL', 'MEDIUM', 'LARGE'])
export const QUALITY_TIERS = Object.freeze(['BAD', 'OKAY', 'GOOD', 'GREAT'])

// The key under which each type keeps its payload.
export const PAYLOAD_KEY = Object.freeze({
  NUTRITION: 'nutrition',
  DIAPER: 'diaper',
  SLEEP: 'sleep',
  ACTIVITY: 'activity',
  WEIGHT: 'weight',
  PUMPING: 'pumping',
  VOMITING: 'vomiting',
  SUPPLEMENT: 'supplement',
})

const NOTE_MAX = 1000
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

// Each check returns an error text or null.
const oneOf = (list) => (v) => (list.includes(v) ? null : `must be one of ${list.join(', ')}`)
const num = (min, max) => (v) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? null : `must be a number from ${min} to ${max}`
const int = (min, max) => (v) =>
  Number.isInteger(v) && v >= min && v <= max ? null : `must be a whole number from ${min} to ${max}`
const bool = (v) => (typeof v === 'boolean' ? null : 'must be true or false')
const text = (max) => (v) =>
  typeof v === 'string' && v.trim().length >= 1 && v.trim().length <= max ? null : `must be 1-${max} characters`
export const isIso = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v) && !Number.isNaN(Date.parse(v))
const iso = (v) => (isIso(v) ? null : 'must be an ISO date-time')

const topUp = (v) => {
  if (v === null) return null
  if (!isObject(v)) return 'must be an object or null'
  for (const k of Object.keys(v)) if (k !== 'liquidType' && k !== 'consumedMl') return `${k} is not a field`
  if (oneOf(BOTTLE_LIQUID_TYPES)(v.liquidType)) return 'liquidType is invalid'
  return num(0, 2000)(v.consumedMl) ? 'consumedMl is invalid' : null
}

// name: [check, required]
const SPECS = {
  NUTRITION: {
    feedType: [oneOf(FEED_TYPES), true],
    breastSide: [oneOf(BREAST_SIDES)],
    durationMinutes: [num(0, 600)],
    bottleLiquidType: [oneOf(BOTTLE_LIQUID_TYPES)],
    amountOfferedMl: [num(0, 2000)],
    amountConsumedMl: [num(0, 2000)],
    spitUp: [oneOf(SPIT_UP_TYPES)],
    swallowingNoises: [bool],
    topUp: [topUp],
  },
  DIAPER: {
    contains: [oneOf(DIAPER_CONTENTS), true],
    peeVolume: [oneOf(PEE_VOLUMES)],
    pooAmount: [oneOf(POO_AMOUNTS)],
    pooColor: [oneOf(POO_COLORS)],
    pooTexture: [oneOf(POO_TEXTURES)],
  },
  // startedBy / endedBy / durationMinutes are never accepted from a client: the server sets them.
  SLEEP: {
    startAt: [iso, true],
    endAt: [(v) => (v === null ? null : iso(v))],
    startLocation: [oneOf(SLEEP_LOCATIONS)],
  },
  ACTIVITY: { activityName: [text(60), true], cryingIntensity: [int(1, 10)] },
  WEIGHT: { weightGrams: [num(100, 30000), true], percentile: [num(0, 100)] },
  PUMPING: { leftAmountMl: [num(0, 2000), true], rightAmountMl: [num(0, 2000), true] },
  VOMITING: { size: [oneOf(VOMITING_SIZES), true] },
  SUPPLEMENT: { name: [text(60), true] },
}

const TOP_KEYS = ['eventType', 'timestamp', 'note', 'quickRecorded']
// Accepted and ignored: the server decides the id and who logged it.
const IGNORED_KEYS = ['id', 'loggedBy']

export function validatePayload(type, payload) {
  const spec = SPECS[type]
  if (!spec) return [{ field: 'eventType', message: `must be one of ${EVENT_TYPES.join(', ')}` }]
  const key = PAYLOAD_KEY[type]
  if (!isObject(payload)) return [{ field: key, message: 'is required and must be an object' }]
  const errors = []
  for (const name of Object.keys(payload)) {
    if (!spec[name]) errors.push({ field: `${key}.${name}`, message: 'is not a field of this event type' })
  }
  for (const [name, [check, required]] of Object.entries(spec)) {
    const value = payload[name]
    if (value === undefined) {
      if (required) errors.push({ field: `${key}.${name}`, message: 'is required' })
      continue
    }
    const message = check(value)
    if (message) errors.push({ field: `${key}.${name}`, message })
  }
  if (type === 'SLEEP' && errors.length === 0 && payload.endAt && Date.parse(payload.endAt) < Date.parse(payload.startAt)) {
    errors.push({ field: 'sleep.endAt', message: 'must not be before startAt' })
  }
  return errors
}

// Checks an event body for `type`. With `partial`, only the keys present are checked (an edit).
export function validateEvent(type, body, { partial = false } = {}) {
  if (!EVENT_TYPES.includes(type)) {
    return { ok: false, errors: [{ field: 'eventType', message: `must be one of ${EVENT_TYPES.join(', ')}` }] }
  }
  if (!isObject(body)) return { ok: false, errors: [{ field: '', message: 'body must be an object' }] }
  const key = PAYLOAD_KEY[type]
  const errors = []
  for (const name of Object.keys(body)) {
    if (!TOP_KEYS.includes(name) && !IGNORED_KEYS.includes(name) && name !== key) {
      errors.push({ field: name, message: 'is not a field of this event type' })
    }
  }
  if (body.timestamp !== undefined && iso(body.timestamp)) errors.push({ field: 'timestamp', message: 'must be an ISO date-time' })
  if (body.quickRecorded !== undefined && bool(body.quickRecorded)) {
    errors.push({ field: 'quickRecorded', message: 'must be true or false' })
  }
  if (body.note !== undefined && body.note !== null && (typeof body.note !== 'string' || body.note.length > NOTE_MAX)) {
    errors.push({ field: 'note', message: `must be text of at most ${NOTE_MAX} characters or null` })
  }
  if (!partial || body[key] !== undefined) errors.push(...validatePayload(type, body[key]))
  return { ok: errors.length === 0, errors }
}

// A note that is empty or null means "no note".
export function normalizeNote(note) {
  if (typeof note !== 'string') return null
  const trimmed = note.trim()
  return trimmed === '' ? null : trimmed
}

// The document fields for a validated create body. `now` is an ISO string passed in by the caller.
export function normalizeEvent(type, body, { now, loggedBy }) {
  const key = PAYLOAD_KEY[type]
  const payload = { ...body[key] }
  const timestamp = type === 'SLEEP' ? payload.startAt : (body.timestamp ?? now)
  const doc = { eventType: type, timestamp: new Date(timestamp).toISOString(), loggedBy, [key]: payload }
  const note = normalizeNote(body.note)
  if (note) doc.note = note
  if (typeof body.quickRecorded === 'boolean') doc.quickRecorded = body.quickRecorded
  return doc
}

// The shape the API returns: no household, audit or storage fields.
export function toApiEvent(doc) {
  const out = { id: String(doc._id), eventType: doc.eventType, timestamp: doc.timestamp, loggedBy: doc.loggedBy }
  if (doc.note) out.note = doc.note
  if (doc.quickRecorded !== undefined) out.quickRecorded = doc.quickRecorded
  const key = PAYLOAD_KEY[doc.eventType]
  if (key && doc[key] !== undefined) out[key] = doc[key]
  return out
}
