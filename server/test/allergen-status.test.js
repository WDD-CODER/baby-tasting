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
  for (const name of ['allergens', 'foods', 'babies', 'calendarItems', 'settings']) {
    await ctx.db.collection(name).deleteMany({})
  }
})

async function setup() {
  const agent = await signedInAgent(ctx.newApp())
  await agent.put('/api/v1/baby').send({ name: 'נועה', birthDate: isoAddDays(todayIso(), -240) })
  const { body } = await agent.get('/api/v1/foods')
  const food = body.foods.find((f) => f.allergenId)
  return { agent, food }
}

// Inserted straight into the collection: the calendar API refuses past "given" nothing, but this keeps the test short.
async function give(food, date) {
  const res = await ctx.db.collection('calendarItems').insertOne({
    householdId: (await ctx.db.collection('foods').findOne({}, { projection: { householdId: 1 } })).householdId,
    date,
    meal: 1,
    foodId: food.id,
    status: 'given',
    amount: 'taste',
  })
  return res.insertedId
}

test('the three new routes answer 401 without a session', async () => {
  const app = ctx.newApp()
  assert.equal((await request(app).get('/api/v1/allergens/status')).status, 401)
  assert.equal((await request(app).get('/api/v1/alerts')).status, 401)
  assert.equal((await request(app).get('/api/v1/allergens/abc/history')).status, 401)
})

test('status and alerts return the engine output for the household', async () => {
  const { agent, food } = await setup()
  const today = todayIso()
  await give(food, isoAddDays(today, -3))
  await give(food, isoAddDays(today, -1))

  const status = await agent.get('/api/v1/allergens/status')
  assert.equal(status.status, 200)
  const mine = status.body.allergens.find((a) => a.allergenId === food.allergenId)
  assert.equal(mine.state, 'introducing')
  assert.equal(mine.intro.daysGiven, 2)
  assert.equal(mine.intro.required, 3)
  assert.deepEqual(mine.intro.missingDays, [isoAddDays(today, -2)])
  assert.equal(mine.lastGivenDate, isoAddDays(today, -1))
  const others = status.body.allergens.filter((a) => a.allergenId !== food.allergenId)
  assert.ok(others.every((a) => a.state === 'not_started'))

  const alerts = await agent.get('/api/v1/alerts')
  assert.equal(alerts.status, 200)
  assert.equal(alerts.body.alerts.length, 1)
  assert.equal(alerts.body.alerts[0].kind, 'intro_missing')
  assert.equal(alerts.body.alerts[0].allergenId, food.allergenId)
  assert.ok(alerts.body.alerts[0].allergenName.length > 0)
  assert.deepEqual(status.body.alerts, alerts.body.alerts)
})

test('a settings change applies immediately', async () => {
  const { agent, food } = await setup()
  const today = todayIso()
  for (const back of [3, 2, 1]) await give(food, isoAddDays(today, -back))
  const before = await agent.get('/api/v1/allergens/status')
  assert.equal(before.body.allergens.find((a) => a.allergenId === food.allergenId).state, 'maintenance')
  await agent.put('/api/v1/settings').send({ introDays: 4 })
  const after = await agent.get('/api/v1/allergens/status')
  assert.equal(after.body.allergens.find((a) => a.allergenId === food.allergenId).state, 'introducing')
})

test('history lists the given days newest first with foods and amounts', async () => {
  const { agent, food } = await setup()
  const today = todayIso()
  await give(food, isoAddDays(today, -2))
  await give(food, isoAddDays(today, -1))
  const res = await agent.get(`/api/v1/allergens/${food.allergenId}/history`)
  assert.equal(res.status, 200)
  assert.deepEqual(
    res.body.days.map((d) => d.date),
    [isoAddDays(today, -1), isoAddDays(today, -2)],
  )
  assert.equal(res.body.days[0].items[0].foodName, food.name)
  assert.equal(res.body.days[0].items[0].amount, 'taste')
  assert.equal((await agent.get('/api/v1/allergens/000000000000000000000000/history')).status, 404)
})
