import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkDuplicate, checkPlacement, checkStatus, deriveFoodStatus } from './calendar-rules.js'
import { isoAddDays, weekStartSunday } from './dates.js'

test('checkPlacement keeps allergen foods in meal 1', () => {
  assert.equal(checkPlacement({ food: { allergenId: 'a' }, meal: 1 }), null)
  assert.equal(checkPlacement({ food: { allergenId: 'a' }, meal: 2 }), 'allergen_meal_1')
  assert.equal(checkPlacement({ food: { allergenId: null }, meal: 3 }), null)
})

test('checkDuplicate finds the same food in the same meal, ignoring excludeId', () => {
  const items = [{ _id: 'i1', date: '2026-11-15', meal: 2, foodId: 'f1' }]
  assert.equal(checkDuplicate({ items, date: '2026-11-15', meal: 2, foodId: 'f1' }), 'duplicate_in_meal')
  assert.equal(checkDuplicate({ items, date: '2026-11-15', meal: 3, foodId: 'f1' }), null)
  assert.equal(checkDuplicate({ items, date: '2026-11-15', meal: 2, foodId: 'f1', excludeId: 'i1' }), null)
})

test('checkStatus refuses given in the future only', () => {
  assert.equal(checkStatus({ status: 'given', date: '2026-11-16', today: '2026-11-15' }), 'given_in_future')
  assert.equal(checkStatus({ status: 'given', date: '2026-11-15', today: '2026-11-15' }), null)
  assert.equal(checkStatus({ status: 'planned', date: '2026-11-20', today: '2026-11-15' }), null)
})

test('deriveFoodStatus counts only given items', () => {
  const items = [
    { foodId: 'f1', status: 'given', date: '2026-11-10', meal: 1, liked: true },
    { foodId: 'f1', status: 'given', date: '2026-11-12', meal: 2, liked: null },
    { foodId: 'f1', status: 'planned', date: '2026-11-13', meal: 2, liked: false },
    { foodId: 'f2', status: 'skipped', date: '2026-11-10', meal: 1, liked: null },
  ]
  const map = deriveFoodStatus(items)
  assert.deepEqual(map.f1, { tried: true, firstDate: '2026-11-10', timesGiven: 2, liked: true })
  assert.equal(map.f2, undefined)
})

test('date helpers', () => {
  assert.equal(isoAddDays('2026-11-30', 1), '2026-12-01')
  assert.equal(weekStartSunday('2026-11-15'), '2026-11-15')
  assert.equal(weekStartSunday('2026-11-21'), '2026-11-15')
})
