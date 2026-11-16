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
  return { agent, foods: body.foods.filter((f) => !f.allergenId) }
}

const queueIds = async (agent) =>
  (await agent.get('/api/v1/foods')).body.foods
    .filter((f) => f.queuePosition !== null)
    .sort((a, b) => a.queuePosition - b.queuePosition)
    .map((f) => f.id)

test('queue routes answer 401 without a session', async () => {
  const app = ctx.newApp()
  assert.equal((await request(app).post('/api/v1/foods/abc/queue').send({ queued: true })).status, 401)
  assert.equal((await request(app).put('/api/v1/foods/queue').send({ foodIds: [] })).status, 401)
})

test('foods list shows queuePosition null until queued', async () => {
  const { agent, foods } = await setup()
  assert.ok(foods.every((f) => f.queuePosition === null))
})

test('add appends at the end, remove drops, both persist', async () => {
  const { agent, foods } = await setup()
  const [a, b, c] = foods
  for (const f of [a, b, c]) {
    const res = await agent.post(`/api/v1/foods/${f.id}/queue`).send({ queued: true })
    assert.equal(res.status, 200)
  }
  assert.deepEqual(await queueIds(agent), [a.id, b.id, c.id])
  const again = await agent.post(`/api/v1/foods/${a.id}/queue`).send({ queued: true })
  assert.equal(again.body.food.queuePosition, 0)
  const removed = await agent.post(`/api/v1/foods/${b.id}/queue`).send({ queued: false })
  assert.equal(removed.body.food.queuePosition, null)
  assert.deepEqual(await queueIds(agent), [a.id, c.id])
  await agent.post(`/api/v1/foods/${b.id}/queue`).send({ queued: true })
  assert.deepEqual(await queueIds(agent), [a.id, c.id, b.id])
})

test('reorder persists and refuses a list that is not the whole queue', async () => {
  const { agent, foods } = await setup()
  const [a, b, c] = foods
  for (const f of [a, b, c]) await agent.post(`/api/v1/foods/${f.id}/queue`).send({ queued: true })
  const ok = await agent.put('/api/v1/foods/queue').send({ foodIds: [c.id, a.id, b.id] })
  assert.equal(ok.status, 200)
  assert.deepEqual(ok.body.queue.map((f) => f.id), [c.id, a.id, b.id])
  assert.deepEqual(await queueIds(agent), [c.id, a.id, b.id])
  for (const bad of [[a.id], [a.id, a.id, b.id], [a.id, b.id, foods[3].id], 'x']) {
    const res = await agent.put('/api/v1/foods/queue').send({ foodIds: bad })
    assert.equal(res.status, 400, JSON.stringify(bad))
  }
  assert.deepEqual(await queueIds(agent), [c.id, a.id, b.id])
})

test('queue is per household and validates the body', async () => {
  const { agent, foods } = await setup()
  assert.equal((await agent.post(`/api/v1/foods/${foods[0].id}/queue`).send({ queued: 'yes' })).status, 400)
  assert.equal((await agent.post('/api/v1/foods/000000000000000000000000/queue').send({ queued: true })).status, 404)
  await agent.post(`/api/v1/foods/${foods[0].id}/queue`).send({ queued: true })
  await ctx.db.collection('foods').updateMany({}, { $set: { householdId: 'other' } })
  assert.deepEqual(await queueIds(agent), [])
})
