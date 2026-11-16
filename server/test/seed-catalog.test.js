import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { BUILT_IN_ALLERGENS, BUILT_IN_FOODS } from '../seed/catalog.js'
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
  const baby = await agent.put('/api/v1/baby').send({ name: 'נועה', birthDate: new Date().toISOString().slice(0, 10) })
  assert.equal(baby.status, 200)
  return agent
}

test('the seed file holds 13 allergens, unique keys and names, and valid references', () => {
  assert.equal(BUILT_IN_ALLERGENS.length, 13)
  const allergenKeys = new Set(BUILT_IN_ALLERGENS.map((a) => a.key))
  assert.equal(allergenKeys.size, 13)
  assert.equal(new Set(BUILT_IN_FOODS.map((f) => f.key)).size, BUILT_IN_FOODS.length)
  assert.equal(new Set(BUILT_IN_FOODS.map((f) => f.name)).size, BUILT_IN_FOODS.length)
  for (const food of BUILT_IN_FOODS) {
    if (food.allergenKey) assert.ok(allergenKeys.has(food.allergenKey), food.key)
  }
})

test('the first catalog call seeds 13 allergens and every built-in food; a second call adds nothing', async () => {
  const agent = await agentWithBaby()
  const allergens = await agent.get('/api/v1/allergens')
  assert.equal(allergens.status, 200)
  assert.equal(allergens.body.allergens.length, 13)
  assert.ok(allergens.body.allergens.every((a) => a.builtIn))
  const foods = await agent.get('/api/v1/foods')
  assert.equal(foods.body.foods.length, BUILT_IN_FOODS.length)
  const sesame = allergens.body.allergens.find((a) => a.name === 'שומשום')
  const tahini = foods.body.foods.find((f) => f.name === 'טחינה')
  assert.equal(tahini.allergenId, sesame.id)
  const grapes = foods.body.foods.find((f) => f.name === 'ענבים')
  assert.deepEqual(grapes.warning, { text: 'לחתוך לרבעים לאורך', untilMonths: 60 })

  await agent.get('/api/v1/allergens')
  await agent.get('/api/v1/foods')
  assert.equal(await ctx.db.collection('allergens').countDocuments({}), 13)
  assert.equal(await ctx.db.collection('foods').countDocuments({}), BUILT_IN_FOODS.length)
})

test('concurrent first calls still seed each built-in once', async () => {
  const agent = await agentWithBaby()
  await ctx.db.collection('foods').createIndex(
    { householdId: 1, builtInKey: 1 },
    { unique: true, partialFilterExpression: { builtInKey: { $type: 'string' } } },
  )
  await ctx.db.collection('allergens').createIndex(
    { householdId: 1, builtInKey: 1 },
    { unique: true, partialFilterExpression: { builtInKey: { $type: 'string' } } },
  )
  await Promise.all([agent.get('/api/v1/foods'), agent.get('/api/v1/foods'), agent.get('/api/v1/allergens')])
  assert.equal(await ctx.db.collection('allergens').countDocuments({}), 13)
  assert.equal(await ctx.db.collection('foods').countDocuments({}), BUILT_IN_FOODS.length)
})

test('an edited built-in food keeps the edit after another seed call', async () => {
  const agent = await agentWithBaby()
  const { body } = await agent.get('/api/v1/foods')
  const banana = body.foods.find((f) => f.name === 'בננה')
  const patched = await agent.patch(`/api/v1/foods/${banana.id}`).send({ name: 'בננה קטנה', emoji: '🍑' })
  assert.equal(patched.status, 200)
  const again = await agent.get('/api/v1/foods')
  const edited = again.body.foods.find((f) => f.id === banana.id)
  assert.equal(edited.name, 'בננה קטנה')
  assert.equal(edited.emoji, '🍑')
  assert.equal(again.body.foods.length, BUILT_IN_FOODS.length)
})

test('an archived built-in food stays archived after another seed call', async () => {
  const agent = await agentWithBaby()
  const { body } = await agent.get('/api/v1/foods')
  const apple = body.foods.find((f) => f.name === 'תפוח')
  assert.equal((await agent.post(`/api/v1/foods/${apple.id}/archive`)).status, 200)
  const active = await agent.get('/api/v1/foods')
  assert.equal(active.body.foods.length, BUILT_IN_FOODS.length - 1)
  const all = await agent.get('/api/v1/foods?archived=1')
  assert.equal(all.body.foods.length, BUILT_IN_FOODS.length)
  assert.equal(all.body.foods.find((f) => f.id === apple.id).archived, true)
})

test('the catalog needs a baby: 409 no_baby', async () => {
  const agent = await signedInAgent(ctx.newApp())
  const res = await agent.get('/api/v1/foods')
  assert.equal(res.status, 409)
  assert.equal(res.body.error.code, 'no_baby')
})
