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

test('both sleep routes answer 401 without a session', async () => {
  const app = ctx.newApp()
  assert.equal((await request(app).get('/api/v1/tracker/sleep/open')).status, 401)
  assert.equal((await request(app).post('/api/v1/tracker/sleep/toggle').send({})).status, 401)
})

test('open is null when nothing is open', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  const res = await a.get('/api/v1/tracker/sleep/open')
  assert.equal(res.status, 200)
  assert.equal(res.body, null)
})

test('toggle opens then closes a sleep with the duration; the parent comes from the session', async () => {
  const app = ctx.newApp()
  const a = await signedInAgent(app, 'parent-a')
  const b = await signedInAgent(app, 'parent-b')
  const start = await a.post('/api/v1/tracker/sleep/toggle').send({ location: 'STROLLER', at: '2021-05-01T10:00:00.000Z' })
  assert.equal(start.status, 200)
  assert.equal(start.body.action, 'start')
  assert.deepEqual(start.body.event.sleep, {
    startAt: '2021-05-01T10:00:00.000Z',
    endAt: null,
    startedBy: 'PARENT_A',
    startLocation: 'STROLLER',
  })
  assert.equal(start.body.event.loggedBy, 'PARENT_A')
  assert.equal(start.body.event.quickRecorded, false)

  const open = await b.get('/api/v1/tracker/sleep/open')
  assert.equal(open.body.id, start.body.event.id)

  const end = await b.post('/api/v1/tracker/sleep/toggle').send({ at: '2021-05-01T10:40:20.000Z' })
  assert.equal(end.body.action, 'end')
  assert.equal(end.body.event.id, start.body.event.id)
  assert.equal(end.body.event.sleep.endAt, '2021-05-01T10:40:20.000Z')
  assert.equal(end.body.event.sleep.durationMinutes, 40)
  assert.equal(end.body.event.sleep.endedBy, 'PARENT_B')
  assert.equal(end.body.event.sleep.startedBy, 'PARENT_A')
  assert.equal((await a.get('/api/v1/tracker/sleep/open')).body, null)
})

test('toggle without at uses now; a very short sleep lasts at least 1 minute', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  const start = await a.post('/api/v1/tracker/sleep/toggle').send({})
  assert.equal(start.status, 200)
  assert.ok(Math.abs(Date.now() - Date.parse(start.body.event.sleep.startAt)) < 60000)
  const end = await a.post('/api/v1/tracker/sleep/toggle').send({})
  assert.equal(end.body.event.sleep.durationMinutes, 1)
})

test('toggle refuses a manual time that overlaps another sleep (409 sleep_overlap)', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  await a.post('/api/v1/tracker/events').send({
    eventType: 'SLEEP',
    sleep: { startAt: '2020-03-01T10:00:00.000Z', endAt: '2020-03-01T11:00:00.000Z' },
  })
  const clash = await a.post('/api/v1/tracker/sleep/toggle').send({ at: '2020-03-01T10:30:00.000Z' })
  assert.equal(clash.status, 409)
  assert.equal(clash.body.error.code, 'sleep_overlap')
  assert.equal((await a.get('/api/v1/tracker/sleep/open')).body, null)
  // an open sleep that would start before another sleep and run through it is refused too
  const early = await a.post('/api/v1/tracker/sleep/toggle').send({ at: '2020-03-01T09:00:00.000Z' })
  assert.equal(early.status, 409)
})

test('the toggle ends the open sleep instead of starting a second one', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  const start = await a.post('/api/v1/tracker/sleep/toggle').send({ at: '2030-03-01T12:00:00.000Z' })
  assert.equal(start.body.action, 'start')
  const next = await a.post('/api/v1/tracker/sleep/toggle').send({ at: '2030-03-01T12:30:00.000Z' })
  assert.equal(next.body.action, 'end')
  assert.equal(next.body.event.sleep.durationMinutes, 30)
  // ending before the start is refused and leaves the sleep open
  await a.post('/api/v1/tracker/sleep/toggle').send({ at: '2031-01-01T10:00:00.000Z' })
  const bad = await a.post('/api/v1/tracker/sleep/toggle').send({ at: '2031-01-01T09:00:00.000Z' })
  assert.equal(bad.status, 400)
  assert.ok((await a.get('/api/v1/tracker/sleep/open')).body)
  await a.post('/api/v1/tracker/sleep/toggle').send({ at: '2031-01-01T10:30:00.000Z' })
})

test('toggle validates its body', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  assert.equal((await a.post('/api/v1/tracker/sleep/toggle').send({ location: 'BED' })).status, 400)
  assert.equal((await a.post('/api/v1/tracker/sleep/toggle').send({ at: 'soon' })).status, 400)
  assert.equal((await a.post('/api/v1/tracker/sleep/toggle').send({ loggedBy: 'PARENT_B' })).status, 400)
})
