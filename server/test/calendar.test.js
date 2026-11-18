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

test('D-015-4: an allergen food in meal 2 or 3 is accepted on create and on move (no allergen_meal_1)', async () => {
  const { agent, allergen } = await setup()
  const date = today()
  const two = await agent.post('/api/v1/calendar').send({ date, meal: 2, foodId: allergen.id })
  assert.equal(two.status, 201)
  assert.equal(two.body.item.meal, 2)
  const ok = await agent.post('/api/v1/calendar').send({ date, meal: 1, foodId: allergen.id })
  assert.equal(ok.status, 201)
  const move = await agent.post(`/api/v1/calendar/${ok.body.item.id}/move`).send({ date, meal: 3 })
  assert.equal(move.status, 200)
  assert.equal(move.body.item.meal, 3)
  const back = await agent.get(`/api/v1/calendar?from=${date}&to=${date}`)
  assert.ok(back.body.items.some((it) => it.id === ok.body.item.id && it.meal === 3))
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

test('POST /calendar/meal-given marks every food of the meal given and touches nothing else', async () => {
  const { agent, plain, other, allergen } = await setup()
  const url = '/api/v1/calendar/meal-given'
  const a = await agent.post('/api/v1/calendar').send({ date: today(), meal: 2, foodId: plain.id })
  const b = await agent.post('/api/v1/calendar').send({ date: today(), meal: 2, foodId: other.id })
  const c = await agent.post('/api/v1/calendar').send({ date: today(), meal: 2, foodId: allergen.id })
  const m1 = await agent.post('/api/v1/calendar').send({ date: today(), meal: 1, foodId: plain.id })
  await agent.patch(`/api/v1/calendar/${a.body.item.id}`).send({ status: 'given', amount: 'taste' })
  await agent.patch(`/api/v1/calendar/${b.body.item.id}`).send({ status: 'skipped', amount: 'portion' })
  const before = await ctx.db.collection('calendarItems').find({}).toArray()
  const givenAt = before.find((d) => String(d._id) === a.body.item.id).givenAt
  await ctx.db.collection('calendarItems').insertOne({
    householdId: 'another-household',
    date: today(),
    meal: 2,
    foodId: plain.id,
    status: 'planned',
    amount: null,
  })
  const res = await agent.post(url).send({ date: today(), meal: 2 })
  assert.equal(res.status, 200)
  assert.equal(res.body.items.length, 3)
  for (const it of res.body.items) {
    assert.equal(it.status, 'given')
    assert.ok(it.givenBy)
  }
  assert.equal(res.body.items.find((i) => i.id === b.body.item.id).amount, 'portion')
  assert.ok(res.body.items.find((i) => i.id === c.body.item.id))
  const after = await ctx.db.collection('calendarItems').find({}).toArray()
  assert.equal(after.find((d) => String(d._id) === a.body.item.id).givenAt.getTime(), givenAt.getTime())
  assert.equal(after.find((d) => String(d._id) === m1.body.item.id).status, 'planned')
  assert.equal(after.find((d) => d.householdId === 'another-household').status, 'planned')
})

test('POST /calendar/meal-given refuses a future date and bad input', async () => {
  const { agent, plain } = await setup()
  const url = '/api/v1/calendar/meal-given'
  const future = isoAddDays(today(), 2)
  const item = await agent.post('/api/v1/calendar').send({ date: future, meal: 2, foodId: plain.id })
  const res = await agent.post(url).send({ date: future, meal: 2 })
  assert.equal(res.status, 400)
  assert.equal(res.body.error.code, 'given_in_future')
  const list = await agent.get(`/api/v1/calendar?from=${future}&to=${future}`)
  assert.equal(list.body.items.find((i) => i.id === item.body.item.id).status, 'planned')
  assert.equal((await agent.post(url).send({ date: 'nope', meal: 2 })).body.error.code, 'invalid')
  assert.equal((await agent.post(url).send({ date: today(), meal: 4 })).status, 400)
  assert.equal((await agent.post(url).send({ date: today(), meal: 0 })).body.error.code, 'invalid')
})
