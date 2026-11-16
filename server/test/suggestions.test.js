import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { dayOfWeek, isoAddDays } from '../domain/dates.js'
import { todayIso } from '../lib/dates.js'
import { signedInAgent, startTestApp } from './helpers.js'

let ctx

before(async () => {
  ctx = await startTestApp()
})
after(async () => {
  await ctx.stop()
})
beforeEach(async () => {
  for (const name of ['allergens', 'foods', 'babies', 'calendarItems', 'settings']) {
    await ctx.db.collection(name).deleteMany({})
  }
})

const today = () => todayIso()
// the next Sunday after today: the whole week lies in the future
const nextSunday = () => isoAddDays(today(), 7 - dayOfWeek(today()))

async function setup() {
  const agent = await signedInAgent(ctx.newApp())
  await agent.put('/api/v1/baby').send({ name: 'נועה', birthDate: isoAddDays(today(), -240) })
  const { body } = await agent.get('/api/v1/foods')
  const plains = body.foods.filter((f) => !f.allergenId)
  const allergenFood = body.foods.find((f) => f.allergenId)
  return { agent, plains, allergenFood }
}

const calendarCount = (agent) =>
  agent.get(`/api/v1/calendar?from=${today()}&to=${isoAddDays(today(), 40)}`).then((r) => r.body.items.length)

test('suggestion routes answer 401 without a session', async () => {
  const app = ctx.newApp()
  assert.equal((await request(app).post('/api/v1/suggestions/preview').send({})).status, 401)
  assert.equal((await request(app).post('/api/v1/suggestions/accept').send({})).status, 401)
})

test('preview needs a Sunday weekStart', async () => {
  const { agent } = await setup()
  for (const weekStart of [undefined, 'nope', isoAddDays(nextSunday(), 1)]) {
    const res = await agent.post('/api/v1/suggestions/preview').send({ weekStart })
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, 'invalid')
  }
})

test('preview proposes the introduction and queued foods and saves nothing', async () => {
  const { agent, plains, allergenFood } = await setup()
  const given = await agent.post('/api/v1/calendar').send({ date: today(), meal: 1, foodId: allergenFood.id, status: 'given' })
  assert.equal(given.status, 201)
  await agent.post(`/api/v1/foods/${plains[0].id}/queue`).send({ queued: true })
  const before = await calendarCount(agent)
  const res = await agent.post('/api/v1/suggestions/preview').send({ weekStart: nextSunday() })
  assert.equal(res.status, 200)
  const intro = res.body.suggestions.filter((s) => s.reason.kind === 'intro')
  assert.deepEqual(intro.map((s) => [s.date, s.meal, s.foodId, s.reason.n, s.reason.total]), [
    [nextSunday(), 1, allergenFood.id, 2, 3],
    [isoAddDays(nextSunday(), 1), 1, allergenFood.id, 3, 3],
  ])
  const fresh = res.body.suggestions.filter((s) => s.reason.kind === 'new_food')
  assert.deepEqual(fresh.map((s) => [s.meal, s.foodId]), [[2, plains[0].id]])
  assert.equal(await calendarCount(agent), before)
})

test('accept saves exactly the chosen items as planned; an allergen food outside meal 1 is accepted (D-015-4)', async () => {
  const { agent, plains, allergenFood } = await setup()
  const day = nextSunday()
  const before = await calendarCount(agent)
  const res = await agent.post('/api/v1/suggestions/accept').send({
    items: [
      { date: day, meal: 2, foodId: plains[0].id },
      { date: day, meal: 1, foodId: allergenFood.id },
      { date: day, meal: 2, foodId: allergenFood.id },
      { date: day, meal: 2, foodId: plains[0].id },
      { date: 'bad', meal: 2, foodId: plains[1].id },
    ],
  })
  assert.equal(res.status, 200)
  assert.equal(res.body.created.length, 3)
  assert.ok(res.body.created.every((it) => it.status === 'planned'))
  assert.deepEqual(res.body.rejected.map((r) => r.code), ['duplicate_in_meal', 'invalid'])
  assert.equal(await calendarCount(agent), before + 3)
  assert.equal((await agent.post('/api/v1/suggestions/accept').send({ items: 'x' })).status, 400)
})

test('preview with an empty queue offers untried foods', async () => {
  const { agent, plains } = await setup()
  const res = await agent.post('/api/v1/suggestions/preview').send({ weekStart: nextSunday() })
  assert.equal(res.status, 200)
  assert.ok(res.body.suggestions.some((s) => s.reason.kind === 'new_food' && plains.some((p) => p.id === s.foodId)))
  assert.equal(res.body.reason, undefined)
})
