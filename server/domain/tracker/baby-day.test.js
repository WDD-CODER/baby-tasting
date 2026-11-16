import { test } from 'node:test'
import assert from 'node:assert/strict'
import { babyDayStart, isDateString, jerusalemMidnight } from './baby-day.js'

test('the baby day starts at 06:00 Israel time (winter, UTC+2)', () => {
  assert.equal(babyDayStart('2026-01-10T12:00:00.000Z'), '2026-01-10T04:00:00.000Z')
  assert.equal(babyDayStart('2026-01-10T04:00:00.000Z'), '2026-01-10T04:00:00.000Z')
  // 05:59 local still belongs to the day before
  assert.equal(babyDayStart('2026-01-10T03:59:00.000Z'), '2026-01-09T04:00:00.000Z')
})

test('the baby day starts at 06:00 Israel time (summer, UTC+3)', () => {
  assert.equal(babyDayStart('2026-07-04T09:15:00.000Z'), '2026-07-04T03:00:00.000Z')
  assert.equal(babyDayStart('2026-07-04T02:59:00.000Z'), '2026-07-03T03:00:00.000Z')
})

test('the baby day is right on the spring DST-switch day (2026-03-27)', () => {
  assert.equal(babyDayStart('2026-03-27T10:00:00.000Z'), '2026-03-27T03:00:00.000Z')
  // 00:30Z is 03:30 local right after the jump: still the previous baby day, which began at +2
  assert.equal(babyDayStart('2026-03-27T00:30:00.000Z'), '2026-03-26T04:00:00.000Z')
})

test('the baby day is right on the autumn DST-switch day (2026-10-25)', () => {
  assert.equal(babyDayStart('2026-10-25T12:00:00.000Z'), '2026-10-25T04:00:00.000Z')
  // 02:00Z is 04:00 local: still the previous baby day, which began at +3
  assert.equal(babyDayStart('2026-10-25T02:00:00.000Z'), '2026-10-24T03:00:00.000Z')
})

test('isDateString accepts real dates only', () => {
  assert.equal(isDateString('2026-02-28'), true)
  assert.equal(isDateString('2026-02-30'), false)
  assert.equal(isDateString('2026-2-3'), false)
  assert.equal(isDateString(20260228), false)
})

test('jerusalemMidnight gives local midnight, shifted by days', () => {
  assert.equal(jerusalemMidnight('2026-01-10'), '2026-01-09T22:00:00.000Z')
  assert.equal(jerusalemMidnight('2026-01-10', 1), '2026-01-10T22:00:00.000Z')
  assert.equal(jerusalemMidnight('2026-07-04'), '2026-07-03T21:00:00.000Z')
  // the day after the spring switch day starts at +3, the switch day itself at +2
  assert.equal(jerusalemMidnight('2026-03-27'), '2026-03-26T22:00:00.000Z')
  assert.equal(jerusalemMidnight('2026-03-27', 1), '2026-03-27T21:00:00.000Z')
})
