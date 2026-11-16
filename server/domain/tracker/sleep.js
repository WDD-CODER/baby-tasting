import { findConflict } from './conflicts.js'

// Sleep rules: one open sleep at a time, no overlaps, duration in whole minutes (min 1). Pure; "now" is passed in.

export function durationMinutes(startIso, endIso) {
  return Math.max(1, Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60000))
}

// A sleep is open only when its endAt is null.
export function isOpen(sleep) {
  return sleep?.endAt === null
}

// `sleeps`: stored events or bare payloads ({ startAt, endAt }); `candidate`: { startAt, endAt|null, id? }.
// An open sleep runs to infinity. Touching ends do not overlap.
export function checkOverlap(sleeps, candidate) {
  const cStart = Date.parse(candidate.startAt)
  const cEnd = candidate.endAt ? Date.parse(candidate.endAt) : Infinity
  for (const item of sleeps) {
    const sleep = item.sleep ?? item
    const id = item.id ?? (item._id ? String(item._id) : undefined)
    if (candidate.id !== undefined && id !== undefined && String(candidate.id) === String(id)) continue
    const start = Date.parse(sleep.startAt)
    const end = sleep.endAt ? Date.parse(sleep.endAt) : Infinity
    if (start < cEnd && cStart < end) return { overlaps: true, with: id }
  }
  return { overlaps: false }
}

// D-015-1 mode 1: moves the open sleep's start. The sleep stays open; the start must not be after `now`.
// `others`: the sleeps that could overlap (the open one itself is skipped by id). Returns { sleep } or { error }.
export function moveOpenSleepStart({ open, startAt, now, others = [] }) {
  if (!open || !isOpen(open.sleep)) return { error: 'no_open_sleep' }
  if (Date.parse(startAt) > Date.parse(now)) return { error: 'start_in_future' }
  const id = open.id ?? (open._id ? String(open._id) : undefined)
  const conflict = findConflict({ id, eventType: 'SLEEP', timestamp: startAt, sleep: { startAt, endAt: null } }, others)
  if (conflict) return { error: 'event_conflict', conflict }
  return { sleep: { ...open.sleep, startAt, endAt: null } }
}

// Decides what a toggle does. `open` is the open sleep event (or null), `at` an ISO moment (the caller passes
// "now" when the user gave none). Returns { action: 'end', patch } or { action: 'start', event } or { error }.
export function toggleSleep({ open, at, parentType, location }) {
  if (open) {
    const startAt = open.sleep.startAt
    if (Date.parse(at) < Date.parse(startAt)) return { error: 'end_before_start' }
    return {
      action: 'end',
      patch: { endAt: at, durationMinutes: durationMinutes(startAt, at), endedBy: parentType },
    }
  }
  const sleep = { startAt: at, endAt: null, startedBy: parentType }
  if (location) sleep.startLocation = location
  return {
    action: 'start',
    event: { eventType: 'SLEEP', timestamp: at, loggedBy: parentType, quickRecorded: false, sleep },
  }
}
