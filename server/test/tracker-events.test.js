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

const BODIES = {
  NUTRITION: { nutrition: { feedType: 'BREAST', breastSide: 'LEFT', durationMinutes: 10 } },
  DIAPER: { diaper: { contains: 'PEE', peeVolume: 'LIGHT' } },
  SLEEP: { sleep: { startAt: '2026-07-04T10:00:00.000Z', endAt: '2026-07-04T10:30:00.000Z', startLocation: 'CRIB' } },
  ACTIVITY: { activity: { activityName: 'שירים' } },
  WEIGHT: { weight: { weightGrams: 5200 } },
  PUMPING: { pumping: { leftAmountMl: 60, rightAmountMl: 50 } },
  VOMITING: { vomiting: { size: 'SMALL' } },
  SUPPLEMENT: { supplement: { name: 'ביו גאיה' } },
}
const EDITS = {
  NUTRITION: { nutrition: { feedType: 'BOTTLE', bottleLiquidType: 'FORMULA', amountOfferedMl: 100, amountConsumedMl: 90 } },
  DIAPER: { diaper: { contains: 'POO', pooAmount: 'MEDIUM' } },
  SLEEP: { sleep: { startAt: '2026-07-04T10:00:00.000Z', endAt: '2026-07-04T10:45:00.000Z' } },
  ACTIVITY: { activity: { activityName: 'אמבטיה', cryingIntensity: 4 } },
  WEIGHT: { weight: { weightGrams: 5300 } },
  PUMPING: { pumping: { leftAmountMl: 70, rightAmountMl: 40 } },
  VOMITING: { vomiting: { size: 'LARGE' } },
  SUPPLEMENT: { supplement: { name: 'ויטמין D' } },
}

const day = (n) => `2026-06-${String(n).padStart(2, '0')}T09:00:00.000Z`

test('every events route answers 401 without a session', async () => {
  const app = ctx.newApp()
  assert.equal((await request(app).get('/api/v1/tracker/events')).status, 401)
  assert.equal((await request(app).post('/api/v1/tracker/events').send({})).status, 401)
  assert.equal((await request(app).put('/api/v1/tracker/events/abc').send({})).status, 401)
  assert.equal((await request(app).delete('/api/v1/tracker/events/abc')).status, 401)
  assert.equal((await request(app).post('/api/v1/tracker/events/clear').send({})).status, 401)
})

test('create, list, edit and delete for each of the 8 event types', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  for (const [type, body] of Object.entries(BODIES)) {
    const created = await a.post('/api/v1/tracker/events').send({ eventType: type, ...body })
    assert.equal(created.status, 201, `${type} create ${JSON.stringify(created.body)}`)
    const ev = created.body.event
    assert.equal(ev.eventType, type)
    assert.equal(ev.loggedBy, 'PARENT_A')
    assert.ok(ev.id)

    const listed = await a.get('/api/v1/tracker/events')
    assert.ok(listed.body.events.some((e) => e.id === ev.id), `${type} listed`)

    const edited = await a.put(`/api/v1/tracker/events/${ev.id}`).send({ ...EDITS[type], note: 'hello' })
    assert.equal(edited.status, 200, `${type} edit ${JSON.stringify(edited.body)}`)
    const key = Object.keys(EDITS[type])[0]
    for (const [k, v] of Object.entries(EDITS[type][key])) assert.deepEqual(edited.body.event[key][k], v)
    assert.equal(edited.body.event.note, 'hello')
    assert.equal(edited.body.event.eventType, type)

    const del = await a.delete(`/api/v1/tracker/events/${ev.id}`)
    assert.equal(del.status, 200)
    assert.deepEqual(del.body, { success: true, deletedId: ev.id })
  }
})

test('soft-deleted events are never returned, edited or deleted again', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  const ev = (await a.post('/api/v1/tracker/events').send({ eventType: 'WEIGHT', ...BODIES.WEIGHT, timestamp: day(20) })).body.event
  assert.equal((await a.delete(`/api/v1/tracker/events/${ev.id}`)).status, 200)
  const listed = await a.get('/api/v1/tracker/events?limit=2000')
  assert.ok(!listed.body.events.some((e) => e.id === ev.id))
  assert.equal((await a.put(`/api/v1/tracker/events/${ev.id}`).send({ note: 'x' })).status, 404)
  assert.equal((await a.delete(`/api/v1/tracker/events/${ev.id}`)).status, 404)
  assert.equal((await a.delete('/api/v1/tracker/events/not-an-id')).status, 404)
  // the row is still stored, with deletedAt
  assert.ok(await ctx.db.collection('trackerEvents').findOne({ deletedAt: { $exists: true } }))
})

test('invalid bodies are 400 and unknown fields are refused', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  const post = (b) => a.post('/api/v1/tracker/events').send(b)
  assert.equal((await post({})).status, 400)
  assert.equal((await post({ eventType: 'SNEEZE' })).status, 400)
  assert.equal((await post({ eventType: 'DIAPER', diaper: { contains: 'NOPE' } })).status, 400)
  assert.equal((await post({ eventType: 'WEIGHT', ...BODIES.WEIGHT, colour: 'red' })).status, 400)
  const ev = (await post({ eventType: 'WEIGHT', ...BODIES.WEIGHT })).body.event
  assert.equal((await a.put(`/api/v1/tracker/events/${ev.id}`).send({ eventType: 'DIAPER' })).status, 400)
  assert.equal((await a.put(`/api/v1/tracker/events/${ev.id}`).send({ weight: { weightGrams: 'heavy' } })).status, 400)
})

test('list is newest first, honours from, to and limit', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-b')
  for (const n of [1, 2, 3]) {
    await a.post('/api/v1/tracker/events').send({ eventType: 'VOMITING', ...BODIES.VOMITING, timestamp: `2025-03-0${n}T09:00:00.000Z` })
  }
  const all = (await a.get('/api/v1/tracker/events?from=2025-03-01&to=2025-03-03')).body.events
  assert.deepEqual(all.map((e) => e.timestamp), ['2025-03-03T09:00:00.000Z', '2025-03-02T09:00:00.000Z', '2025-03-01T09:00:00.000Z'])
  const one = (await a.get('/api/v1/tracker/events?from=2025-03-01&to=2025-03-03&limit=1')).body.events
  assert.equal(one.length, 1)
  const range = (await a.get('/api/v1/tracker/events?from=2025-03-02&to=2025-03-02')).body.events
  assert.equal(range.length, 1)
  assert.equal((await a.get('/api/v1/tracker/events?limit=0')).status, 400)
  assert.equal((await a.get('/api/v1/tracker/events?from=nope')).status, 400)
})

test('clear with a date removes that date\'s events too (F7) and keeps later ones', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  const mk = (timestamp) => a.post('/api/v1/tracker/events').send({ eventType: 'SUPPLEMENT', ...BODIES.SUPPLEMENT, timestamp })
  // 2024-05-10 in Asia/Jerusalem (UTC+3) runs from 2024-05-09T21:00Z to 2024-05-10T21:00Z
  const before9 = (await mk('2024-05-09T20:59:00.000Z')).body.event
  const sameDay = (await mk('2024-05-10T12:00:00.000Z')).body.event
  const lateSame = (await mk('2024-05-10T20:59:00.000Z')).body.event
  const next = (await mk('2024-05-10T21:00:00.000Z')).body.event
  await a.delete(`/api/v1/tracker/events/${sameDay.id}`)
  assert.equal((await a.post('/api/v1/tracker/events/clear').send({})).status, 400)
  assert.equal((await a.post('/api/v1/tracker/events/clear').send({ before: '10/05/2024' })).status, 400)
  const res = await a.post('/api/v1/tracker/events/clear').send({ before: '2024-05-10' })
  assert.equal(res.status, 200)
  assert.ok(res.body.deleted >= 3)
  const ids = (await a.get('/api/v1/tracker/events?from=2024-05-01&to=2024-05-31')).body.events.map((e) => e.id)
  assert.deepEqual(ids, [next.id])
  for (const gone of [before9, sameDay, lateSame]) assert.equal(await ctx.db.collection('trackerEvents').findOne({ _id: await idOf(gone.id) }), null)
})

async function idOf(id) {
  const { ObjectId } = await import('mongodb')
  return new ObjectId(id)
}

test('clearing a note removes it (empty text or null)', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  const ev = (await a.post('/api/v1/tracker/events').send({ eventType: 'WEIGHT', ...BODIES.WEIGHT, note: 'first' })).body.event
  assert.equal(ev.note, 'first')
  const cleared = await a.put(`/api/v1/tracker/events/${ev.id}`).send({ note: '' })
  assert.equal('note' in cleared.body.event, false)
  const again = await a.put(`/api/v1/tracker/events/${ev.id}`).send({ note: 'second' })
  assert.equal(again.body.event.note, 'second')
  const nulled = await a.put(`/api/v1/tracker/events/${ev.id}`).send({ note: null })
  assert.equal('note' in nulled.body.event, false)
  const stored = await ctx.db.collection('trackerEvents').findOne({ _id: await idOf(ev.id) })
  assert.equal('note' in stored, false)
})

test('loggedBy always comes from the session', async () => {
  const app = ctx.newApp()
  const a = await signedInAgent(app, 'parent-a')
  const b = await signedInAgent(app, 'parent-b')
  const fromB = (await b.post('/api/v1/tracker/events').send({ eventType: 'WEIGHT', ...BODIES.WEIGHT, loggedBy: 'PARENT_A' })).body.event
  assert.equal(fromB.loggedBy, 'PARENT_B')
  const edited = await a.put(`/api/v1/tracker/events/${fromB.id}`).send({ loggedBy: 'PARENT_A', note: 'x' })
  assert.equal(edited.body.event.loggedBy, 'PARENT_B')
})

test('a manual sleep that overlaps another is refused, an open one while one is open too', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  const sleep = (startAt, endAt) => a.post('/api/v1/tracker/events').send({ eventType: 'SLEEP', sleep: { startAt, endAt } })
  const first = await sleep('2100-01-02T10:00:00.000Z', '2100-01-02T11:00:00.000Z')
  assert.equal(first.status, 201)
  assert.equal(first.body.event.sleep.durationMinutes, 60)
  assert.equal(first.body.event.sleep.startedBy, 'PARENT_A')
  const overlap = await sleep('2100-01-02T10:30:00.000Z', '2100-01-02T11:30:00.000Z')
  assert.equal(overlap.status, 409)
  assert.equal(overlap.body.error.code, 'event_conflict')
  const touching = await sleep('2100-01-02T11:00:00.000Z', '2100-01-02T11:20:00.000Z')
  assert.equal(touching.status, 201)
  const open = await sleep('2100-01-03T10:00:00.000Z', null)
  assert.equal(open.status, 201)
  assert.equal('durationMinutes' in open.body.event.sleep, false)
  const second = await sleep('2100-01-03T12:00:00.000Z', null)
  assert.equal(second.status, 409)
  assert.equal(second.body.error.code, 'sleep_already_open')
  // an open sleep runs on: remove everything this test made so later tests are not blocked
  for (const e of [open, first, touching]) await a.delete(`/api/v1/tracker/events/${e.body.event.id}`)
})

test('editing an open sleep works (F12) and keeps who started and ended it (F10)', async () => {
  const app = ctx.newApp()
  const a = await signedInAgent(app, 'parent-a')
  const b = await signedInAgent(app, 'parent-b')
  // an open sleep runs on, so it starts after every other test event: now (events of earlier tests are all before it)
  const base = Date.now()
  const M = (min) => new Date(base + min * 60000).toISOString()
  const start = (await a.post('/api/v1/tracker/sleep/toggle').send({ at: M(0), location: 'CRIB' })).body.event
  assert.equal(start.sleep.endAt, null)
  // F12: edit while open
  const open = await b.put(`/api/v1/tracker/events/${start.id}`).send({ sleep: { startAt: M(0), endAt: null, startLocation: 'HANDS' } })
  assert.equal(open.status, 200, JSON.stringify(open.body))
  assert.equal(open.body.event.sleep.startAt, M(0))
  assert.equal(open.body.event.sleep.endAt, null)
  assert.equal(open.body.event.sleep.startedBy, 'PARENT_A')
  assert.equal(open.body.event.timestamp, M(0))
  // close by B, then edit by A: both keep their roles (F10)
  const ended = (await b.post('/api/v1/tracker/sleep/toggle').send({ at: M(40) })).body.event
  assert.equal(ended.sleep.endedBy, 'PARENT_B')
  const edit = await a.put(`/api/v1/tracker/events/${start.id}`).send({ sleep: { startAt: M(0), endAt: M(60) } })
  assert.equal(edit.status, 200)
  assert.equal(edit.body.event.sleep.startedBy, 'PARENT_A')
  assert.equal(edit.body.event.sleep.endedBy, 'PARENT_B')
  assert.equal(edit.body.event.sleep.durationMinutes, 60)
  assert.equal('startLocation' in edit.body.event.sleep, false)
})

// Plan 016: conflicts name their blocker; awake-only events are refused during a sleep.
test('plan 016: a sleep over a sleep, and a feed inside a sleep, are 409 event_conflict naming the sleep', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  const post = (body) => a.post('/api/v1/tracker/events').send(body)
  const sleep = await post({ eventType: 'SLEEP', sleep: { startAt: '2021-05-01T10:00:00.000Z', endAt: '2021-05-01T11:00:00.000Z' } })
  assert.equal(sleep.status, 201)
  const over = await post({ eventType: 'SLEEP', sleep: { startAt: '2021-05-01T10:30:00.000Z', endAt: '2021-05-01T11:30:00.000Z' } })
  assert.equal(over.status, 409)
  assert.equal(over.body.error.code, 'event_conflict')
  assert.deepEqual(over.body.error.conflict, {
    id: sleep.body.event.id,
    eventType: 'SLEEP',
    startAt: '2021-05-01T10:00:00.000Z',
    endAt: '2021-05-01T11:00:00.000Z',
  })
  const bottle = await post({
    eventType: 'NUTRITION',
    timestamp: '2021-05-01T10:20:00.000Z',
    nutrition: { feedType: 'BOTTLE', bottleLiquidType: 'FORMULA', amountOfferedMl: 90 },
  })
  assert.equal(bottle.status, 409)
  assert.equal(bottle.body.error.conflict.id, sleep.body.event.id)
  const breast = await post({
    eventType: 'NUTRITION',
    timestamp: '2021-05-01T09:50:00.000Z',
    nutrition: { feedType: 'BREAST', breastSide: 'LEFT', durationMinutes: 20 },
  })
  assert.equal(breast.status, 409)
  assert.equal((await post({ eventType: 'ACTIVITY', timestamp: '2021-05-01T10:20:00.000Z', activity: { activityName: 'שירים' } })).status, 409)
  assert.equal((await post({ eventType: 'WEIGHT', timestamp: '2021-05-01T10:20:00.000Z', weight: { weightGrams: 5200 } })).status, 409)
  // allowed during a sleep
  const t = '2021-05-01T10:20:00.000Z'
  assert.equal((await post({ eventType: 'DIAPER', timestamp: t, diaper: { contains: 'PEE', peeVolume: 'LIGHT' } })).status, 201)
  assert.equal((await post({ eventType: 'PUMPING', timestamp: t, pumping: { leftAmountMl: 60, rightAmountMl: 50 } })).status, 201)
  assert.equal((await post({ eventType: 'VOMITING', timestamp: t, vomiting: { size: 'SMALL' } })).status, 201)
  assert.equal((await post({ eventType: 'SUPPLEMENT', timestamp: t, supplement: { name: 'ויטמין D' } })).status, 201)
})

test('plan 016: a sleep recorded over an existing feed names the feed; editing a feed into a sleep is refused', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  const feed = await a.post('/api/v1/tracker/events').send({
    eventType: 'NUTRITION',
    timestamp: '2021-06-01T10:30:00.000Z',
    nutrition: { feedType: 'BOTTLE', bottleLiquidType: 'FORMULA', amountOfferedMl: 90 },
  })
  assert.equal(feed.status, 201)
  const sleep = await a.post('/api/v1/tracker/events').send({
    eventType: 'SLEEP',
    sleep: { startAt: '2021-06-01T10:00:00.000Z', endAt: '2021-06-01T11:00:00.000Z' },
  })
  assert.equal(sleep.status, 409)
  assert.equal(sleep.body.error.code, 'event_conflict')
  assert.deepEqual(sleep.body.error.conflict, {
    id: feed.body.event.id,
    eventType: 'NUTRITION',
    startAt: '2021-06-01T10:30:00.000Z',
    endAt: null,
  })
  const ok = await a.post('/api/v1/tracker/events').send({
    eventType: 'SLEEP',
    sleep: { startAt: '2021-06-01T11:00:00.000Z', endAt: '2021-06-01T12:00:00.000Z' },
  })
  assert.equal(ok.status, 201)
  const moved = await a.put(`/api/v1/tracker/events/${feed.body.event.id}`).send({ timestamp: '2021-06-01T11:30:00.000Z' })
  assert.equal(moved.status, 409)
  assert.equal(moved.body.error.conflict.id, ok.body.event.id)
})

test('plan 016: a feed after the open sleep start needs endOpenSleep; with it the sleep ends at the feed time', async () => {
  const a = await signedInAgent(ctx.newApp(), 'parent-a')
  const base = Date.now() + 3 * 3600000 // after the sleep the F10 test leaves
  const M = (min) => new Date(base + min * 60000).toISOString()
  const open = await a.post('/api/v1/tracker/events').send({ eventType: 'SLEEP', sleep: { startAt: M(0), endAt: null } })
  assert.equal(open.status, 201)
  const feed = {
    eventType: 'NUTRITION',
    timestamp: M(45),
    nutrition: { feedType: 'BOTTLE', bottleLiquidType: 'FORMULA', amountOfferedMl: 90 },
  }
  const refused = await a.post('/api/v1/tracker/events').send(feed)
  assert.equal(refused.status, 409)
  assert.deepEqual(refused.body.error.conflict, {
    id: open.body.event.id,
    eventType: 'SLEEP',
    startAt: M(0),
    endAt: null,
  })
  assert.equal((await a.get('/api/v1/tracker/sleep/open')).body.id, open.body.event.id)
  const bad = await a.post('/api/v1/tracker/events').send({ ...feed, endOpenSleep: 'yes' })
  assert.equal(bad.status, 400)
  const done = await a.post('/api/v1/tracker/events').send({ ...feed, endOpenSleep: true })
  assert.equal(done.status, 201, JSON.stringify(done.body))
  assert.equal((await a.get('/api/v1/tracker/sleep/open')).body, null)
  const list = (await a.get('/api/v1/tracker/events?limit=50')).body.events
  const ended = list.find((e) => e.id === open.body.event.id)
  assert.equal(ended.sleep.endAt, M(45))
  assert.equal(ended.sleep.durationMinutes, 45)
  assert.ok(list.find((e) => e.eventType === 'NUTRITION'))
})
