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
  for (const name of ['allergens', 'foods', 'babies', 'calendarItems', 'reactions', 'locks']) {
    await ctx.db.collection(name).deleteMany({})
  }
})

async function lockedSetup() {
  const agent = await signedInAgent(ctx.newApp())
  await agent.put('/api/v1/baby').send({ name: 'נועה', birthDate: isoAddDays(todayIso(), -240) })
  const { body } = await agent.get('/api/v1/foods')
  const byName = (n) => body.foods.find((f) => f.name === n)
  const tahini = byName('טחינה')
  const banana = byName('בננה')
  const item = await agent.post('/api/v1/calendar').send({ date: todayIso(), meal: 1, foodId: tahini.id, status: 'given' })
  await agent.post('/api/v1/calendar').send({ date: todayIso(), meal: 1, foodId: banana.id, status: 'given' })
  const reaction = await agent.post('/api/v1/reactions').send({
    noticedAt: new Date().toISOString(),
    itemIds: [item.body.item.id],
    symptoms: ['rash'],
    severity: 'mild',
  })
  assert.equal(reaction.status, 201)
  return { agent, tahini, banana, sesame: tahini.allergenId, itemId: item.body.item.id }
}

test('release restores the computed state and records who and when', async () => {
  const { agent, tahini, sesame } = await lockedSetup()
  const res = await agent.post(`/api/v1/allergens/${sesame}/release`)
  assert.equal(res.status, 200)
  assert.equal(res.body.released.releasedBy, 'Parent-A')
  assert.ok(res.body.released.releasedAt)
  const doc = await ctx.db.collection('locks').findOne({ targetType: 'allergen', targetId: sesame })
  assert.equal(doc.releasedBy, 'Parent-A')
  assert.ok(doc.releasedAt instanceof Date)
  const status = await agent.get('/api/v1/allergens/status')
  const entry = status.body.allergens.find((a) => a.allergenId === sesame)
  assert.equal(entry.state, 'introducing')
  const again = await agent.post('/api/v1/calendar').send({ date: isoAddDays(todayIso(), 1), meal: 1, foodId: tahini.id })
  assert.equal(again.status, 201)
  assert.equal((await agent.post(`/api/v1/allergens/${sesame}/release`)).status, 404)
})

test('releasing a food unlocks it; an unlocked target is 404', async () => {
  const { agent, banana, tahini } = await lockedSetup()
  assert.equal((await agent.post(`/api/v1/foods/${tahini.id}/release`)).status, 404)
  assert.equal((await agent.post(`/api/v1/foods/${banana.id}/release`)).status, 200)
  const ok = await agent.post('/api/v1/calendar').send({ date: isoAddDays(todayIso(), 1), meal: 2, foodId: banana.id })
  assert.equal(ok.status, 201)
})

test('a second reaction adds to the one active lock', async () => {
  const { agent, sesame, itemId } = await lockedSetup()
  const again = await agent
    .post('/api/v1/reactions')
    .send({ noticedAt: new Date().toISOString(), itemIds: [itemId], symptoms: ['rash'], severity: 'mild' })
  assert.equal(again.status, 201)
  const locks = await ctx.db.collection('locks').find({ targetType: 'allergen', targetId: sesame }).toArray()
  assert.equal(locks.length, 1)
  assert.equal(locks[0].reactionIds.length, 2)
})

test('release routes need a session', async () => {
  assert.equal((await request(ctx.newApp()).post('/api/v1/allergens/x/release')).status, 401)
  assert.equal((await request(ctx.newApp()).post('/api/v1/foods/x/release')).status, 401)
})
