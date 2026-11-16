import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findConflict } from './conflicts.js'

const sleep = (id, startAt, endAt) => ({ id, eventType: 'SLEEP', timestamp: startAt, sleep: { startAt, endAt } })
const feed = (id, timestamp, nutrition = { feedType: 'BOTTLE' }) => ({ id, eventType: 'NUTRITION', timestamp, nutrition })
const at = (hhmm) => `2026-07-04T${hhmm}:00.000Z`
const closed = sleep('s1', at('10:00'), at('11:00'))

test('a sleep over another sleep names that sleep; touching ends are fine', () => {
  assert.deepEqual(findConflict(sleep(undefined, at('10:30'), at('11:30')), [closed]), {
    id: 's1',
    eventType: 'SLEEP',
    startAt: at('10:00'),
    endAt: at('11:00'),
  })
  assert.equal(findConflict(sleep(undefined, at('11:00'), at('11:30')), [closed]), null)
  assert.equal(findConflict(sleep('s1', at('10:00'), at('11:00')), [closed]), null)
})

test('an open sleep blocks later events and has endAt null', () => {
  const open = sleep('o', at('10:00'), null)
  assert.deepEqual(findConflict(feed(undefined, at('12:00')), [open]), {
    id: 'o',
    eventType: 'SLEEP',
    startAt: at('10:00'),
    endAt: null,
  })
  assert.equal(findConflict(feed(undefined, at('09:00')), [open]), null)
})

test('a feed, activity or weight inside a sleep is a conflict; diaper, pump, spit-up, supplement are not', () => {
  for (const eventType of ['NUTRITION', 'ACTIVITY', 'WEIGHT']) {
    assert.equal(findConflict({ eventType, timestamp: at('10:30') }, [closed])?.id, 's1', eventType)
  }
  for (const eventType of ['DIAPER', 'PUMPING', 'VOMITING', 'SUPPLEMENT']) {
    assert.equal(findConflict({ eventType, timestamp: at('10:30') }, [closed]), null, eventType)
  }
  assert.equal(findConflict(feed(undefined, at('11:00')), [closed]), null)
})

test('a breastfeed whose duration runs into a sleep is a conflict', () => {
  const breast = feed(undefined, at('09:45'), { feedType: 'BREAST', durationMinutes: 20 })
  assert.equal(findConflict(breast, [closed])?.id, 's1')
  assert.equal(findConflict(feed(undefined, at('09:30'), { feedType: 'BREAST', durationMinutes: 20 }), [closed]), null)
})

test('a sleep over an existing feed names the feed (with the breastfeed end)', () => {
  const stored = feed('f1', at('10:30'), { feedType: 'BREAST', durationMinutes: 10 })
  assert.deepEqual(findConflict(sleep(undefined, at('10:00'), at('11:00')), [stored]), {
    id: 'f1',
    eventType: 'NUTRITION',
    startAt: at('10:30'),
    endAt: at('10:40'),
  })
  assert.equal(findConflict(sleep(undefined, at('10:00'), at('11:00')), [feed('f2', at('12:00'))]), null)
})
