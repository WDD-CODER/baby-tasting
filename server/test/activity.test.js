import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { signedInAgent, startTestApp } from './helpers.js'

let ctx

before(async () => {
  ctx = await startTestApp()
})
after(async () => {
  await ctx.stop()
})
beforeEach(async () => {
  for (const name of ['allergens', 'foods', 'babies', 'calendarItems', 'reactions', 'locks', 'settings']) {
    await ctx.db.collection(name).deleteMany({})
  }
})

async function setup() {
  const agent = await signedInAgent(ctx.newApp(), 'parent-a')
  await agent.put('/api/v1/baby').send({ name: 'נועה', birthDate: '2026-01-01' })
  const { body } = await agent.get('/api/v1/foods')
  return { agent, food: body.foods.find((f) => !f.allergenId) }
}

test('GET /activity answers 401 without a session', async () => {
  assert.equal((await request(ctx.newApp()).get('/api/v1/activity')).status, 401)
})

test('GET /activity lists the latest changes newest first as { at, user, kind, summary }', async () => {
  const { agent, food } = await setup()
  await agent.put('/api/v1/settings').send({ introDays: 4 })
  const made = await agent.post('/api/v1/calendar').send({ date: '2026-01-10', meal: 2, foodId: food.id, status: 'given' })
  assert.equal(made.status, 201)
  const res = await agent.get('/api/v1/activity')
  assert.equal(res.status, 200)
  const items = res.body.items
  assert.ok(items.length >= 3)
  for (const it of items) {
    assert.deepEqual(Object.keys(it).sort(), ['at', 'kind', 'summary', 'user'])
    assert.ok(!Number.isNaN(Date.parse(it.at)))
  }
  const times = items.map((i) => i.at)
  assert.deepEqual(times, [...times].sort().reverse())
  assert.equal(items[0].user, 'Parent-A')
  assert.equal(items[0].kind, 'calendar.given')
  assert.equal(items[0].summary.foodName, food.name)
  assert.ok(items.some((i) => i.kind === 'settings.saved'))
  assert.ok(items.every((i) => i.user !== 'system'))
})

test('GET /activity returns at most 100 entries', async () => {
  const { agent, food } = await setup()
  const baby = await ctx.db.collection('babies').findOne({})
  const start = Date.now()
  const docs = Array.from({ length: 120 }, (_, i) => ({
    householdId: baby.householdId,
    date: '2026-01-10',
    meal: 2,
    foodId: food.id,
    status: 'planned',
    createdBy: 'parent-a',
    updatedBy: 'parent-a',
    createdAt: new Date(start - i * 1000),
    updatedAt: new Date(start - i * 1000),
  }))
  await ctx.db.collection('calendarItems').insertMany(docs)
  const res = await agent.get('/api/v1/activity')
  assert.equal(res.body.items.length, 100)
})

test("another household's change never appears", async () => {
  const { agent } = await setup()
  const baby = await ctx.db.collection('babies').findOne({})
  const now = new Date(Date.now() + 60_000)
  await ctx.db.collection('calendarItems').insertOne({
    householdId: 'other-household',
    date: '2026-01-10',
    meal: 2,
    foodId: 'x',
    status: 'given',
    createdBy: 'stranger',
    updatedBy: 'stranger',
    createdAt: now,
    updatedAt: now,
  })
  assert.notEqual(baby.householdId, 'other-household')
  const res = await agent.get('/api/v1/activity')
  assert.ok(res.body.items.every((i) => i.user !== 'stranger'))
})
