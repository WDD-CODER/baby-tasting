import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { todayIso } from '../lib/dates.js'
import { signedInAgent, startTestApp } from './helpers.js'

let ctx

before(async () => {
  ctx = await startTestApp()
})

after(async () => {
  await ctx.stop()
})

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

test('GET and PUT baby without a session are 401', async () => {
  const app = ctx.newApp()
  assert.equal((await request(app).get('/api/v1/baby')).status, 401)
  const put = await request(app).put('/api/v1/baby').send({ name: 'נועה', birthDate: '2026-01-01' })
  assert.equal(put.status, 401)
})

test('two allowed usernames read and write the same baby', async () => {
  const app = ctx.newApp()
  const a = await signedInAgent(app, 'parent-a')
  const b = await signedInAgent(app, 'PARENT-B')
  const empty = await a.get('/api/v1/baby')
  assert.deepEqual(empty.body, { baby: null })
  const saved = await a.put('/api/v1/baby').send({ name: ' נועה ', birthDate: addDays(todayIso(), -150) })
  assert.equal(saved.status, 200)
  assert.equal(saved.body.baby.name, 'נועה')
  const read = await b.get('/api/v1/baby')
  assert.deepEqual(read.body, saved.body)
  const edited = await b.put('/api/v1/baby').send({ name: 'מיה', birthDate: saved.body.baby.birthDate })
  assert.equal(edited.body.baby.id, saved.body.baby.id)
  const back = await a.get('/api/v1/baby')
  assert.equal(back.body.baby.name, 'מיה')
})

test('PUT baby refuses an empty name, a future date, a bad date and a too old date', async () => {
  const app = ctx.newApp()
  const a = await signedInAgent(app)
  const today = todayIso()
  const cases = [
    { name: '   ', birthDate: today },
    { name: 'x'.repeat(41), birthDate: today },
    { name: 'נועה', birthDate: addDays(today, 2) },
    { name: 'נועה', birthDate: '2026-02-30' },
    { name: 'נועה', birthDate: 'yesterday' },
    { name: 'נועה', birthDate: '1999-01-01' },
    {},
  ]
  for (const body of cases) {
    const res = await a.put('/api/v1/baby').send(body)
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.equal(res.body.error.code, 'invalid')
  }
})
