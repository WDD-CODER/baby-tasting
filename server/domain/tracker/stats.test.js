import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  dayKey,
  diaperStats,
  nutritionStats,
  pumpingStats,
  sleepStats,
  vomitingStats,
  weightStats,
} from './stats.js'

const R = { from: '2026-06-10', to: '2026-06-11', dayStartHour: 6 }
// Summer: Jerusalem is UTC+3, so 03:00Z is 06:00 (the start of a baby day).
const ev = (eventType, timestamp, payload, id = `${eventType}-${timestamp}`) => ({
  id,
  eventType,
  timestamp,
  loggedBy: 'PARENT_A',
  ...payload,
})

test('nutrition: counts, sums and the 15-minute default for a breast feed without a duration', () => {
  const events = [
    ev('NUTRITION', '2026-06-10T08:00:00.000Z', { nutrition: { feedType: 'BOTTLE', amountOfferedMl: 100, amountConsumedMl: 60 } }),
    ev('NUTRITION', '2026-06-10T12:00:00.000Z', { nutrition: { feedType: 'BOTTLE', amountOfferedMl: 90, amountConsumedMl: 90 } }),
    ev('NUTRITION', '2026-06-11T08:00:00.000Z', { nutrition: { feedType: 'BREAST', durationMinutes: 10 } }),
    ev('NUTRITION', '2026-06-11T09:00:00.000Z', { nutrition: { feedType: 'BREAST' } }),
    ev('DIAPER', '2026-06-11T09:00:00.000Z', { diaper: { contains: 'PEE' } }),
  ]
  const s = nutritionStats(events, R)
  assert.deepEqual(s.days[0], {
    date: '2026-06-10', offered: 190, consumed: 150, delta: 40, feedsCount: 2, breastCount: 0, bottleCount: 2, breastMinutes: 0,
  })
  assert.equal(s.days[1].breastMinutes, 25)
  assert.deepEqual(s.totals, {
    feedsCount: 4, breastCount: 2, bottleCount: 2, breastMinutes: 25, bottleMl: 150, rangeDays: 2, daysWithData: 2, feedsPerDay: 2,
  })
})

test('sleep: bucketed by start, open sleep counted up to now, every day of the range listed, locations counted', () => {
  const events = [
    ev('SLEEP', '2026-06-10T18:00:00.000Z', {
      sleep: { startAt: '2026-06-10T18:00:00.000Z', endAt: '2026-06-10T19:30:00.000Z', durationMinutes: 90, startLocation: 'CRIB' },
    }),
    ev('SLEEP', '2026-06-11T20:50:00.000Z', {
      sleep: { startAt: '2026-06-11T20:50:00.000Z', endAt: null, startLocation: 'HANDS' },
    }),
  ]
  const s = sleepStats(events, { ...R, now: '2026-06-11T21:20:00.000Z' })
  assert.equal(s.days.length, 2)
  assert.equal(s.days[0].totalMinutes, 90)
  assert.equal(s.days[0].sessions[0].location, 'CRIB')
  assert.equal(s.days[1].totalMinutes, 30)
  assert.equal(s.days[1].sessions[0].endAt, null)
  assert.equal(s.totals.totalMinutes, 120)
  assert.equal(s.totals.sessionCount, 2)
  assert.equal(s.totals.hoursPerDay, 1)
  assert.deepEqual(s.totals.locations, { CRIB: 1, HANDS: 1, CARRIER: 0, STROLLER: 0 })
})

test('diapers: exclusive counters and de-duplicated colours', () => {
  const events = [
    ev('DIAPER', '2026-06-10T08:00:00.000Z', { diaper: { contains: 'PEE' } }),
    ev('DIAPER', '2026-06-10T09:00:00.000Z', { diaper: { contains: 'POO', pooColor: 'GREEN', pooTexture: 'SEEDY' } }),
    ev('DIAPER', '2026-06-10T10:00:00.000Z', { diaper: { contains: 'BOTH', pooColor: 'GREEN', pooTexture: 'LIQUID' } }),
  ]
  const s = diaperStats(events, R)
  assert.deepEqual(s.days, [
    { date: '2026-06-10', pee: 1, poo: 1, both: 1, total: 3, pooColors: ['GREEN'], pooTextures: ['SEEDY', 'LIQUID'] },
  ])
  assert.deepEqual(s.totals, { pee: 1, poo: 1, both: 1, total: 3, rangeDays: 2, daysWithData: 2, perDay: 1.5 })
})

test('weight: one row per weigh-in, oldest first, with the change', () => {
  const events = [
    ev('WEIGHT', '2026-06-11T08:00:00.000Z', { weight: { weightGrams: 5300, percentile: 40 } }, 'w2'),
    ev('WEIGHT', '2026-06-10T08:00:00.000Z', { weight: { weightGrams: 5200 } }, 'w1'),
  ]
  const s = weightStats(events, R)
  assert.deepEqual(s.entries.map((e) => [e.id, e.date, e.weightGrams, e.percentile]), [
    ['w1', '2026-06-10', 5200, undefined],
    ['w2', '2026-06-11', 5300, 40],
  ])
  assert.deepEqual(s.totals, {
    count: 2, latestGrams: 5300, latestPercentile: 40, latestDate: '2026-06-11', changeGrams: 100, rangeDays: 2, daysWithData: 2,
  })
})

test('pumping: per side, rounded average and the total of the day of now', () => {
  const events = [
    ev('PUMPING', '2026-06-10T08:00:00.000Z', { pumping: { leftAmountMl: 60, rightAmountMl: 50 } }),
    ev('PUMPING', '2026-06-11T08:00:00.000Z', { pumping: { leftAmountMl: 30, rightAmountMl: 31 } }),
  ]
  const s = pumpingStats(events, { ...R, now: '2026-06-11T12:00:00.000Z' })
  assert.deepEqual(s.totals, {
    leftMl: 90, rightMl: 81, totalMl: 171, sessionCount: 2, rangeDays: 2, daysWithData: 2, avgMlPerDay: 86, todayMl: 61,
  })
  assert.equal(s.days[0].totalMl, 110)
})

test('vomiting: sizes, a missing size counts as medium', () => {
  const events = [
    ev('VOMITING', '2026-06-10T08:00:00.000Z', { vomiting: { size: 'SMALL' } }),
    ev('VOMITING', '2026-06-10T09:00:00.000Z', { vomiting: {} }),
    ev('VOMITING', '2026-06-11T09:00:00.000Z', { vomiting: { size: 'LARGE' } }),
  ]
  const s = vomitingStats(events, R)
  assert.deepEqual(s.totals, { small: 1, medium: 1, large: 1, total: 3, rangeDays: 2, daysWithData: 2, perDay: 1.5 })
  assert.deepEqual(s.days[0], { date: '2026-06-10', small: 1, medium: 1, large: 0, total: 2 })
})

test('empty range: no events gives empty lists and zero totals', () => {
  assert.deepEqual(nutritionStats([], R).days, [])
  assert.equal(nutritionStats([], R).totals.feedsCount, 0)
  assert.deepEqual(diaperStats([], R).days, [])
  assert.deepEqual(weightStats([], R).entries, [])
  assert.deepEqual(weightStats([], R).totals, {
    count: 0, latestGrams: null, latestPercentile: null, latestDate: null, changeGrams: 0, rangeDays: 2, daysWithData: 0,
  })
  assert.equal(pumpingStats([], R).totals.avgMlPerDay, 0)
  assert.equal(vomitingStats([], R).totals.total, 0)
  const sleep = sleepStats([], R)
  assert.equal(sleep.days.length, 2)
  assert.equal(sleep.totals.totalMinutes, 0)
})

test('the baby day starts at 06:00 for the dashboard range', () => {
  // 02:59Z = 05:59 Jerusalem (still the day before), 03:00Z = 06:00 (the new day).
  const events = [
    ev('DIAPER', '2026-06-10T02:59:00.000Z', { diaper: { contains: 'PEE' } }, 'before'),
    ev('DIAPER', '2026-06-10T03:00:00.000Z', { diaper: { contains: 'PEE' } }, 'after'),
    ev('DIAPER', '2026-06-12T02:59:00.000Z', { diaper: { contains: 'POO' } }, 'last'),
    ev('DIAPER', '2026-06-12T03:00:00.000Z', { diaper: { contains: 'POO' } }, 'past'),
  ]
  const s = diaperStats(events, R)
  assert.deepEqual(s.days.map((d) => [d.date, d.total]), [['2026-06-10', 1], ['2026-06-11', 1]])
  assert.equal(s.days[1].poo, 1)
  assert.equal(dayKey(Date.parse('2026-06-10T02:59:00.000Z'), 6), '2026-06-09')
  assert.equal(dayKey(Date.parse('2026-06-10T02:59:00.000Z'), 0), '2026-06-10')
})

test('a DST-switch day: Israel moves clocks on 2026-03-27, the baby days still cut at 06:00 local', () => {
  // 03-26 06:00 = 04:00Z (UTC+2); 03-27 06:00 = 03:00Z (UTC+3), so baby day 03-26 lasts 23 hours.
  const events = [
    ev('DIAPER', '2026-03-26T03:59:00.000Z', { diaper: { contains: 'PEE' } }, 'a'),
    ev('DIAPER', '2026-03-26T04:00:00.000Z', { diaper: { contains: 'PEE' } }, 'b'),
    ev('DIAPER', '2026-03-27T02:59:00.000Z', { diaper: { contains: 'PEE' } }, 'c'),
    ev('DIAPER', '2026-03-27T03:00:00.000Z', { diaper: { contains: 'PEE' } }, 'd'),
    ev('DIAPER', '2026-03-28T02:59:00.000Z', { diaper: { contains: 'PEE' } }, 'e'),
  ]
  const s = diaperStats(events, { from: '2026-03-25', to: '2026-03-27', dayStartHour: 6 })
  assert.deepEqual(s.days.map((d) => [d.date, d.total]), [['2026-03-25', 1], ['2026-03-26', 2], ['2026-03-27', 2]])
  assert.equal(s.totals.rangeDays, 3)
})

// D-015-2: averages over the days with data, not over the length of the range.
test('averages with data only today give the same value for ranges 1, 3, 7 and 14, with daysWithData 1', () => {
  const now = '2026-06-20T12:00:00.000Z'
  const events = [
    ev('NUTRITION', '2026-06-20T05:00:00.000Z', { nutrition: { feedType: 'BREAST', durationMinutes: 10 } }),
    ev('NUTRITION', '2026-06-20T08:00:00.000Z', { nutrition: { feedType: 'BREAST', durationMinutes: 10 } }),
    ev('DIAPER', '2026-06-20T09:00:00.000Z', { diaper: { contains: 'PEE' } }),
    ev('PUMPING', '2026-06-20T09:00:00.000Z', { pumping: { leftAmountMl: 40, rightAmountMl: 20 } }),
    ev('VOMITING', '2026-06-20T09:00:00.000Z', { vomiting: { size: 'SMALL' } }),
    ev('SLEEP', '2026-06-20T06:00:00.000Z', {
      sleep: { startAt: '2026-06-20T06:00:00.000Z', endAt: '2026-06-20T08:00:00.000Z', durationMinutes: 120 },
    }),
  ]
  const shift = (n) => new Date(Date.UTC(2026, 5, 20 - n)).toISOString().slice(0, 10)
  for (const range of [1, 3, 7, 14]) {
    const opts = { from: shift(range - 1), to: '2026-06-20', dayStartHour: 6, now }
    const n = nutritionStats(events, opts).totals
    assert.equal(n.rangeDays, range)
    assert.equal(n.daysWithData, 1, 'range ' + range)
    assert.equal(n.feedsPerDay, 2, 'range ' + range)
    assert.equal(sleepStats(events, opts).totals.hoursPerDay, 2)
    assert.equal(sleepStats(events, opts).days.length, range, 'one bar per day of the range')
    assert.equal(diaperStats(events, opts).totals.perDay, 1)
    assert.equal(pumpingStats(events, opts).totals.avgMlPerDay, 60)
    assert.equal(vomitingStats(events, opts).totals.perDay, 1)
    assert.equal(weightStats(events, opts).totals.daysWithData, 1)
  }
})

test('the first event of any type starts the count, and a gap day inside the data counts', () => {
  const now = '2026-06-20T12:00:00.000Z'
  const opts = { from: '2026-06-14', to: '2026-06-20', dayStartHour: 6, now }
  const events = [
    ev('DIAPER', '2026-06-18T08:00:00.000Z', { diaper: { contains: 'PEE' } }),
    // 06-19 has nothing: it still counts.
    ev('NUTRITION', '2026-06-20T08:00:00.000Z', { nutrition: { feedType: 'BREAST' } }),
    ev('NUTRITION', '2026-06-20T09:00:00.000Z', { nutrition: { feedType: 'BREAST' } }),
    ev('NUTRITION', '2026-06-20T10:00:00.000Z', { nutrition: { feedType: 'BREAST' } }),
  ]
  const n = nutritionStats(events, opts).totals
  assert.equal(n.daysWithData, 3)
  assert.equal(n.feedsPerDay, 1)
  // The repository value wins over the events passed in.
  assert.equal(nutritionStats(events, { ...opts, firstEventAt: '2026-06-17T08:00:00.000Z' }).totals.daysWithData, 4)
  assert.equal(nutritionStats(events, { ...opts, firstEventAt: null }).totals.daysWithData, 0)
})

test('the last day is capped at the day of now', () => {
  const events = [ev('DIAPER', '2026-06-18T08:00:00.000Z', { diaper: { contains: 'PEE' } })]
  const opts = { from: '2026-06-14', to: '2026-06-24', dayStartHour: 6, now: '2026-06-19T12:00:00.000Z' }
  assert.equal(diaperStats(events, opts).totals.daysWithData, 2)
  assert.equal(diaperStats(events, opts).totals.perDay, 0.5)
})

test('an empty range gives 0 averages and daysWithData 0', () => {
  const opts = { from: '2026-06-14', to: '2026-06-20', dayStartHour: 6, now: '2026-06-20T12:00:00.000Z' }
  for (const f of [nutritionStats, sleepStats, diaperStats, pumpingStats, vomitingStats]) {
    const t = f([], opts).totals
    assert.equal(t.daysWithData, 0)
    assert.equal(t.rangeDays, 7)
    for (const k of ['feedsPerDay', 'hoursPerDay', 'perDay', 'avgMlPerDay']) if (k in t) assert.equal(t[k], 0)
  }
})
