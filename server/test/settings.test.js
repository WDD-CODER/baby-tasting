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
  await ctx.db.collection('settings').deleteMany({})
})

test('settings routes answer 401 without a session', async () => {
  const app = ctx.newApp()
  assert.equal((await request(app).get('/api/v1/settings')).status, 401)
  assert.equal((await request(app).put('/api/v1/settings').send({})).status, 401)
})

test('GET returns the defaults', async () => {
  const agent = await signedInAgent(ctx.newApp())
  const res = await agent.get('/api/v1/settings')
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.settings, {
    introDays: 3,
    maintenancePerWeek: 2,
    maintenanceGapDays: 5,
    maintenanceUntilMonths: 24,
    maxAllergensPerMeal: 2,
    newFoodsPerWeek: 3,
  })
})

test('PUT accepts in-range values and keeps the others', async () => {
  const agent = await signedInAgent(ctx.newApp())
  const put = await agent.put('/api/v1/settings').send({ introDays: 5, maintenanceGapDays: 7 })
  assert.equal(put.status, 200)
  assert.equal(put.body.settings.introDays, 5)
  const again = await agent.put('/api/v1/settings').send({ maintenancePerWeek: 3 })
  assert.equal(again.body.settings.introDays, 5)
  const get = await agent.get('/api/v1/settings')
  assert.deepEqual(get.body.settings, {
    introDays: 5,
    maintenancePerWeek: 3,
    maintenanceGapDays: 7,
    maintenanceUntilMonths: 24,
    maxAllergensPerMeal: 2,
    newFoodsPerWeek: 3,
  })
})

test('PUT refuses out-of-range values with 400 invalid', async () => {
  const agent = await signedInAgent(ctx.newApp())
  for (const bad of [{ introDays: 8 }, { maintenanceGapDays: 1 }, { maintenanceUntilMonths: 40 },
    { maxAllergensPerMeal: 6 },
    { maxAllergensPerMeal: 0 },
    { newFoodsPerWeek: 8 },
    { newFoodsPerWeek: -1 },
  ]) {
    const res = await agent.put('/api/v1/settings').send(bad)
    assert.equal(res.status, 400)
    assert.equal(res.body.error.code, 'invalid')
    assert.ok(res.body.error.message.includes(Object.keys(bad)[0]))
  }
  assert.equal((await agent.get('/api/v1/settings')).body.settings.introDays, 3)
})
