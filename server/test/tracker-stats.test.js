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

const KINDS = ['nutrition', 'sleep', 'diapers', 'weight', 'pumping', 'vomiting']
const Q = '?from=2026-06-10&to=2026-06-11'

test('every stats route answers 401 without a session', async () => {
  const app = ctx.newApp()
  for (const k of KINDS) assert.equal((await request(app).get(`/api/v1/tracker/stats/${k}${Q}`)).status, 401)
})

test('from and to must be YYYY-MM-DD: a full ISO string, a missing value and a reversed range are 400 (F1)', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  for (const k of KINDS) {
    const iso = await a.get(`/api/v1/tracker/stats/${k}?from=2026-06-10T03:00:00.000Z&to=2026-06-11`)
    assert.equal(iso.status, 400, k)
    assert.equal(iso.body.error.code, 'invalid')
    assert.equal((await a.get(`/api/v1/tracker/stats/${k}?to=2026-06-11`)).status, 400)
    assert.equal((await a.get(`/api/v1/tracker/stats/${k}?from=2026-06-10&to=2026-06-11T00:00:00Z`)).status, 400)
  }
  assert.equal((await a.get('/api/v1/tracker/stats/nutrition?from=2026-06-12&to=2026-06-11')).status, 400)
  assert.equal((await a.get('/api/v1/tracker/stats/nutrition?from=2026-02-30&to=2026-03-01')).status, 400)
})

test('an unknown kind is 404', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  assert.equal((await a.get(`/api/v1/tracker/stats/bogus${Q}`)).status, 404)
})

test('an empty range answers 200 with zero totals', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  const res = await a.get('/api/v1/tracker/stats/nutrition?from=2001-01-01&to=2001-01-02')
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.days, [])
  assert.equal(res.body.totals.feedsCount, 0)
})

test('stats read the household events with the 06:00 baby day', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  const bottle = (timestamp, consumed) => ({
    eventType: 'NUTRITION',
    timestamp,
    nutrition: { feedType: 'BOTTLE', amountOfferedMl: consumed, amountConsumedMl: consumed },
  })
  for (const body of [
    bottle('2026-06-10T08:00:00.000Z', 60),
    bottle('2026-06-10T10:00:00.000Z', 90),
    bottle('2026-06-10T02:59:00.000Z', 40), // 05:59 local: the previous baby day
    { eventType: 'WEIGHT', timestamp: '2026-06-10T08:00:00.000Z', weight: { weightGrams: 5200 } },
  ]) {
    const res = await a.post('/api/v1/tracker/events').send(body)
    assert.ok(res.status === 200 || res.status === 201, `create ${res.status}`)
  }
  const n = await a.get(`/api/v1/tracker/stats/nutrition${Q}`)
  assert.equal(n.status, 200)
  assert.equal(n.body.days.length, 1)
  assert.equal(n.body.days[0].date, '2026-06-10')
  assert.equal(n.body.totals.bottleMl, 150)
  const w = await a.get(`/api/v1/tracker/stats/weight${Q}`)
  assert.equal(w.body.totals.latestGrams, 5200)
  const s = await a.get(`/api/v1/tracker/stats/sleep${Q}`)
  assert.equal(s.body.days.length, 2)
})
