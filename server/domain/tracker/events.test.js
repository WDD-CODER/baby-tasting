import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BREAST_SIDES,
  EVENT_TYPES,
  normalizeEvent,
  normalizeNote,
  toApiEvent,
  validateEvent,
} from './events.js'
import { TIER_LABELS, classifyDiaper, classifyNutrition, classifySleep, classifyWeight } from './quality.js'

const VALID = {
  NUTRITION: { feedType: 'BOTTLE', bottleLiquidType: 'FORMULA', amountOfferedMl: 120, amountConsumedMl: 100, topUp: null },
  DIAPER: { contains: 'BOTH', peeVolume: 'LIGHT', pooAmount: 'SMALL', pooColor: 'GREEN', pooTexture: 'PASTY' },
  SLEEP: { startAt: '2026-07-04T10:00:00.000Z', endAt: null, startLocation: 'CRIB' },
  ACTIVITY: { activityName: 'שירים', cryingIntensity: 3 },
  WEIGHT: { weightGrams: 5200, percentile: 40 },
  PUMPING: { leftAmountMl: 60, rightAmountMl: 50 },
  VOMITING: { size: 'SMALL' },
  SUPPLEMENT: { name: 'ביו גאיה' },
}
const key = (t) => t.toLowerCase()

test('every event type validates a correct body', () => {
  assert.equal(EVENT_TYPES.length, 8)
  for (const type of EVENT_TYPES) {
    const res = validateEvent(type, { eventType: type, [key(type)]: VALID[type] })
    assert.deepEqual(res.errors, [], type)
    assert.equal(res.ok, true)
  }
})

test('an unknown event type is rejected', () => {
  assert.equal(validateEvent('SNEEZE', {}).ok, false)
})

test('each enum rejects an unknown value', () => {
  const cases = [
    ['NUTRITION', 'feedType'],
    ['NUTRITION', 'breastSide'],
    ['NUTRITION', 'bottleLiquidType'],
    ['NUTRITION', 'spitUp'],
    ['DIAPER', 'contains'],
    ['DIAPER', 'peeVolume'],
    ['DIAPER', 'pooAmount'],
    ['DIAPER', 'pooColor'],
    ['DIAPER', 'pooTexture'],
    ['SLEEP', 'startLocation'],
    ['VOMITING', 'size'],
  ]
  for (const [type, field] of cases) {
    const body = { [key(type)]: { ...VALID[type], [field]: 'NOPE' } }
    const res = validateEvent(type, body)
    assert.equal(res.ok, false, `${type}.${field}`)
    assert.ok(res.errors.some((e) => e.field === `${key(type)}.${field}`), `${type}.${field}`)
  }
  const topUp = validateEvent('NUTRITION', { nutrition: { feedType: 'BREAST', topUp: { liquidType: 'NOPE', consumedMl: 5 } } })
  assert.equal(topUp.ok, false)
  assert.deepEqual(BREAST_SIDES, ['LEFT', 'RIGHT', 'BOTH'])
})

test('required fields, unknown fields and bad numbers are rejected', () => {
  assert.equal(validateEvent('NUTRITION', { nutrition: {} }).ok, false)
  assert.equal(validateEvent('DIAPER', {}).ok, false)
  assert.equal(validateEvent('DIAPER', { diaper: { contains: 'PEE', colour: 'x' } }).ok, false)
  assert.equal(validateEvent('WEIGHT', { weight: { weightGrams: -5 } }).ok, false)
  assert.equal(validateEvent('ACTIVITY', { activity: { activityName: 'x', cryingIntensity: 11 } }).ok, false)
  assert.equal(validateEvent('VOMITING', { vomiting: { size: 'SMALL' }, extra: 1 }).ok, false)
  assert.equal(validateEvent('VOMITING', { vomiting: { size: 'SMALL' }, timestamp: 'yesterday' }).ok, false)
  // a client cannot set who started or ended a sleep
  assert.equal(validateEvent('SLEEP', { sleep: { startAt: '2026-07-04T10:00:00.000Z', startedBy: 'PARENT_A' } }).ok, false)
  assert.equal(
    validateEvent('SLEEP', { sleep: { startAt: '2026-07-04T10:00:00.000Z', endAt: '2026-07-04T09:00:00.000Z' } }).ok,
    false,
  )
})

test('partial validation checks only the keys present', () => {
  assert.equal(validateEvent('SLEEP', { note: 'x' }, { partial: true }).ok, true)
  assert.equal(validateEvent('SLEEP', { note: 5 }, { partial: true }).ok, false)
})

test('normalizeNote empties blank notes', () => {
  assert.equal(normalizeNote(''), null)
  assert.equal(normalizeNote('  '), null)
  assert.equal(normalizeNote(null), null)
  assert.equal(normalizeNote(' hi '), 'hi')
})

test('normalizeEvent takes loggedBy from the caller and the sleep timestamp from startAt', () => {
  const doc = normalizeEvent('SLEEP', { sleep: VALID.SLEEP, loggedBy: 'PARENT_B', note: ' ' }, {
    now: '2026-07-05T00:00:00.000Z',
    loggedBy: 'PARENT_A',
  })
  assert.equal(doc.loggedBy, 'PARENT_A')
  assert.equal(doc.timestamp, '2026-07-04T10:00:00.000Z')
  assert.equal('note' in doc, false)
  const w = normalizeEvent('WEIGHT', { weight: VALID.WEIGHT }, { now: '2026-07-05T00:00:00.000Z', loggedBy: 'PARENT_A' })
  assert.equal(w.timestamp, '2026-07-05T00:00:00.000Z')
})

test('toApiEvent hides storage fields', () => {
  const out = toApiEvent({ _id: 'abc', householdId: 'h', createdBy: 'x', eventType: 'WEIGHT', timestamp: 't', loggedBy: 'PARENT_A', weight: { weightGrams: 5000 } })
  assert.deepEqual(out, { id: 'abc', eventType: 'WEIGHT', timestamp: 't', loggedBy: 'PARENT_A', weight: { weightGrams: 5000 } })
})

test('quality tiers for sample events (§1.4)', () => {
  assert.equal(classifyNutrition({ feedType: 'BREAST', durationMinutes: 3 }), 'BAD')
  assert.equal(classifyNutrition({ feedType: 'BREAST' }), 'BAD')
  assert.equal(classifyNutrition({ feedType: 'BREAST', durationMinutes: 15 }), 'GOOD')
  assert.equal(classifyNutrition({ feedType: 'BREAST', durationMinutes: 16 }), 'GREAT')
  assert.equal(classifyNutrition({ feedType: 'BOTTLE', amountOfferedMl: 0 }), 'OKAY')
  assert.equal(classifyNutrition({ feedType: 'BOTTLE', amountOfferedMl: 100, amountConsumedMl: 49 }), 'BAD')
  assert.equal(classifyNutrition({ feedType: 'BOTTLE', amountOfferedMl: 100, amountConsumedMl: 79 }), 'OKAY')
  assert.equal(classifyNutrition({ feedType: 'BOTTLE', amountOfferedMl: 100, amountConsumedMl: 99 }), 'GOOD')
  assert.equal(classifyNutrition({ feedType: 'BOTTLE', amountOfferedMl: 100, amountConsumedMl: 100 }), 'GREAT')
  assert.equal(classifySleep(29), 'BAD')
  assert.equal(classifySleep(45), 'GOOD')
  assert.equal(classifySleep(46), 'GREAT')
  assert.equal(classifyDiaper({ contains: 'POO', pooTexture: 'HARD' }), 'BAD')
  assert.equal(classifyDiaper({ contains: 'BOTH', pooAmount: 'LARGE_OVERFLOW' }), 'BAD')
  assert.equal(classifyDiaper({ contains: 'PEE', peeVolume: 'LIGHT' }), 'OKAY')
  assert.equal(classifyDiaper({ contains: 'PEE', peeVolume: 'HEAVY_SOAKED' }), 'GOOD')
  assert.equal(classifyDiaper({ contains: 'POO', pooAmount: 'SMALL' }), 'GOOD')
  assert.equal(classifyDiaper({ contains: 'PEE' }), 'OKAY')
  assert.equal(classifyWeight(5000, null), 'OKAY')
  assert.equal(classifyWeight(4900, 5000), 'BAD')
  assert.equal(classifyWeight(5100, 5000), 'GOOD')
  assert.equal(classifyWeight(5000, 5000), 'OKAY')
  assert.equal(TIER_LABELS.GREAT, 'מצוין')
})
