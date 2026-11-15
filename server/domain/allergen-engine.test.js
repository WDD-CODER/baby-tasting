import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeAllergens } from './allergen-engine.js'
import { ageInMonths, isoAddDays } from './dates.js'
import { DEFAULT_SETTINGS } from './settings.js'

const D1 = '2026-03-02' // a Monday
const day = (n) => isoAddDays(D1, n - 1)
const allergens = [{ id: 'a1', name: 'שומשום', archived: false }]
const foods = [
  { id: 'f1', allergenId: 'a1' },
  { id: 'f2', allergenId: 'a1' },
  { id: 'plain', allergenId: null },
]
const given = (days, foodId = 'f1') => days.map((n) => ({ date: day(n), foodId, status: 'given' }))

function run({ days = [], today, settings = {}, birthDate = '2026-01-01', items, al = allergens }) {
  const res = computeAllergens({
    birthDate,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    allergens: al,
    foods,
    items: items ?? given(days),
    today: typeof today === 'number' ? day(today) : today,
  })
  return { one: res.allergens[0], alerts: res.alerts, res }
}

test('given on days 1, 2, 3 -> maintenance from day 3', () => {
  const { one, alerts } = run({ days: [1, 2, 3], today: 3 })
  assert.equal(one.state, 'maintenance')
  assert.equal(one.intro.completedOn, day(3))
  assert.deepEqual(alerts, [])
})

test('given on days 1 and 3 only -> day 4 still introducing 2/3, missing day 2, one intro_missing', () => {
  const { one, alerts } = run({ days: [1, 3], today: 4 })
  assert.equal(one.state, 'introducing')
  assert.equal(one.intro.daysGiven, 2)
  assert.equal(one.intro.required, 3)
  assert.deepEqual(one.intro.missingDays, [day(2)])
  assert.deepEqual(alerts, [{ id: 'intro_missing:a1', kind: 'intro_missing', allergenId: 'a1' }])
})

test('intro_missing clears when it is given today', () => {
  const { alerts } = run({ days: [1, 3, 4], today: 4 })
  assert.deepEqual(alerts, [])
})

test('given late on day 5 completes the introduction on day 5, no restart', () => {
  const { one, alerts } = run({ days: [1, 3, 5], today: 5 })
  assert.equal(one.state, 'maintenance')
  assert.equal(one.intro.completedOn, day(5))
  assert.equal(one.intro.firstDay, day(1))
  assert.deepEqual(alerts, [])
})

test('maintenance with last given 6 days ago -> one maintenance_gap with n = 6', () => {
  const { alerts } = run({ days: [1, 2, 3], today: 9 })
  assert.deepEqual(alerts, [{ id: 'maintenance_gap:a1', kind: 'maintenance_gap', allergenId: 'a1', n: 6 }])
})

test('two given days this week with target 2 -> no maintenance_week alert', () => {
  // day 8 is the Monday of the next week; Thursday is day 11
  const { alerts, one } = run({ days: [1, 2, 3, 8, 9], today: 11 })
  assert.equal(one.weekCount, 2)
  assert.deepEqual(alerts, [])
})

test('maintenance_week from Thursday when under target, not before', () => {
  const thursday = run({ days: [1, 2, 3, 8], today: 11 })
  assert.deepEqual(thursday.alerts, [
    { id: 'maintenance_week:a1', kind: 'maintenance_week', allergenId: 'a1', x: 1, y: 2 },
  ])
  const wednesday = run({ days: [1, 2, 3, 8], today: 10 })
  assert.deepEqual(wednesday.alerts, [])
})

test('the week an introduction completes never nags', () => {
  const { alerts } = run({ days: [1, 2, 3], today: 6 }) // Saturday after completing on Wednesday
  assert.deepEqual(alerts, [])
})

test('a gap replaces the weekly alert (one alert per allergen)', () => {
  const { alerts } = run({ days: [1, 2, 3], today: 11 })
  assert.equal(alerts.length, 1)
  assert.equal(alerts[0].kind, 'maintenance_gap')
})

test('aged 24 months with the introduction complete -> finished, no alerts', () => {
  const { one, alerts } = run({ days: [1, 2, 3], today: 20, birthDate: '2024-03-01' })
  assert.equal(ageInMonths('2024-03-01', day(20)), 24)
  assert.equal(one.state, 'finished')
  assert.deepEqual(alerts, [])
})

test('no birth date -> never finished, no error', () => {
  const { one } = run({ days: [1, 2, 3], today: 3, birthDate: null })
  assert.equal(one.state, 'maintenance')
  const { one: late } = run({ days: [1, 2, 3], today: '2040-01-01', birthDate: null })
  assert.notEqual(late.state, 'finished')
})

test('an archived allergen has no state and no alerts', () => {
  const { res } = run({ days: [1, 3], today: 4, al: [{ id: 'a1', name: 'x', archived: true }] })
  assert.deepEqual(res, { allergens: [], alerts: [] })
})

test('any food of the allergen counts; other statuses and plain foods do not', () => {
  const items = [
    ...given([1], 'f1'),
    ...given([2], 'f2'),
    { date: day(3), foodId: 'f1', status: 'planned' },
    ...given([3], 'plain'),
  ]
  const { one } = run({ items, today: 3 })
  assert.equal(one.givenDays, 2)
  assert.equal(one.state, 'introducing')
})

test('not started allergen has no alerts', () => {
  const { one, alerts } = run({ days: [], today: 5 })
  assert.equal(one.state, 'not_started')
  assert.deepEqual(alerts, [])
})

test('introDays: 4 turns days 1-2-3 back into introducing 3/4', () => {
  const { one } = run({ days: [1, 2, 3], today: 3, settings: { introDays: 4 } })
  assert.equal(one.state, 'introducing')
  assert.equal(one.intro.daysGiven, 3)
  assert.equal(one.intro.required, 4)
})

test('ageInMonths counts whole months', () => {
  assert.equal(ageInMonths('2026-01-31', '2026-02-28'), 0)
  assert.equal(ageInMonths('2026-01-15', '2026-03-15'), 2)
  assert.equal(ageInMonths('2026-01-15', '2026-03-14'), 1)
})

test('a locked allergen: state locked, baseState kept, no reminder alerts and exactly one locked alert', () => {
  const base = { birthDate: '2026-01-01', settings: DEFAULT_SETTINGS, allergens, foods }
  const locks = [{ targetType: 'allergen', targetId: 'a1' }]
  const intro = computeAllergens({ ...base, items: given([1, 3]), today: day(4), locks })
  assert.equal(intro.allergens[0].state, 'locked')
  assert.equal(intro.allergens[0].baseState, 'introducing')
  assert.deepEqual(intro.alerts.map((a) => a.kind), ['locked'])
  assert.equal(intro.alerts[0].id, 'locked:a1')
  const gap = computeAllergens({ ...base, items: given([1, 2, 3]), today: day(30), locks })
  assert.equal(gap.allergens[0].baseState, 'maintenance')
  assert.deepEqual(gap.alerts.map((a) => a.kind), ['locked'])
  const open = computeAllergens({ ...base, items: given([1, 2, 3]), today: day(30) })
  assert.equal(open.alerts[0].kind, 'maintenance_gap')
})
