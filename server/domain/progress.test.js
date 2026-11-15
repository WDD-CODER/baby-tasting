import { test } from 'node:test'
import assert from 'node:assert/strict'
import { summarize } from './progress.js'

test('summarize counts active foods only, per category, and allergens by state', () => {
  const foods = [
    { id: 'a', category: 'fruit', archived: false },
    { id: 'b', category: 'fruit' },
    { id: 'c', category: 'veg', archived: false },
    { id: 'd', category: 'veg', archived: true },
  ]
  const statuses = { a: { tried: true }, d: { tried: true } }
  const out = summarize({ foods, statuses, allergenStates: ['introducing', 'introducing', 'locked', 'finished'] })
  assert.equal(out.tried, 1)
  assert.equal(out.total, 3)
  assert.deepEqual(out.byCategory, [
    { category: 'fruit', tried: 1, total: 2 },
    { category: 'veg', tried: 0, total: 1 },
  ])
  assert.deepEqual(out.allergensByState, { not_started: 0, introducing: 2, maintenance: 0, finished: 1, locked: 1 })
})

test('summarize of nothing is all zeros', () => {
  const out = summarize({ foods: [], statuses: {}, allergenStates: [] })
  assert.equal(out.tried, 0)
  assert.equal(out.total, 0)
  assert.deepEqual(out.byCategory, [])
})
