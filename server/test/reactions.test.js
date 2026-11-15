import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { isoAddDays } from '../domain/dates.js'
import { todayIso } from '../lib/dates.js'
import { signedInAgent, startTestApp } from './helpers.js'

let ctx
const destroyed = []
const fakeStore = {
  configured: true,
  sign: ({ folder }) => ({ cloudName: 'c', apiKey: 'k', timestamp: 1, signature: 's', folder, allowedFormats: 'jpg' }),
  destroy: async (id) => {
    destroyed.push(id)
  },
}

before(async () => {
  ctx = await startTestApp()
})
after(async () => {
  await ctx.stop()
})
beforeEach(async () => {
  destroyed.length = 0
  for (const name of ['allergens', 'foods', 'babies', 'calendarItems', 'reactions', 'locks']) {
    await ctx.db.collection(name).deleteMany({})
  }
})

const today = () => todayIso()

async function setup() {
  const agent = await signedInAgent(ctx.newApp({ photoStore: fakeStore }))
  await agent.put('/api/v1/baby').send({ name: 'נועה', birthDate: isoAddDays(today(), -240) })
  const { body } = await agent.get('/api/v1/foods')
  const byName = (n) => body.foods.find((f) => f.name === n)
  const tahini = byName('טחינה')
  return { agent, tahini, banana: byName('בננה'), pear: byName('אגס'), sesame: tahini.allergenId }
}

async function given(agent, foodId, date = today(), meal = 1) {
  const res = await agent.post('/api/v1/calendar').send({ date, meal, foodId, status: 'given' })
  assert.equal(res.status, 201)
  return res.body.item
}

const reactionBody = (itemIds, extra = {}) => ({
  noticedAt: new Date().toISOString(),
  itemIds,
  symptoms: ['rash'],
  severity: 'mild',
  text: 'x',
  photos: [],
  ...extra,
})

test('reaction routes answer 401 without a session', async () => {
  const app = ctx.newApp()
  assert.equal((await request(app).get('/api/v1/reactions')).status, 401)
  assert.equal((await request(app).post('/api/v1/reactions').send({})).status, 401)
})

test('a reaction on a meal with tahini and banana locks sesame and banana', async () => {
  const { agent, tahini, banana, sesame, pear } = await setup()
  const t = await given(agent, tahini.id)
  await given(agent, banana.id)
  await given(agent, pear.id, today(), 2)
  const res = await agent.post('/api/v1/reactions').send(reactionBody([t.id]))
  assert.equal(res.status, 201)
  assert.deepEqual(res.body.reaction.foodIds, [tahini.id])

  for (const food of [tahini, banana]) {
    const refused = await agent.post('/api/v1/calendar').send({ date: isoAddDays(today(), 1), meal: 1, foodId: food.id })
    assert.equal(refused.status, 409)
    assert.equal(refused.body.error.code, 'food_locked')
  }
  const ok = await agent.post('/api/v1/calendar').send({ date: isoAddDays(today(), 1), meal: 2, foodId: pear.id })
  assert.equal(ok.status, 201)

  const status = await agent.get('/api/v1/allergens/status')
  assert.equal(status.body.allergens.find((a) => a.allergenId === sesame).state, 'locked')
  const lockedAlerts = status.body.alerts.filter((a) => a.kind === 'locked')
  assert.deepEqual(lockedAlerts.map((a) => a.id).sort(), ['locked-food:' + banana.id, 'locked:' + sesame].sort())
})

test('moving an item of a locked food is refused; calendar items carry locked', async () => {
  const { agent, tahini, banana, pear } = await setup()
  const planned = await agent.post('/api/v1/calendar').send({ date: isoAddDays(today(), 2), meal: 2, foodId: banana.id })
  assert.equal(planned.status, 201)
  const t = await given(agent, tahini.id)
  await given(agent, pear.id, today(), 2)
  await given(agent, banana.id, today(), 1)
  assert.equal((await agent.post('/api/v1/reactions').send(reactionBody([t.id]))).status, 201)
  const moved = await agent
    .post(`/api/v1/calendar/${planned.body.item.id}/move`)
    .send({ date: isoAddDays(today(), 3), meal: 2 })
  assert.equal(moved.status, 409)
  assert.equal(moved.body.error.code, 'food_locked')
  const list = await agent.get(`/api/v1/calendar?from=${today()}&to=${isoAddDays(today(), 5)}`)
  const flagged = Object.fromEntries(list.body.items.map((i) => [i.foodId, i.locked]))
  assert.equal(flagged[banana.id], true)
  assert.equal(flagged[tahini.id], true)
  assert.equal(flagged[pear.id], false)
})

test('suggestions skip a locked food', async () => {
  const { agent, banana, tahini } = await setup()
  await agent.post(`/api/v1/foods/${banana.id}/queue`).send({ queued: true })
  const t = await given(agent, tahini.id)
  await given(agent, banana.id, today(), 1)
  assert.equal((await agent.post('/api/v1/reactions').send(reactionBody([t.id]))).status, 201)
  let sunday = isoAddDays(today(), 7)
  while (new Date(sunday + 'T00:00:00Z').getUTCDay() !== 0) sunday = isoAddDays(sunday, 1)
  const res = await agent.post('/api/v1/suggestions/preview').send({ weekStart: sunday })
  assert.equal(res.status, 200)
  assert.ok(!res.body.suggestions.some((s) => s.foodId === banana.id || s.foodId === tahini.id))
})

test('deleting the reaction leaves the lock and deletes its photos', async () => {
  const { agent, tahini, sesame } = await setup()
  const t = await given(agent, tahini.id)
  const folder = (await agent.post('/api/v1/uploads/signature')).body.folder
  const photos = [{ publicId: `${folder}/a1`, url: 'https://res.cloudinary.com/c/a1.jpg' }]
  const created = await agent.post('/api/v1/reactions').send(reactionBody([t.id], { photos }))
  assert.equal(created.status, 201)
  const del = await agent.delete(`/api/v1/reactions/${created.body.reaction.id}`)
  assert.equal(del.status, 200)
  assert.deepEqual(destroyed, [`${folder}/a1`])
  const status = await agent.get('/api/v1/allergens/status')
  assert.equal(status.body.allergens.find((a) => a.allergenId === sesame).state, 'locked')
})

test('validation: no item, not given, too old, bad fields', async () => {
  const { agent, tahini, banana } = await setup()
  const t = await given(agent, tahini.id)
  const planned = await agent.post('/api/v1/calendar').send({ date: today(), meal: 2, foodId: banana.id })
  const old = await given(agent, banana.id, isoAddDays(today(), -3), 2)
  const bad = async (body) => {
    const res = await agent.post('/api/v1/reactions').send(body)
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.equal(res.body.error.code, 'invalid')
  }
  await bad(reactionBody([]))
  await bad({ ...reactionBody([t.id]), itemIds: undefined })
  await bad(reactionBody([planned.body.item.id]))
  await bad(reactionBody([old.id]))
  await bad(reactionBody([t.id], { symptoms: [] }))
  await bad(reactionBody([t.id], { symptoms: ['nope'] }))
  await bad(reactionBody([t.id], { severity: 'x' }))
  await bad(reactionBody([t.id], { text: 'x'.repeat(1001) }))
  await bad(reactionBody([t.id], { noticedAt: new Date(Date.now() + 3600e3).toISOString() }))
  await bad(reactionBody([t.id], { photos: [{ publicId: 'other/x', url: 'https://x/y.jpg' }] }))
  const six = Array.from({ length: 6 }, (_, i) => ({ publicId: `baby-tasting/h/${i}`, url: 'https://x/y.jpg' }))
  await bad(reactionBody([t.id], { photos: six }))
  assert.equal((await agent.get('/api/v1/reactions')).body.reactions.length, 0)
})

test('list newest first with a foodId filter; get, edit, delete', async () => {
  const { agent, tahini, banana } = await setup()
  const t = await given(agent, tahini.id)
  const b = await given(agent, banana.id, today(), 2)
  const first = await agent
    .post('/api/v1/reactions')
    .send(reactionBody([t.id], { noticedAt: new Date(Date.now() - 60e3).toISOString() }))
  const second = await agent.post('/api/v1/reactions').send(reactionBody([b.id]))
  const list = await agent.get('/api/v1/reactions')
  assert.deepEqual(list.body.reactions.map((r) => r.id), [second.body.reaction.id, first.body.reaction.id])
  const filtered = await agent.get(`/api/v1/reactions?foodId=${tahini.id}`)
  assert.deepEqual(filtered.body.reactions.map((r) => r.id), [first.body.reaction.id])
  const id = first.body.reaction.id
  assert.equal((await agent.get(`/api/v1/reactions/${id}`)).body.reaction.createdBy, 'Parent-A')
  const edited = await agent.patch(`/api/v1/reactions/${id}`).send({ severity: 'severe', text: 'y' })
  assert.equal(edited.status, 200)
  assert.equal(edited.body.reaction.severity, 'severe')
  assert.equal((await agent.get('/api/v1/reactions/000000000000000000000000')).status, 404)
  assert.equal((await agent.delete(`/api/v1/reactions/${id}`)).status, 200)
  assert.equal((await agent.get(`/api/v1/reactions/${id}`)).status, 404)
})
