import { test } from 'node:test'
import assert from 'node:assert/strict'
import { foodLockAlerts, isPlacementLocked, locksForReaction } from './locks.js'

const foods = [
  { id: 'tahini', name: 'טחינה', allergenId: 'sesame' },
  { id: 'banana', name: 'בננה', allergenId: null },
  { id: 'pear', name: 'אגס', allergenId: null },
]

test('a reaction linked only to tahini still locks the banana of the same meal', () => {
  const items = [
    { date: '2026-03-02', meal: 1, foodId: 'tahini' },
    { date: '2026-03-02', meal: 1, foodId: 'banana' },
  ]
  const res = locksForReaction({ items, foods })
  assert.deepEqual(res.allergenIds, ['sesame'])
  assert.deepEqual(res.foodIds, ['banana'])
})

test('allergen foods lock their allergen once, not the food', () => {
  const items = [
    { date: 'd', meal: 1, foodId: 'tahini' },
    { date: 'd', meal: 1, foodId: 'tahini' },
  ]
  assert.deepEqual(locksForReaction({ items, foods }), { allergenIds: ['sesame'], foodIds: [] })
})

test('isPlacementLocked checks the food and its allergen', () => {
  assert.equal(isPlacementLocked({ food: foods[1], lockedFoodIds: ['banana'], lockedAllergenIds: [] }), true)
  assert.equal(isPlacementLocked({ food: foods[0], lockedFoodIds: [], lockedAllergenIds: ['sesame'] }), true)
  assert.equal(isPlacementLocked({ food: foods[2], lockedFoodIds: ['banana'], lockedAllergenIds: ['sesame'] }), false)
  assert.equal(isPlacementLocked({ food: undefined }), false)
})

test('foodLockAlerts carries the name and the future planned count', () => {
  const locks = [
    { targetType: 'food', targetId: 'banana' },
    { targetType: 'allergen', targetId: 'sesame' },
  ]
  const items = [
    { date: '2026-03-05', status: 'planned', foodId: 'banana' },
    { date: '2026-03-01', status: 'planned', foodId: 'banana' },
    { date: '2026-03-06', status: 'given', foodId: 'banana' },
  ]
  assert.deepEqual(foodLockAlerts({ locks, items, foods, today: '2026-03-02' }), [
    { id: 'locked-food:banana', kind: 'locked', foodId: 'banana', targetName: 'בננה', plannedCount: 1 },
  ])
})
