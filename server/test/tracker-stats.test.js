import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { signedInAgent, startTestApp } from './helpers.js'
import { dayKey, rangeBounds } from '../domain/tracker/stats.js'

const babyDayStart = (date) => Date.parse(rangeBounds({ from: date, to: date, dayStartHour: 6 }).from)

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

test('D-015-2: with events only today the averages are the same for 1, 3, 7 and 14 days, daysWithData 1', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-b')
  const nowMs = Date.now()
  const today = dayKey(nowMs, 6)
  const at = (minutesAgo) => new Date(Math.max(nowMs - minutesAgo * 60000, babyDayStart(today))).toISOString()
  for (const body of [
    { eventType: 'NUTRITION', timestamp: at(2), nutrition: { feedType: 'BREAST', durationMinutes: 5 } },
    { eventType: 'NUTRITION', timestamp: at(1), nutrition: { feedType: 'BREAST', durationMinutes: 5 } },
    { eventType: 'DIAPER', timestamp: at(1), diaper: { contains: 'PEE' } },
  ]) {
    const res = await a.post('/api/v1/tracker/events').send(body)
    assert.ok(res.status === 200 || res.status === 201, `create ${res.status}`)
  }
  for (const days of [1, 3, 7, 14]) {
    const from = new Date(Date.parse(`${today}T12:00:00Z`) - (days - 1) * 86400000).toISOString().slice(0, 10)
    const n = await a.get(`/api/v1/tracker/stats/nutrition?from=${from}&to=${today}`)
    assert.equal(n.status, 200)
    assert.equal(n.body.totals.rangeDays, days)
    assert.equal(n.body.totals.daysWithData, 1, `range ${days}`)
    assert.equal(n.body.totals.feedsPerDay, 2, `range ${days}`)
    const d = await a.get(`/api/v1/tracker/stats/diapers?from=${from}&to=${today}`)
    assert.equal(d.body.totals.perDay, 1)
  }
})

test('D-015-2: an empty range answers daysWithData 0 and zero averages', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  const res = await a.get('/api/v1/tracker/stats/diapers?from=2001-01-01&to=2001-01-07')
  assert.equal(res.body.totals.daysWithData, 0)
  assert.equal(res.body.totals.rangeDays, 7)
  assert.equal(res.body.totals.perDay, 0)
})
