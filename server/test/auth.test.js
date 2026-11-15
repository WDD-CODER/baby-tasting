import { test, before, after } from 'node:test'
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

test('an allowed username (any case, spaces) gets a session cookie and me answers', async () => {
  const app = ctx.newApp()
  const agent = request.agent(app)
  const res = await agent.post('/api/v1/auth/login').send({ username: '  PARENT-a ' })
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { username: 'Parent-A' })
  const cookie = res.headers['set-cookie'].join(';')
  assert.match(cookie, /bt_session=/)
  assert.match(cookie, /HttpOnly/i)
  assert.match(cookie, /SameSite=Lax/i)
  const me = await agent.get('/api/v1/auth/me')
  assert.equal(me.status, 200)
  assert.deepEqual(me.body, { username: 'Parent-A' })
})

test('unknown username and other failures share one 401 body', async () => {
  const app = ctx.newApp()
  const unknown = await request(app).post('/api/v1/auth/login').send({ username: 'nobody' })
  const missing = await request(app).post('/api/v1/auth/login').send({})
  const wrongType = await request(app).post('/api/v1/auth/login').send({ username: 5 })
  assert.equal(unknown.status, 401)
  assert.deepEqual(unknown.body, { error: { code: 'login_failed', message: 'Login failed' } })
  assert.deepEqual(missing.body, unknown.body)
  assert.deepEqual(wrongType.body, unknown.body)
  assert.equal(missing.status, 401)
})

test('the 11th login attempt from one IP gets 429', async () => {
  const app = ctx.newApp()
  for (let i = 0; i < 10; i++) {
    const res = await request(app).post('/api/v1/auth/login').send({ username: 'nobody' })
    assert.equal(res.status, 401)
  }
  const res = await request(app).post('/api/v1/auth/login').send({ username: 'nobody' })
  assert.equal(res.status, 429)
  assert.equal(res.body.error.code, 'rate_limited')
})

test('me without a session is 401, logout ends the session', async () => {
  const app = ctx.newApp()
  const anon = await request(app).get('/api/v1/auth/me')
  assert.equal(anon.status, 401)
  assert.equal(anon.body.error.code, 'unauthorized')
  const agent = await signedInAgent(app)
  const out = await agent.post('/api/v1/auth/logout')
  assert.equal(out.status, 200)
  const after = await agent.get('/api/v1/auth/me')
  assert.equal(after.status, 401)
})

test('no response body contains the list of allowed usernames', async () => {
  const app = ctx.newApp()
  const agent = await signedInAgent(app)
  const bodies = [
    (await request(app).post('/api/v1/auth/login').send({ username: 'nobody' })).text,
    (await agent.get('/api/v1/auth/me')).text,
    (await agent.get('/api/v1/baby')).text,
    (await request(app).get('/api/v1/health')).text,
    (await request(app).get('/api/v1/nope')).text,
  ]
  for (const text of bodies) {
    assert.ok(!/parent-b/i.test(text), text)
  }
})
