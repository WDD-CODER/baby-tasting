import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SETTINGS } from './settings.js'
import { noSuggestionsReason, suggestWeek } from './suggestions.js'

// 2026-11-15 is a Sunday.
const WEEK = '2026-11-15'
const day = (n) => `2026-11-${String(15 + n).padStart(2, '0')}`

const allergens = [
  { id: 'a-sesame', name: 'שומשום' },
  { id: 'a-egg', name: 'ביצה' },
  { id: 'a-milk', name: 'חלב' },
  { id: 'a-nut', name: 'בוטנים' },
]
const baseFoods = [
  { id: 'f-tahini', name: 'טחינה', allergenId: 'a-sesame', archived: false, tried: true, lastGivenDate: day(0) },
  { id: 'f-egg', name: 'ביצה קשה', allergenId: 'a-egg', archived: false, tried: true, lastGivenDate: day(-1) },
  { id: 'f-milk', name: 'יוגורט', allergenId: 'a-milk', archived: false, tried: true, lastGivenDate: day(-1) },
  { id: 'f-nut', name: 'חמאת בוטנים', allergenId: 'a-nut', archived: false, tried: false, lastGivenDate: null },
  ...['pear', 'apple', 'plum', 'fig', 'peach', 'melon'].map((n) => ({
    id: `f-${n}`,
    name: n,
    allergenId: null,
    archived: false,
    tried: false,
    lastGivenDate: null,
  })),
]

const entry = (allergenId, state, daysGiven = 0) => ({
  allergenId,
  state,
  intro: { daysGiven, required: 3, firstDay: daysGiven ? day(0) : null },
})
const engineOf = (...entries) => ({ allergens: entries })

function run(over = {}) {
  return suggestWeek({
    engine: engineOf(entry('a-sesame', 'not_started'), entry('a-egg', 'not_started')),
    foods: baseFoods,
    allergens,
    queue: ['none'], // a non-empty queue that matches no food (an empty queue falls back to untried foods)
    weekItems: [],
    settings: { ...DEFAULT_SETTINGS },
    weekStart: WEEK,
    today: WEEK,
    ...over,
  })
}
const of = (list, foodId) => list.filter((s) => s.foodId === foodId)

test('an allergen at 1/3 given today gets tomorrow and the day after in meal 1', () => {
  const res = run({
    engine: engineOf(entry('a-sesame', 'introducing', 1)),
    weekItems: [{ date: day(0), meal: 1, foodId: 'f-tahini', status: 'given' }],
  })
  assert.deepEqual(
    res.map((s) => [s.date, s.meal, s.foodId, s.reason.kind, s.reason.n, s.reason.total]),
    [
      [day(1), 1, 'f-tahini', 'intro', 2, 3],
      [day(2), 1, 'f-tahini', 'intro', 3, 3],
    ],
  )
})

test('two maintenance allergens get two days each and avoid the introduction day', () => {
  const res = run({
    engine: engineOf(entry('a-sesame', 'introducing', 2), entry('a-egg', 'maintenance', 3), entry('a-milk', 'maintenance', 3)),
    weekItems: [
      { date: day(0), meal: 1, foodId: 'f-tahini', status: 'given' },
      { date: day(-1), meal: 1, foodId: 'f-tahini', status: 'given' },
    ],
    today: day(0),
  })
  const intro = of(res, 'f-tahini').map((s) => s.date)
  assert.deepEqual(intro, [day(1)])
  for (const id of ['f-egg', 'f-milk']) {
    const days = of(res, id).map((s) => s.date)
    assert.equal(days.length, 2)
    assert.ok(days.every((d) => !intro.includes(d)))
    assert.ok(of(res, id).every((s) => s.meal === 1))
  }
  const perDay = {}
  for (const s of res) perDay[s.date] = (perDay[s.date] ?? 0) + 1
  assert.ok(Object.values(perDay).every((n) => n <= 2))
})

test('maintenance shares the introduction day when the week has no other free day', () => {
  const res = run({
    engine: engineOf(entry('a-sesame', 'introducing', 2), entry('a-egg', 'maintenance', 3)),
    weekItems: [
      { date: day(5), meal: 1, foodId: 'f-tahini', status: 'given' },
      { date: day(6), meal: 1, foodId: 'f-tahini', status: 'given' },
    ],
    today: day(5),
  })
  // only Saturday-less days: Friday given, Saturday open → intro on Saturday, egg needs 2 days but 1 free
  assert.ok(of(res, 'f-egg').length >= 1)
})

test('an existing planned item reduces what is suggested', () => {
  const res = run({
    engine: engineOf(entry('a-egg', 'maintenance', 3)),
    weekItems: [{ date: day(2), meal: 1, foodId: 'f-egg', status: 'planned' }],
  })
  assert.equal(of(res, 'f-egg').length, 1)
  assert.ok(of(res, 'f-egg').every((s) => s.date !== day(2)))
  const full = run({
    engine: engineOf(entry('a-egg', 'maintenance', 3)),
    weekItems: [
      { date: day(2), meal: 1, foodId: 'f-egg', status: 'planned' },
      { date: day(4), meal: 1, foodId: 'f-egg', status: 'planned' },
    ],
  })
  assert.equal(of(full, 'f-egg').length, 0)
})

test('locked and archived foods are never suggested', () => {
  const foods = baseFoods.map((f) => (f.id === 'f-pear' ? { ...f, archived: true } : f))
  const res = run({
    foods,
    engine: engineOf(entry('a-egg', 'maintenance', 3), entry('a-milk', 'maintenance', 3)),
    queue: ['f-pear', 'f-apple', 'f-plum'],
    lockedFoodIds: ['f-apple'],
    lockedAllergenIds: ['a-milk'],
  })
  const ids = res.map((s) => s.foodId)
  assert.ok(!ids.includes('f-pear'))
  assert.ok(!ids.includes('f-apple'))
  assert.ok(!ids.includes('f-milk'))
  assert.ok(ids.includes('f-plum'))
  assert.ok(ids.includes('f-egg'))
})

test('a queue of 6 regular foods yields at most newFoodsPerWeek, one per day, in meal 2', () => {
  const res = run({ queue: baseFoods.filter((f) => !f.allergenId).map((f) => f.id) })
  const fresh = res.filter((s) => s.reason.kind === 'new_food')
  assert.equal(fresh.length, 3)
  assert.ok(fresh.every((s) => s.meal === 2))
  assert.equal(new Set(fresh.map((s) => s.date)).size, 3)
  const fewer = run({
    queue: baseFoods.filter((f) => !f.allergenId).map((f) => f.id),
    weekItems: [{ date: day(3), meal: 2, foodId: 'f-melon', status: 'planned' }],
  })
  assert.equal(fewer.filter((s) => s.reason.kind === 'new_food').length, 2)
})

test('nothing is suggested for days before today', () => {
  const res = run({
    today: day(4),
    engine: engineOf(entry('a-egg', 'maintenance', 3)),
    queue: ['f-pear', 'f-apple'],
  })
  assert.ok(res.length > 0)
  assert.ok(res.every((s) => s.date >= day(4)))
  assert.deepEqual(run({ today: day(8) }), [])
})

test('no more than maxAllergensPerMeal allergens in one meal 1 unless the target needs it', () => {
  const engine = engineOf(entry('a-egg', 'maintenance', 3), entry('a-milk', 'maintenance', 3), entry('a-sesame', 'maintenance', 3))
  const res = run({ engine, settings: { ...DEFAULT_SETTINGS, maxAllergensPerMeal: 1 } })
  const perDay = {}
  for (const s of res.filter((x) => x.meal === 1)) perDay[s.date] = (perDay[s.date] ?? 0) + 1
  assert.ok(Object.values(perDay).every((n) => n <= 1))
  assert.equal(res.length, 6)
  // only two open days left and three allergens need two days each: the cap is relaxed to meet the target
  const tight = run({ engine, today: day(5), settings: { ...DEFAULT_SETTINGS, maxAllergensPerMeal: 1 } })
  assert.equal(tight.length, 6)
})

test('the next not_started allergen starts only when none is introducing, from a queued allergen food', () => {
  const started = run({ queue: ['f-pear', 'f-nut'], engine: engineOf(entry('a-nut', 'not_started')) })
  const nut = of(started, 'f-nut')
  assert.deepEqual(
    nut.map((s) => [s.date, s.meal, s.reason.kind, s.reason.n]),
    [
      [day(0), 1, 'start', 1],
      [day(1), 1, 'start', 2],
      [day(2), 1, 'start', 3],
    ],
  )
  const notQueued = run({ engine: engineOf(entry('a-nut', 'not_started')) })
  assert.equal(of(notQueued, 'f-nut').length, 0)
  const busy = run({
    queue: ['f-nut'],
    engine: engineOf(entry('a-nut', 'not_started'), entry('a-sesame', 'introducing', 1)),
    weekItems: [{ date: day(0), meal: 1, foodId: 'f-tahini', status: 'given' }],
  })
  assert.equal(of(busy, 'f-nut').length, 0)
})

test('the same input twice gives deep-equal output', () => {
  const input = {
    engine: engineOf(entry('a-sesame', 'introducing', 1), entry('a-egg', 'maintenance', 3), entry('a-milk', 'maintenance', 3)),
    queue: ['f-pear', 'f-apple', 'f-plum', 'f-fig'],
    weekItems: [{ date: day(0), meal: 1, foodId: 'f-tahini', status: 'given' }],
  }
  assert.deepEqual(run(input), run(input))
  const res = run(input)
  const sorted = [...res].sort((a, b) => (a.date + a.meal + a.foodId < b.date + b.meal + b.foodId ? -1 : 1))
  assert.deepEqual(res, sorted)
})

test('an empty queue falls back to untried foods in catalog order (D-017-6)', () => {
  const res = run({ queue: [] })
  const fresh = res.filter((s) => s.reason.kind === 'new_food')
  assert.ok(fresh.length > 0)
  assert.equal(fresh[0].foodId, 'f-pear')
})

test('nothing untried and nothing to introduce gives the reason code (D-017-6)', () => {
  const tried = baseFoods.map((f) => ({ ...f, tried: true }))
  assert.deepEqual(run({ foods: tried, queue: [] }), [])
  assert.equal(noSuggestionsReason({ weekStart: WEEK, today: WEEK }), 'nothing_to_suggest')
  assert.equal(noSuggestionsReason({ weekStart: WEEK, today: day(9) }), 'no_open_days')
})
