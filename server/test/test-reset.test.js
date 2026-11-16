import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../app.js'
import { loadConfig } from '../config.js'
import { signedInAgent, startTestApp } from './helpers.js'

let ctx

before(async () => {
  ctx = await startTestApp()
})

after(async () => {
  await ctx.stop()
})

test('the reset route does not exist unless e2eReset is on', async () => {
  const res = await request(ctx.newApp()).post('/api/v1/test/reset')
  assert.equal(res.status, 404)
})

test('E2E_RESET is ignored in production', () => {
  const base = { MONGODB_URI: 'mongodb://x', SESSION_SECRET: 's', APP_USERS: 'a:$2b$10$hash', E2E_RESET: '1' }
  assert.equal(loadConfig({ ...base, NODE_ENV: 'production' }).e2eReset, false)
  assert.equal(loadConfig({ ...base, NODE_ENV: 'development' }).e2eReset, true)
})

test('reset empties every collection, sessions included', async () => {
  const app = createApp({ config: { ...ctx.config, e2eReset: true }, db: ctx.db })
  const agent = await signedInAgent(app)
  await agent.put('/api/v1/baby').send({ name: 'נועה', birthDate: '2026-09-01' })
  const res = await request(app).post('/api/v1/test/reset')
  assert.equal(res.status, 200)
  assert.equal(await ctx.db.collection('babies').countDocuments(), 0)
  assert.equal(await ctx.db.collection('sessions').countDocuments(), 0)
  assert.equal((await agent.get('/api/v1/baby')).status, 401)
})
