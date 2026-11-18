import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '../app.js'
import { createIndexes } from '../repositories/indexes.js'
import { startTestApp } from './helpers.js'

let db
let envCtx

// db mode: a config with no APP_USERS
const config = { allowedOrigins: [], staticDir: process.cwd(), nodeEnv: 'test', appUsers: [], e2eReset: false }

before(async () => {
  envCtx = await startTestApp()
  db = envCtx.db
  await createIndexes(db)
})

after(async () => {
  await envCtx.stop()
})

async function reset() {
  for (const name of ['users', 'invites', 'sessions', 'households']) await db.collection(name).deleteMany({})
  return createApp({ config, db })
}

const API = '/api/v1/auth'
const signup = (app, body) => request(app).post(`${API}/signup`).send(body)

async function firstParent(app, username = 'dad') {
  const agent = request.agent(app)
  const res = await agent.post(`${API}/signup`).send({ username, password: 'pass1' })
  assert.equal(res.status, 200)
  return agent
}

async function invite(agent) {
  const res = await agent.post(`${API}/invites`)
  assert.equal(res.status, 200)
  return res.body
}

test('production config without APP_USERS starts in db mode', async () => {
  const app = await reset()
  const res = await request(app).get(`${API}/signup-status`)
  assert.deepEqual(res.body, { mode: 'db', firstAccountOpen: true })
})

test('with APP_USERS set, sign-up and invite endpoints answer 409 signup_closed', async () => {
  const app = envCtx.newApp()
  const status = await request(app).get(`${API}/signup-status`)
  assert.deepEqual(status.body, { mode: 'env', firstAccountOpen: false })
  const calls = [
    request(app).post(`${API}/signup`).send({ username: 'dad', password: 'pass1' }),
    request(app).get(`${API}/invites/abc`),
  ]
  for (const res of await Promise.all(calls)) {
    assert.equal(res.status, 409)
    assert.equal(res.body.error.code, 'signup_closed')
  }
  const agent = request.agent(app)
  await agent.post(`${API}/login`).send({ username: 'parent-a', password: 'test-pass-a' })
  for (const path of ['/invites', '/parent-b/reset']) {
    const res = await agent.post(`${API}${path}`)
    assert.equal(res.status, 409)
    assert.equal(res.body.error.code, 'signup_closed')
  }
})

test('the first sign-up becomes PARENT_A, gets a cookie and joins the household', async () => {
  const app = await reset()
  const agent = request.agent(app)
  const res = await agent.post(`${API}/signup`).send({ username: ' Dad ', password: 'pass1' })
  assert.equal(res.status, 200)
  assert.equal(res.body.username, 'Dad')
  assert.equal(res.body.parentType, 'PARENT_A')
  assert.match(res.headers['set-cookie'].join(';'), /bt_session=/)
  const me = await agent.get(`${API}/me`)
  assert.equal(me.status, 200)
  assert.equal(me.body.mode, 'db')
  assert.equal(me.body.partnerExists, false)
  assert.equal(await db.collection('households').countDocuments({ key: 'default', members: 'Dad' }), 1)
  const status = await request(app).get(`${API}/signup-status`)
  assert.equal(status.body.firstAccountOpen, false)
})

test('invalid name or password answers 400 invalid with the field', async () => {
  const app = await reset()
  const badName = await signup(app, { username: 'a', password: 'pass1' })
  assert.equal(badName.status, 400)
  assert.equal(badName.body.error.code, 'invalid')
  assert.equal(badName.body.error.field, 'username')
  const badPass = await signup(app, { username: 'dad', password: 'abc' })
  assert.equal(badPass.status, 400)
  assert.equal(badPass.body.error.field, 'password')
})

test('login works against the users collection, and a wrong password does not', async () => {
  const app = await reset()
  await firstParent(app)
  const ok = await request(app).post(`${API}/login`).send({ username: 'DAD', password: 'pass1' })
  assert.equal(ok.status, 200)
  assert.equal(ok.body.parentType, 'PARENT_A')
  const bad = await request(app).post(`${API}/login`).send({ username: 'dad', password: 'nope' })
  assert.equal(bad.status, 401)
})

test('a second sign-up without an invite answers 403 invite_required', async () => {
  const app = await reset()
  await firstParent(app)
  const res = await signup(app, { username: 'mom', password: 'pass2' })
  assert.equal(res.status, 403)
  assert.equal(res.body.error.code, 'invite_required')
})

test('an unknown, expired or used token answers 403 invite_invalid', async () => {
  const app = await reset()
  const a = await firstParent(app)
  const unknown = await signup(app, { username: 'mom', password: 'pass2', inviteToken: 'nope' })
  assert.equal(unknown.status, 403)
  assert.equal(unknown.body.error.code, 'invite_invalid')

  const { token } = await invite(a)
  await db.collection('invites').updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } })
  const expired = await signup(app, { username: 'mom', password: 'pass2', inviteToken: token })
  assert.equal(expired.body.error.code, 'invite_invalid')
  assert.deepEqual((await request(app).get(`${API}/invites/${token}`)).body, { valid: false })

  const fresh = await invite(a)
  await db.collection('invites').updateMany({}, { $set: { usedAt: new Date() } })
  const used = await signup(app, { username: 'mom', password: 'pass2', inviteToken: fresh.token })
  assert.equal(used.body.error.code, 'invite_invalid')
})

test('a valid token makes PARENT_B once; a third sign-up is closed', async () => {
  const app = await reset()
  const a = await firstParent(app)
  const { token, expiresAt } = await invite(a)
  assert.ok(Math.abs(new Date(expiresAt).getTime() - (Date.now() + 7 * 24 * 3600 * 1000)) < 60 * 1000)
  assert.deepEqual((await request(app).get(`${API}/invites/${token}`)).body, { valid: true })

  const b = request.agent(app)
  const res = await b.post(`${API}/signup`).send({ username: 'mom', password: 'pass2', inviteToken: token })
  assert.equal(res.status, 200)
  assert.equal(res.body.parentType, 'PARENT_B')
  assert.equal((await b.get(`${API}/me`)).body.parentType, 'PARENT_B')

  assert.deepEqual((await request(app).get(`${API}/invites/${token}`)).body, { valid: false })
  const third = await signup(app, { username: 'gran', password: 'pass3', inviteToken: token })
  assert.equal(third.status, 409)
  assert.equal(third.body.error.code, 'signup_closed')
  assert.equal(await db.collection('users').countDocuments({}), 2)
})

test('a token cannot be used twice, even at the same moment', async () => {
  const app = await reset()
  const a = await firstParent(app)
  const { token } = await invite(a)
  const results = await Promise.all([
    signup(app, { username: 'mom1', password: 'pass2', inviteToken: token }),
    signup(app, { username: 'mom2', password: 'pass2', inviteToken: token }),
  ])
  assert.equal(results.filter((r) => r.status === 200).length, 1)
  assert.equal(await db.collection('users').countDocuments({ parentType: 'PARENT_B' }), 1)
})

test('two first sign-ups at once leave exactly one PARENT_A', async () => {
  const app = await reset()
  const results = await Promise.all([
    signup(app, { username: 'dad', password: 'pass1' }),
    signup(app, { username: 'mom', password: 'pass2' }),
  ])
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409])
  const loser = results.find((r) => r.status === 409)
  assert.ok(['signup_closed', 'username_taken'].includes(loser.body.error.code))
  assert.equal(await db.collection('users').countDocuments({ parentType: 'PARENT_A' }), 1)
})

test('a duplicate name in another case answers 409 username_taken', async () => {
  const app = await reset()
  const a = await firstParent(app, 'Dad')
  const { token } = await invite(a)
  const res = await signup(app, { username: 'dAD', password: 'pass2', inviteToken: token })
  assert.equal(res.status, 409)
  assert.equal(res.body.error.code, 'username_taken')
  // the invite was not spent by the failed attempt
  assert.deepEqual((await request(app).get(`${API}/invites/${token}`)).body, { valid: true })
})

test('only PARENT_A may create an invite; PARENT_B gets 403', async () => {
  const app = await reset()
  const a = await firstParent(app)
  const { token } = await invite(a)
  const b = request.agent(app)
  await b.post(`${API}/signup`).send({ username: 'mom', password: 'pass2', inviteToken: token })
  const denied = await b.post(`${API}/invites`)
  assert.equal(denied.status, 403)
  assert.equal(denied.body.error.code, 'forbidden')
  const reset403 = await b.post(`${API}/parent-b/reset`)
  assert.equal(reset403.status, 403)
  // parent B exists, so parent A cannot make another plain invite
  assert.equal((await a.post(`${API}/invites`)).status, 409)
  assert.equal((await request(app).post(`${API}/invites`)).status, 401)
})

test('a new invite replaces the earlier unused one', async () => {
  const app = await reset()
  const a = await firstParent(app)
  const first = await invite(a)
  const second = await invite(a)
  assert.notEqual(first.token, second.token)
  assert.deepEqual((await request(app).get(`${API}/invites/${first.token}`)).body, { valid: false })
  assert.deepEqual((await request(app).get(`${API}/invites/${second.token}`)).body, { valid: true })
})

test('the stored token is a hash, never the token itself', async () => {
  const app = await reset()
  const a = await firstParent(app)
  const { token } = await invite(a)
  const docs = await db.collection('invites').find({}).toArray()
  assert.equal(docs.length, 1)
  assert.match(docs[0].tokenHash, /^[0-9a-f]{64}$/)
  assert.ok(!JSON.stringify(docs[0]).includes(token))
  assert.ok(!JSON.stringify(await db.collection('users').find({}).toArray()).includes('pass1'))
})

test('resetting parent B signs them out, returns a new invite and lets them sign up again', async () => {
  const app = await reset()
  const a = await firstParent(app)
  const { token } = await invite(a)
  const b = request.agent(app)
  await b.post(`${API}/signup`).send({ username: 'mom', password: 'pass2', inviteToken: token })
  assert.equal((await b.get(`${API}/me`)).status, 200)

  const res = await a.post(`${API}/parent-b/reset`)
  assert.equal(res.status, 200)
  assert.ok(res.body.token)
  assert.ok(res.body.expiresAt)
  assert.equal((await b.get(`${API}/me`)).status, 401)
  assert.equal((await a.get(`${API}/me`)).status, 200)
  assert.equal(await db.collection('users').countDocuments({ parentType: 'PARENT_B' }), 0)

  const again = await signup(app, { username: 'mom', password: 'newpw', inviteToken: res.body.token })
  assert.equal(again.status, 200)
  assert.equal(again.body.parentType, 'PARENT_B')
  // nothing to reset any more once B is gone and signed up again only through a fresh reset
  await a.post(`${API}/parent-b/reset`)
  assert.equal((await a.post(`${API}/parent-b/reset`)).status, 409)
})

test('sign-up and invite checks share the login rate limit', async () => {
  const app = await reset()
  for (let i = 0; i < 10; i++) await request(app).get(`${API}/invites/nope`)
  const res = await signup(app, { username: 'dad', password: 'pass1' })
  assert.equal(res.status, 429)
})
