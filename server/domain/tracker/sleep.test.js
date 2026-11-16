import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkOverlap, durationMinutes, isOpen, toggleSleep } from './sleep.js'

test('durationMinutes rounds and is at least 1', () => {
  assert.equal(durationMinutes('2026-07-04T10:00:00.000Z', '2026-07-04T10:45:00.000Z'), 45)
  assert.equal(durationMinutes('2026-07-04T10:00:00.000Z', '2026-07-04T10:00:29.000Z'), 1)
  assert.equal(durationMinutes('2026-07-04T10:00:00.000Z', '2026-07-04T10:10:31.000Z'), 11)
  assert.equal(durationMinutes('2026-07-04T10:00:00.000Z', '2026-07-04T09:00:00.000Z'), 1)
})

test('isOpen is true only for endAt === null', () => {
  assert.equal(isOpen({ endAt: null }), true)
  assert.equal(isOpen({}), false)
  assert.equal(isOpen({ endAt: '2026-07-04T10:00:00.000Z' }), false)
})

test('a toggle opens a sleep, then closes it with the duration', () => {
  const start = toggleSleep({ open: null, at: '2026-07-04T10:00:00.000Z', parentType: 'PARENT_A', location: 'CRIB' })
  assert.equal(start.action, 'start')
  assert.deepEqual(start.event.sleep, {
    startAt: '2026-07-04T10:00:00.000Z',
    endAt: null,
    startedBy: 'PARENT_A',
    startLocation: 'CRIB',
  })
  assert.equal(start.event.timestamp, '2026-07-04T10:00:00.000Z')
  const end = toggleSleep({ open: start.event, at: '2026-07-04T10:40:00.000Z', parentType: 'PARENT_B' })
  assert.deepEqual(end, {
    action: 'end',
    patch: { endAt: '2026-07-04T10:40:00.000Z', durationMinutes: 40, endedBy: 'PARENT_B' },
  })
})

test('a toggle without a location omits it; an end before the start is an error', () => {
  const start = toggleSleep({ open: null, at: '2026-07-04T10:00:00.000Z', parentType: 'PARENT_A' })
  assert.equal('startLocation' in start.event.sleep, false)
  assert.deepEqual(toggleSleep({ open: start.event, at: '2026-07-04T09:00:00.000Z', parentType: 'PARENT_A' }), {
    error: 'end_before_start',
  })
})

test('an open sleep overlaps everything after its start (a second open sleep is refused)', () => {
  const open = [{ id: 'a', sleep: { startAt: '2026-07-04T10:00:00.000Z', endAt: null } }]
  assert.equal(checkOverlap(open, { startAt: '2026-07-04T12:00:00.000Z', endAt: null }).overlaps, true)
  assert.equal(checkOverlap(open, { startAt: '2026-07-04T08:00:00.000Z', endAt: '2026-07-04T09:00:00.000Z' }).overlaps, false)
})

test('a manual sleep that overlaps another is refused; touching ends are fine', () => {
  const sleeps = [{ id: 'a', sleep: { startAt: '2026-07-04T10:00:00.000Z', endAt: '2026-07-04T11:00:00.000Z' } }]
  assert.deepEqual(checkOverlap(sleeps, { startAt: '2026-07-04T10:30:00.000Z', endAt: '2026-07-04T11:30:00.000Z' }), {
    overlaps: true,
    with: 'a',
  })
  assert.equal(checkOverlap(sleeps, { startAt: '2026-07-04T09:00:00.000Z', endAt: '2026-07-04T10:30:00.000Z' }).overlaps, true)
  assert.equal(checkOverlap(sleeps, { startAt: '2026-07-04T10:20:00.000Z', endAt: '2026-07-04T10:40:00.000Z' }).overlaps, true)
  assert.equal(checkOverlap(sleeps, { startAt: '2026-07-04T11:00:00.000Z', endAt: '2026-07-04T12:00:00.000Z' }).overlaps, false)
  assert.equal(checkOverlap(sleeps, { startAt: '2026-07-04T09:00:00.000Z', endAt: '2026-07-04T10:00:00.000Z' }).overlaps, false)
})

test('a sleep never overlaps itself', () => {
  const sleeps = [{ id: 'a', sleep: { startAt: '2026-07-04T10:00:00.000Z', endAt: '2026-07-04T11:00:00.000Z' } }]
  assert.equal(
    checkOverlap(sleeps, { id: 'a', startAt: '2026-07-04T10:10:00.000Z', endAt: '2026-07-04T11:10:00.000Z' }).overlaps,
    false,
  )
})
