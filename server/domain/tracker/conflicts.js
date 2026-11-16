// Event conflicts (D-016-1, D-016-2): sleep vs sleep, and awake-only events vs sleep. Pure; no I/O.
// Awake-only: NUTRITION (a breastfeed covers timestamp … timestamp + durationMinutes), ACTIVITY, WEIGHT.
// Allowed during a sleep: DIAPER, VOMITING, PUMPING, SUPPLEMENT.

export const AWAKE_ONLY_TYPES = Object.freeze(['NUTRITION', 'ACTIVITY', 'WEIGHT'])
// The longest breastfeed the validation accepts (events.js durationMinutes 0–600), for window queries.
export const MAX_AWAKE_MINUTES = 600

const idOf = (ev) => (ev?.id !== undefined ? String(ev.id) : ev?._id !== undefined ? String(ev._id) : undefined)

// { kind: 'sleep'|'awake', start, end (ms; Infinity = open), startAt, endAt|null } or null when the event never conflicts.
export function intervalOf(ev) {
  if (!ev) return null
  if (ev.eventType === 'SLEEP') {
    const s = ev.sleep
    if (!s?.startAt) return null
    return {
      kind: 'sleep',
      start: Date.parse(s.startAt),
      end: s.endAt ? Date.parse(s.endAt) : Infinity,
      startAt: s.startAt,
      endAt: s.endAt ?? null,
    }
  }
  if (!AWAKE_ONLY_TYPES.includes(ev.eventType) || !ev.timestamp) return null
  const start = Date.parse(ev.timestamp)
  const minutes =
    ev.eventType === 'NUTRITION' && ev.nutrition?.feedType === 'BREAST' ? Number(ev.nutrition?.durationMinutes) || 0 : 0
  const end = start + minutes * 60000
  return {
    kind: 'awake',
    start,
    end,
    startAt: ev.timestamp,
    endAt: minutes > 0 ? new Date(end).toISOString() : null,
    point: minutes === 0,
  }
}

// Sleep vs sleep: half-open ranges, touching ends are fine. Sleep vs awake: an awake point conflicts when it is
// inside [sleepStart, sleepEnd); a breastfeed range when it overlaps the sleep range.
function clash(a, b) {
  if (a.kind === 'awake' && b.kind === 'awake') return false
  if (a.kind === 'sleep' && b.kind === 'sleep') return a.start < b.end && b.start < a.end
  const sleep = a.kind === 'sleep' ? a : b
  const awake = a.kind === 'sleep' ? b : a
  if (awake.point) return awake.start >= sleep.start && awake.start < sleep.end
  return awake.start < sleep.end && sleep.start < awake.end
}

// `candidate`: an event-like { id?, eventType, timestamp, sleep?, nutrition? }; `events`: stored events.
// Returns the first blocker (earliest start) as { id, eventType, startAt, endAt|null }, or null. `now` is accepted for
// callers that pass it; an open sleep simply runs on.
export function findConflict(candidate, events, { now } = {}) {
  void now
  const mine = intervalOf(candidate)
  if (!mine) return null
  const candidateId = idOf(candidate)
  let best = null
  for (const ev of events) {
    const id = idOf(ev)
    if (candidateId !== undefined && id !== undefined && candidateId === id) continue
    const other = intervalOf(ev)
    if (!other || !clash(mine, other)) continue
    if (!best || other.start < best.start) {
      best = { start: other.start, value: { id, eventType: ev.eventType, startAt: other.startAt, endAt: other.endAt } }
    }
  }
  return best ? best.value : null
}
