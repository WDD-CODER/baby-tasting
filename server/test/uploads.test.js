import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createPhotoStore } from '../lib/cloudinary.js'
import { signedInAgent, startTestApp } from './helpers.js'

let ctx
before(async () => {
  ctx = await startTestApp()
})
after(async () => {
  await ctx.stop()
})

test('the signature route answers 401 without a session', async () => {
  assert.equal((await request(ctx.newApp()).post('/api/v1/uploads/signature')).status, 401)
})

test('without Cloudinary the signature route answers 503 photos_not_configured', async () => {
  const agent = await signedInAgent(ctx.newApp({ photoStore: createPhotoStore(null) }))
  const res = await agent.post('/api/v1/uploads/signature')
  assert.equal(res.status, 503)
  assert.equal(res.body.error.code, 'photos_not_configured')
})

test('with keys the signature covers the household folder and the allowed formats', async () => {
  const store = createPhotoStore({ cloudName: 'demo', apiKey: 'key', apiSecret: 'topsecret' })
  const agent = await signedInAgent(ctx.newApp({ photoStore: store }))
  const res = await agent.post('/api/v1/uploads/signature')
  assert.equal(res.status, 200)
  assert.equal(res.body.cloudName, 'demo')
  assert.equal(res.body.apiKey, 'key')
  assert.match(res.body.folder, /^baby-tasting\//)
  assert.equal(res.body.allowedFormats, 'jpg,jpeg,png,webp,heic')
  assert.match(res.body.signature, /^[0-9a-f]{40,64}$/)
  assert.ok(!JSON.stringify(res.body).includes('topsecret'))
})
