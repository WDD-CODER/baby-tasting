import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SETTINGS, validateSettings, withDefaults } from './settings.js'

test('defaults are the program values', () => {
  assert.deepEqual(
    { ...DEFAULT_SETTINGS },
    {
      introDays: 3,
      maintenancePerWeek: 2,
      maintenanceGapDays: 5,
      maintenanceUntilMonths: 24,
      maxAllergensPerMeal: 2,
      newFoodsPerWeek: 3,
    },
  )
})

test('withDefaults fills missing values and ignores bad stored ones', () => {
  assert.deepEqual(withDefaults({}), { ...DEFAULT_SETTINGS })
  assert.deepEqual(withDefaults(null), { ...DEFAULT_SETTINGS })
  assert.equal(withDefaults({ introDays: 4 }).introDays, 4)
  assert.equal(withDefaults({ introDays: 99 }).introDays, 3)
})

test('validateSettings accepts in-range values at the edges', () => {
  assert.equal(validateSettings({}).ok, true)
  assert.equal(validateSettings({ introDays: 1, maintenancePerWeek: 7, maintenanceGapDays: 14, maintenanceUntilMonths: 6 }).ok, true)
  assert.equal(validateSettings({ maintenanceUntilMonths: 36, maintenanceGapDays: 2 }).ok, true)
  assert.equal(validateSettings({ maxAllergensPerMeal: 1, newFoodsPerWeek: 0 }).ok, true)
  assert.equal(validateSettings({ maxAllergensPerMeal: 5, newFoodsPerWeek: 7 }).ok, true)
})

test('validateSettings refuses out-of-range, non-integer and unknown values', () => {
  for (const bad of [
    { introDays: 8 },
    { introDays: 0 },
    { maintenanceGapDays: 1 },
    { maintenanceUntilMonths: 40 },
    { maintenancePerWeek: 2.5 },
    { introDays: '3' },
    { maxAllergensPerMeal: 0 },
    { maxAllergensPerMeal: 6 },
    { newFoodsPerWeek: -1 },
    { newFoodsPerWeek: 8 },
    { nope: 1 },
  ]) {
    const res = validateSettings(bad)
    assert.equal(res.ok, false, JSON.stringify(bad))
    assert.ok(res.errors.length > 0)
  }
  assert.equal(validateSettings(null).ok, false)
})
