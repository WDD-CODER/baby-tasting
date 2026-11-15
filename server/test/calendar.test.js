import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { isoAddDays } from '../domain/dates.js'
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
  for (const name of ['allergens', 'foods', 'babies', 'calendarItems']) {
    await ctx.db.collection(name).deleteMany({})
  }
})

async function setup() {
  const agent = await signedInAgent(ctx.newApp())
  await agent.put('/api/v1/baby').send({ name: 'נועה', birthDate: isoAddDays(todayIso(), -240) })
  const { body } = await agent.get('/api/v1/foods')
  const plains = body.foods.filter((f) => !f.allergenId)
  const allergen = body.foods.find((f) => f.allergenId)
  return { agent, plain: plains[0], other: plains[1], allergen }
}

const today = () => todayIso()

test('calendar routes answer 401 without a session', async () => {
  const app = ctx.newApp()
  assert.equal((await request(app).get('/api/v1/calendar?from=2026-01-01&to=2026-01-07')).status, 401)
  assert.equal((await request(app).post('/api/v1/calendar').send({})).status, 401)
})

test('range list validates from/to and the 62-day cap', async () => {
  const { agent } = await setup()
  assert.equal((await agent.get('/api/v1/calendar')).status, 400)
  assert.equal((await agent.get('/api/v1/calendar?from=2026-01-01&to=2026-04-01')).status, 400)
  assert.equal((await agent.get('/api/v1/calendar?from=2026-01-05&to=2026-01-01')).status, 400)
  assert.equal((await agent.get('/api/v1/calendar?from=2026-01-01&to=2026-01-07')).status, 200)
})

test('create, list a range, move and delete', async () => {
  const { agent, plain } = await setup()
  const date = isoAddDays(today(), 1)
  const created = await agent.post('/api/v1/calendar').send({ date, meal: 2, foodId: plain.id })
  assert.equal(created.status, 201)
  assert.equal(created.body.item.status, 'planned')
  const list = await agent.get(`/api/v1/calendar?from=${today()}&to=${isoAddDays(today(), 7)}`)
  assert.equal(list.body.items.length, 1)
  const out = await agent.get(`/api/v1/calendar?from=${isoAddDays(today(), 3)}&to=${isoAddDays(today(), 7)}`)
  assert.equal(out.body.items.length, 0)
  const id = created.body.item.id
  const moved = await agent.post(`/api/v1/calendar/${id}/move`).send({ date: isoAddDays(today(), 2), meal: 3 })
  assert.equal(moved.status, 200)
  assert.equal(moved.body.item.meal, 3)
  assert.equal(moved.body.item.date, isoAddDays(today(), 2))
  assert.equal((await agent.delete(`/api/v1/calendar/${id}`)).status, 200)
  assert.equal((await agent.delete(`/api/v1/calendar/${id}`)).status, 404)
})

test('an allergen food in meal 2 is refused on create and on move', async () => {
  const { agent, allergen } = await setup()
  const date = today()
  const bad = await agent.post('/api/v1/calendar').send({ date, meal: 2, foodId: allergen.id })
  assert.equal(bad.status, 422)
  assert.equal(bad.body.error.code, 'allergen_meal_1')
  const ok = await agent.post('/api/v1/calendar').send({ date, meal: 1, foodId: allergen.id })
  assert.equal(ok.status, 201)
  const move = await agent.post(`/api/v1/calendar/${ok.body.item.id}/move`).send({ date, meal: 2 })
  assert.equal(move.status, 422)
  assert.equal(move.body.error.code, 'allergen_meal_1')
})

test('the same food twice in one meal is 409 duplicate_in_meal, also on move', async () => {
  const { agent, plain } = await setup()
  const date = today()
  await agent.post('/api/v1/calendar').send({ date, meal: 2, foodId: plain.id })
  const dup = await agent.post('/api/v1/calendar').send({ date, meal: 2, foodId: plain.id })
  assert.equal(dup.status, 409)
  assert.equal(dup.body.error.code, 'duplicate_in_meal')
  const other = await agent.post('/api/v1/calendar').send({ date, meal: 3, foodId: plain.id })
  const move = await agent.post(`/api/v1/calendar/${other.body.item.id}/move`).send({ date, meal: 2 })
  assert.equal(move.status, 409)
})

test('given on a future date is 422 given_in_future; past dates are editable', async () => {
  const { agent, plain } = await setup()
  const future = isoAddDays(today(), 2)
  const create = await agent.post('/api/v1/calendar').send({ date: future, meal: 2, foodId: plain.id, status: 'given' })
  assert.equal(create.status, 422)
  assert.equal(create.body.error.code, 'given_in_future')
  const planned = await agent.post('/api/v1/calendar').send({ date: future, meal: 2, foodId: plain.id })
  const patch = await agent.patch(`/api/v1/calendar/${planned.body.item.id}`).send({ status: 'given' })
  assert.equal(patch.status, 422)
  assert.equal(patch.body.error.code, 'given_in_future')
  const past = await agent.post('/api/v1/calendar').send({ date: isoAddDays(today(), -40), meal: 2, foodId: plain.id })
  assert.equal(past.status, 201)
  const given = await agent.patch(`/api/v1/calendar/${past.body.item.id}`).send({ status: 'given', amount: 'taste' })
  assert.equal(given.status, 200)
  assert.equal(given.body.item.givenBy, 'Parent-A')
  assert.ok(given.body.item.givenAt)
  const back = await agent.patch(`/api/v1/calendar/${past.body.item.id}`).send({ status: 'planned' })
  assert.equal(back.body.item.amount, null)
  assert.equal(back.body.item.givenBy, null)
})

test('PATCH validates amount, note and liked', async () => {
  const { agent, plain } = await setup()
  const c = await agent.post('/api/v1/calendar').send({ date: today(), meal: 2, foodId: plain.id })
  const url = `/api/v1/calendar/${c.body.item.id}`
  assert.equal((await agent.patch(url).send({ amount: 'lots' })).status, 400)
  assert.equal((await agent.patch(url).send({ note: 'x'.repeat(201) })).status, 400)
  assert.equal((await agent.patch(url).send({ liked: 'yes' })).status, 400)
  const ok = await agent.patch(url).send({ note: 'אהב', liked: true })
  assert.equal(ok.body.item.liked, true)
})

test('food status on GET /foods counts only given items', async () => {
  const { agent, plain, other } = await setup()
  const d1 = isoAddDays(today(), -5)
  const d2 = isoAddDays(today(), -3)
  const a = await agent.post('/api/v1/calendar').send({ date: d2, meal: 2, foodId: plain.id, status: 'given' })
  await agent.patch(`/api/v1/calendar/${a.body.item.id}`).send({ liked: true })
  await agent.post('/api/v1/calendar').send({ date: d1, meal: 2, foodId: plain.id, status: 'given' })
  await agent.post('/api/v1/calendar').send({ date: isoAddDays(today(), 3), meal: 2, foodId: plain.id })
  await agent.post('/api/v1/calendar').send({ date: d1, meal: 2, foodId: other.id, status: 'skipped' })
  const { body } = await agent.get('/api/v1/foods')
  const p = body.foods.find((f) => f.id === plain.id)
  assert.deepEqual(p.status, { tried: true, firstDate: d1, timesGiven: 2, liked: true })
  const o = body.foods.find((f) => f.id === other.id)
  assert.equal(o.status.tried, false)
  assert.equal(o.status.timesGiven, 0)
})

test('an archived food can be listed but not added', async () => {
  const { agent, plain } = await setup()
  const c = await agent.post('/api/v1/calendar').send({ date: today(), meal: 2, foodId: plain.id })
  await agent.post(`/api/v1/foods/${plain.id}/archive`)
  const list = await agent.get(`/api/v1/calendar?from=${today()}&to=${today()}`)
  assert.equal(list.body.items.length, 1)
  assert.equal(list.body.items[0].id, c.body.item.id)
  const add = await agent.post('/api/v1/calendar').send({ date: today(), meal: 3, foodId: plain.id })
  assert.equal(add.status, 400)
})
