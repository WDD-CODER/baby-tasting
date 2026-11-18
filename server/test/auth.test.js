import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../app.js'
import { hashToken } from '../repositories/sessions-repository.js'
import { signedInAgent, startTestApp } from './helpers.js'

let ctx

before(async () => {
  ctx = await startTestApp()
})

after(async () => {
  await ctx.stop()
})

const DAY_MS = 24 * 60 * 60 * 1000
const FAILED = { error: { code: 'login_failed', message: 'Login failed' } }

function sessionToken(res) {
  const cookie = res.headers['set-cookie'].find((c) => c.startsWith('bt_session='))
  return decodeURIComponent(cookie.split(';')[0].slice('bt_session='.length))
}

test('the right password for an allowed name (any case, spaces) gives a session and me answers', async () => {
  const app = ctx.newApp()
  const agent = request.agent(app)
  const res = await agent.post('/api/v1/auth/login').send({ username: '  PARENT-a ', password: 'test-pass-a' })
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { username: 'Parent-A', parentType: 'PARENT_A', parentName: 'אמא' })
  const cookie = res.headers['set-cookie'].join(';')
  assert.match(cookie, /bt_session=/)
  assert.match(cookie, /HttpOnly/i)
  assert.match(cookie, /SameSite=Lax/i)
  const maxAge = Number(/Max-Age=(\d+)/i.exec(cookie)[1])
  assert.equal(maxAge, 365 * 24 * 60 * 60)
  const me = await agent.get('/api/v1/auth/me')
  assert.equal(me.status, 200)
  assert.deepEqual(me.body, {
    username: 'Parent-A',
    parentType: 'PARENT_A',
    parentName: 'אמא',
    mode: 'env',
    partnerExists: true,
  })
})

test('me returns PARENT_B and parent B name for the second APP_USERS entry', async () => {
  const app = ctx.newApp()
  const agent = await signedInAgent(app, 'parent-b')
  const me = await agent.get('/api/v1/auth/me')
  assert.deepEqual(me.body, {
    username: 'parent-b',
    parentType: 'PARENT_B',
    parentName: 'אבא',
    mode: 'env',
    partnerExists: true,
  })
})

test('an old session without parentType still resolves to the right parent', async () => {
  const app = ctx.newApp()
  const b = await signedInAgent(app, 'parent-b')
  const a = await signedInAgent(app, 'parent-a')
  await ctx.db.collection('sessions').updateMany({}, { $unset: { parentType: '' } })
  assert.equal((await b.get('/api/v1/auth/me')).body.parentType, 'PARENT_B')
  assert.equal((await a.get('/api/v1/auth/me')).body.parentType, 'PARENT_A')
})

test('a wrong password, an unknown name and other failures share one 401 body', async () => {
  const app = ctx.newApp()
  const wrong = await request(app).post('/api/v1/auth/login').send({ username: 'parent-a', password: 'test-pass-b' })
  const unknown = await request(app).post('/api/v1/auth/login').send({ username: 'nobody', password: 'test-pass-a' })
  const noPassword = await request(app).post('/api/v1/auth/login').send({ username: 'parent-a' })
  const missing = await request(app).post('/api/v1/auth/login').send({})
  const wrongType = await request(app).post('/api/v1/auth/login').send({ username: 5, password: 5 })
  for (const res of [wrong, unknown, noPassword, missing, wrongType]) {
    assert.equal(res.status, 401)
    assert.deepEqual(res.body, FAILED)
    assert.equal(res.headers['set-cookie'], undefined)
  }
})

test('the 11th login attempt in 15 minutes gets 429', async () => {
  const app = ctx.newApp()
  for (let i = 0; i < 10; i++) {
    const res = await request(app).post('/api/v1/auth/login').send({ username: 'parent-a', password: 'nope' })
    assert.equal(res.status, 401)
  }
  const res = await request(app).post('/api/v1/auth/login').send({ username: 'parent-a', password: 'test-pass-a' })
  assert.equal(res.status, 429)
  assert.equal(res.body.error.code, 'rate_limited')
})

test('an authenticated request moves the session expiry forward (rolling), at most once a day', async () => {
  const app = ctx.newApp()
  const agent = request.agent(app)
  const login = await agent.post('/api/v1/auth/login').send({ username: 'parent-a', password: 'test-pass-a' })
  const tokenHash = hashToken(sessionToken(login))
  const sessions = ctx.db.collection('sessions')

  // fresh session: nothing to renew
  const first = await agent.get('/api/v1/auth/me')
  assert.equal(first.status, 200)
  assert.equal(first.headers['set-cookie'], undefined)

  // pretend the session was last renewed 10 days ago
  const old = new Date(Date.now() + 355 * DAY_MS)
  await sessions.updateOne({ tokenHash }, { $set: { expiresAt: old } })
  // a changed row is seen at once only by an app with an empty session memory
  const cookie = `bt_session=${encodeURIComponent(sessionToken(login))}`
  const renewed = await request(ctx.newApp()).get('/api/v1/auth/me').set('Cookie', cookie)
  assert.equal(renewed.status, 200)
  assert.match(renewed.headers['set-cookie'].join(';'), /bt_session=.*Max-Age=31536000/i)
  const after = await sessions.findOne({ tokenHash })
  assert.ok(after.expiresAt.getTime() > old.getTime() + 9 * DAY_MS)
  assert.ok(after.expiresAt.getTime() <= Date.now() + 365 * DAY_MS)
})

test('a session close to its end is renewed instead of running out', async () => {
  const app = ctx.newApp()
  const agent = request.agent(app)
  const login = await agent.post('/api/v1/auth/login').send({ username: 'parent-b', password: 'test-pass-b' })
  const tokenHash = hashToken(sessionToken(login))
  const sessions = ctx.db.collection('sessions')
  await sessions.updateOne({ tokenHash }, { $set: { expiresAt: new Date(Date.now() + 60 * 1000) } })
  const cookie = `bt_session=${encodeURIComponent(sessionToken(login))}`
  assert.equal((await request(ctx.newApp()).get('/api/v1/baby').set('Cookie', cookie)).status, 200)
  const after = await sessions.findOne({ tokenHash })
  assert.ok(after.expiresAt.getTime() > Date.now() + 364 * DAY_MS)
})

test('two authenticated requests in a row read the sessions collection once', async () => {
  const app = ctx.newApp()
  const agent = await signedInAgent(app, 'parent-a')
  const sessions = ctx.db.collection('sessions')
  const proto = Object.getPrototypeOf(sessions)
  const original = proto.findOne
  let reads = 0
  // db.collection() makes a new object each time, so the spy sits on the shared prototype
  proto.findOne = function (...args) {
    if (this.collectionName === 'sessions') reads++
    return original.apply(this, args)
  }
  try {
    assert.equal((await agent.get('/api/v1/auth/me')).status, 200)
    assert.equal((await agent.get('/api/v1/auth/me')).status, 200)
  } finally {
    proto.findOne = original
  }
  assert.equal(reads, 1)
})

test('after "reset parent B" parent B gets 401 on the next request', async () => {
  const config = { allowedOrigins: [], staticDir: process.cwd(), nodeEnv: 'test', appUsers: [], e2eReset: false }
  for (const name of ['users', 'invites', 'sessions', 'households']) await ctx.db.collection(name).deleteMany({})
  const app = createApp({ config, db: ctx.db })
  const a = request.agent(app)
  assert.equal((await a.post('/api/v1/auth/signup').send({ username: 'mum', password: 'pass1' })).status, 200)
  const inv = await a.post('/api/v1/auth/invites')
  const b = request.agent(app)
  const joined = await b.post('/api/v1/auth/signup').send({ username: 'dad', password: 'pass1', inviteToken: inv.body.token })
  assert.equal(joined.status, 200, JSON.stringify(joined.body))
  assert.equal((await b.get('/api/v1/auth/me')).status, 200)
  assert.equal((await a.post('/api/v1/auth/parent-b/reset')).status, 200)
  assert.equal((await b.get('/api/v1/auth/me')).status, 401)
})

test('me without a session is 401; after logout the same cookie gets 401', async () => {
  const app = ctx.newApp()
  const anon = await request(app).get('/api/v1/auth/me')
  assert.equal(anon.status, 401)
  assert.equal(anon.body.error.code, 'unauthorized')
  const login = await request(app).post('/api/v1/auth/login').send({ username: 'parent-a', password: 'test-pass-a' })
  const cookie = `bt_session=${encodeURIComponent(sessionToken(login))}`
  assert.equal((await request(app).get('/api/v1/auth/me').set('Cookie', cookie)).status, 200)
  const out = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie)
  assert.equal(out.status, 200)
  const after = await request(app).get('/api/v1/auth/me').set('Cookie', cookie)
  assert.equal(after.status, 401)
})

test('signing out one phone leaves the other phone signed in', async () => {
  const app = ctx.newApp()
  const phone1 = await signedInAgent(app, 'parent-a')
  const phone2 = await signedInAgent(app, 'parent-a')
  await phone1.post('/api/v1/auth/logout')
  assert.equal((await phone1.get('/api/v1/auth/me')).status, 401)
  assert.equal((await phone2.get('/api/v1/auth/me')).status, 200)
})

test('no response body contains the other username or a password hash', async () => {
  const app = ctx.newApp()
  const agent = await signedInAgent(app)
  const bodies = [
    (await request(app).post('/api/v1/auth/login').send({ username: 'nobody', password: 'x' })).text,
    (await agent.get('/api/v1/auth/me')).text,
    (await agent.get('/api/v1/baby')).text,
    (await agent.get('/api/v1/tracker/settings')).text,
    (await request(app).get('/api/v1/health')).text,
    (await request(app).get('/api/v1/nope')).text,
  ]
  for (const text of bodies) {
    assert.ok(!/parent-b/i.test(text), text)
    assert.ok(!/\$2[aby]\$/.test(text), text)
  }
})
