import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createCatalogContext } from '../routes/catalog-helpers.js'
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

async function agentWithBaby() {
  const agent = await signedInAgent(ctx.newApp())
  await agent.put('/api/v1/baby').send({ name: 'נועה', birthDate: new Date().toISOString().slice(0, 10) })
  return agent
}

test('every catalog route answers 401 without a session', async () => {
  const app = ctx.newApp()
  const id = '64b000000000000000000000'
  for (const base of ['/api/v1/foods', '/api/v1/allergens']) {
    assert.equal((await request(app).get(base)).status, 401)
    assert.equal((await request(app).post(base).send({})).status, 401)
    assert.equal((await request(app).patch(`${base}/${id}`).send({})).status, 401)
    assert.equal((await request(app).post(`${base}/${id}/archive`)).status, 401)
    assert.equal((await request(app).post(`${base}/${id}/restore`)).status, 401)
    assert.equal((await request(app).delete(`${base}/${id}`)).status, 401)
  }
})

test('the second Tasting request of a household runs no catalog check and no baby lookup in the middleware', async () => {
  const calls = []
  const spy = (name, repo) =>
    new Proxy(repo, {
      get(target, key) {
        const value = target[key]
        if (typeof value !== 'function') return value
        return (...args) => (calls.push(`${name}.${String(key)}`), value.apply(target, args))
      },
    })
  const mw = createCatalogContext({
    repos: {
      babies: spy('babies', { getForHousehold: async () => ({ _id: 'b1' }) }),
      allergens: spy('allergens', { findMany: async () => [], insertOne: async () => ({}) }),
      foods: spy('foods', { findMany: async () => [], insertOne: async () => ({}) }),
    },
  })
  const run = (req) => new Promise((resolve, reject) => mw(req, {}, (err) => (err ? reject(err) : resolve())))
  const first = { householdId: 'h1' }
  await run(first)
  assert.equal(first.babyId, 'b1')
  assert.ok(calls.some((c) => c.startsWith('allergens.')) && calls.some((c) => c.startsWith('foods.')))
  calls.length = 0
  const second = { householdId: 'h1' }
  await run(second)
  assert.equal(second.babyId, 'b1')
  assert.deepEqual(calls, [])
  // a household with no baby is never remembered
  const none = createCatalogContext({ repos: { babies: { getForHousehold: async () => null } } })
  for (let i = 0; i < 2; i++) {
    await assert.rejects(new Promise((resolve, reject) => none({ householdId: 'h2' }, {}, (e) => (e ? reject(e) : resolve()))))
  }
})

test('a duplicate food name after trim is 409 duplicate_name; an archived name is free again', async () => {
  const agent = await agentWithBaby()
  const body = { name: 'קוסקוס', category: 'grains', emoji: '🍚' }
  const first = await agent.post('/api/v1/foods').send(body)
  assert.equal(first.status, 201)
  const dup = await agent.post('/api/v1/foods').send({ ...body, name: '  קוסקוס ' })
  assert.equal(dup.status, 409)
  assert.equal(dup.body.error.code, 'duplicate_name')
  const builtIn = await agent.post('/api/v1/foods').send({ ...body, name: 'בננה' })
  assert.equal(builtIn.status, 409)
  await agent.post(`/api/v1/foods/${first.body.food.id}/archive`)
  const again = await agent.post('/api/v1/foods').send(body)
  assert.equal(again.status, 201)
  const restore = await agent.post(`/api/v1/foods/${first.body.food.id}/restore`)
  assert.equal(restore.status, 409)
  assert.equal(restore.body.error.code, 'duplicate_name')
})

test('a duplicate allergen name is 409 duplicate_name, also on rename', async () => {
  const agent = await agentWithBaby()
  const a = await agent.post('/api/v1/allergens').send({ name: 'כוסמין' })
  assert.equal(a.status, 201)
  const dup = await agent.post('/api/v1/allergens').send({ name: ' כוסמין' })
  assert.equal(dup.status, 409)
  assert.equal(dup.body.error.code, 'duplicate_name')
  const rename = await agent.patch(`/api/v1/allergens/${a.body.allergen.id}`).send({ name: 'חלב' })
  assert.equal(rename.status, 409)
  const ok = await agent.patch(`/api/v1/allergens/${a.body.allergen.id}`).send({ name: 'כוסמין מלא' })
  assert.equal(ok.body.allergen.name, 'כוסמין מלא')
})

test('food validation: name, emoji, category, allergen, warning', async () => {
  const agent = await agentWithBaby()
  const good = { name: 'קוסקוס', category: 'grains', emoji: '🍚' }
  const bad = [
    { ...good, name: '   ' },
    { ...good, name: 'x'.repeat(41) },
    { ...good, emoji: '🍚'.repeat(9) },
    { ...good, category: 'sweets' },
    { ...good, allergenId: '64b000000000000000000000' },
    { ...good, allergenId: 'nope' },
    { ...good, warning: { text: 'x'.repeat(121), untilMonths: null } },
    { ...good, warning: { text: 'x', untilMonths: 0 } },
    { ...good, warning: { text: 'x', untilMonths: 121 } },
    { ...good, warning: { text: 'x', untilMonths: 1.5 } },
  ]
  for (const body of bad) {
    const res = await agent.post('/api/v1/foods').send(body)
    assert.equal(res.status, 400, JSON.stringify(body))
  }
  const ok = await agent
    .post('/api/v1/foods')
    .send({ ...good, warning: { text: 'לחתוך', untilMonths: 24 } })
  assert.equal(ok.status, 201)
  assert.deepEqual(ok.body.food.warning, { text: 'לחתוך', untilMonths: 24 })
})

test('a food can use an allergen created inline; an archived allergen is refused', async () => {
  const agent = await agentWithBaby()
  const allergen = (await agent.post('/api/v1/allergens').send({ name: 'כוסמין' })).body.allergen
  const food = await agent
    .post('/api/v1/foods')
    .send({ name: 'קוסקוס', category: 'grains', emoji: '🍚', allergenId: allergen.id })
  assert.equal(food.status, 201)
  assert.equal(food.body.food.allergenId, allergen.id)
  const spare = (await agent.post('/api/v1/allergens').send({ name: 'לא בשימוש' })).body.allergen
  await agent.post(`/api/v1/allergens/${spare.id}/archive`)
  const refused = await agent
    .post('/api/v1/foods')
    .send({ name: 'אחר', category: 'grains', emoji: '🍚', allergenId: spare.id })
  assert.equal(refused.status, 400)
})

test('DELETE of an unused food deletes it; of a food a calendar item uses archives it', async () => {
  const agent = await agentWithBaby()
  const mk = async (name) =>
    (await agent.post('/api/v1/foods').send({ name, category: 'other', emoji: '🍯' })).body.food
  const unused = await mk('לא בשימוש')
  const used = await mk('בשימוש')
  await ctx.db.collection('calendarItems').insertOne({ householdId: (await householdId()), foodId: used.id })
  const del = await agent.delete(`/api/v1/foods/${unused.id}`)
  assert.deepEqual(del.body, { result: 'deleted' })
  const arch = await agent.delete(`/api/v1/foods/${used.id}`)
  assert.deepEqual(arch.body, { result: 'archived' })
  const all = (await agent.get('/api/v1/foods?archived=1')).body.foods
  assert.equal(all.find((f) => f.id === unused.id), undefined)
  assert.equal(all.find((f) => f.id === used.id).archived, true)
})

async function householdId() {
  return String((await ctx.db.collection('households').findOne({}))._id)
}

test('DELETE of a built-in food archives it', async () => {
  const agent = await agentWithBaby()
  const banana = (await agent.get('/api/v1/foods')).body.foods.find((f) => f.name === 'בננה')
  assert.deepEqual((await agent.delete(`/api/v1/foods/${banana.id}`)).body, { result: 'archived' })
})

test('restore brings an archived food back', async () => {
  const agent = await agentWithBaby()
  const pear = (await agent.get('/api/v1/foods')).body.foods.find((f) => f.name === 'אגס')
  await agent.post(`/api/v1/foods/${pear.id}/archive`)
  assert.equal((await agent.get('/api/v1/foods')).body.foods.find((f) => f.id === pear.id), undefined)
  const res = await agent.post(`/api/v1/foods/${pear.id}/restore`)
  assert.equal(res.status, 200)
  assert.equal(res.body.food.archived, false)
  assert.ok((await agent.get('/api/v1/foods')).body.foods.find((f) => f.id === pear.id))
})

test('DELETE of an allergen with foods archives it; of an unused custom allergen deletes it', async () => {
  const agent = await agentWithBaby()
  const withFood = (await agent.post('/api/v1/allergens').send({ name: 'עם מזון' })).body.allergen
  await agent
    .post('/api/v1/foods')
    .send({ name: 'מזון', category: 'other', emoji: '🍯', allergenId: withFood.id })
  const alone = (await agent.post('/api/v1/allergens').send({ name: 'לבד' })).body.allergen
  assert.deepEqual((await agent.delete(`/api/v1/allergens/${withFood.id}`)).body, { result: 'archived' })
  assert.deepEqual((await agent.delete(`/api/v1/allergens/${alone.id}`)).body, { result: 'deleted' })
  const restored = await agent.post(`/api/v1/allergens/${withFood.id}/restore`)
  assert.equal(restored.body.allergen.archived, false)
})

test('an unknown or malformed id is 404', async () => {
  const agent = await agentWithBaby()
  assert.equal((await agent.patch('/api/v1/foods/not-an-id').send({ name: 'x' })).status, 404)
  assert.equal((await agent.delete('/api/v1/allergens/64b000000000000000000000')).status, 404)
})

test('GET /foods/:id/history lists the given days newest first', async () => {
  const agent = await agentWithBaby()
  const { body } = await agent.get('/api/v1/foods')
  const food = body.foods.find((f) => !f.allergenId)
  for (const date of ['2026-01-03', '2026-01-05']) {
    const made = await agent.post('/api/v1/calendar').send({ date, meal: 2, foodId: food.id, status: 'given' })
    assert.equal(made.status, 201)
  }
  await agent.post('/api/v1/calendar').send({ date: '2099-01-01', meal: 2, foodId: food.id })
  const res = await agent.get('/api/v1/foods/' + food.id + '/history')
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.items.map((i) => i.date), ['2026-01-05', '2026-01-03'])
  assert.deepEqual(Object.keys(res.body.items[0]).sort(), ['amount', 'date', 'id', 'liked', 'meal', 'note'])
  assert.equal((await agent.get('/api/v1/foods/64b000000000000000000000/history')).status, 404)
})

test('a food can be saved with an empty emoji (no icon)', async () => {
  const agent = await agentWithBaby()
  const res = await agent.post('/api/v1/foods').send({ name: 'ללא אייקון', category: 'other', emoji: '' })
  assert.equal(res.status, 201)
  assert.equal(res.body.food.emoji, '')
})
