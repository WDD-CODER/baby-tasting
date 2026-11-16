// Pure rules of the log tab (spec-log-settings §3-§5), all on Jerusalem time. "now" is always passed in.
import { TrackerEvent } from '../models/tracker-event'
import { babyDayStartMs, israelDateKey, israelHour } from './israel-time'

const MIN = 60000
const HOUR = 3600000

/** Events of the current baby day (from 06:00 Jerusalem), keeping the given newest-first order. */
export function babyDayEvents(events: readonly TrackerEvent[], now: number): TrackerEvent[] {
  const start = babyDayStartMs(now)
  return events.filter((e) => Date.parse(e.timestamp) >= start)
}

/** Whole minutes an event's sleep ran (the stored value, or the live value while it is open). */
export function sleepMinutes(event: TrackerEvent, now: number): number {
  const sleep = event.sleep
  if (!sleep) return 0
  if (sleep.endAt === null) return Math.max(0, Math.floor((now - Date.parse(sleep.startAt)) / MIN))
  return (
    sleep.durationMinutes ??
    Math.max(1, Math.round((Date.parse(sleep.endAt) - Date.parse(sleep.startAt)) / MIN))
  )
}

export type SleepCycle = 'running' | 'bad' | 'good' | 'great'

/** The quality of a finished sleep: under 30 min bad, 30-44 good, 45+ great. */
export function sleepCycle(minutes: number | undefined, running: boolean): SleepCycle {
  if (running) return 'running'
  const m = minutes ?? 0
  if (m < 30) return 'bad'
  return m < 45 ? 'good' : 'great'
}

export interface FeedingCountdown {
  remainingMs: number
  isOverdue: boolean
}

/** Time to the next feeding: the newest NUTRITION event plus 2 h. With none, 2 h and not overdue. */
export function feedingCountdown(events: readonly TrackerEvent[], now: number): FeedingCountdown {
  const last = events.find((e) => e.eventType === 'NUTRITION')
  if (!last) return { remainingMs: 2 * HOUR, isOverdue: false }
  const remainingMs = Date.parse(last.timestamp) + 2 * HOUR - now
  return { remainingMs, isOverdue: remainingMs <= 0 }
}

/** `HH:MM:SS` of a positive span. */
export function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export function isBathSlot(now: number): boolean {
  const h = israelHour(now)
  return h >= 17 && h < 21
}

export function isNapSlot(now: number): boolean {
  const h = israelHour(now)
  return h >= 12 && h < 16
}

export function isBioGayaHours(now: number): boolean {
  const h = israelHour(now)
  return h >= 6 && h < 22
}

/** The end of the newest finished sleep (events are newest first), or null. */
export function lastWakeUp(events: readonly TrackerEvent[]): number | null {
  for (const e of events) {
    if (e.eventType === 'SLEEP' && e.sleep?.endAt) return Date.parse(e.sleep.endAt)
  }
  return null
}

export function awakeMinutes(events: readonly TrackerEvent[], now: number): number {
  const wake = lastWakeUp(events)
  return wake === null ? 0 : Math.max(0, Math.floor((now - wake) / MIN))
}

/** A big nap: a sleep starting 12-15 that ran 75+ min, or an open one that ran 60+ min. */
export function isBigNapRecorded(
  events: readonly TrackerEvent[],
  open: TrackerEvent | null,
  now: number,
): boolean {
  const today = israelDateKey(now)
  const all = open && !events.some((e) => e.id === open.id) ? [open, ...events] : events
  for (const e of all) {
    if (e.eventType !== 'SLEEP' || !e.sleep) continue
    const start = Date.parse(e.sleep.startAt)
    if (israelDateKey(start) !== today) continue
    const h = israelHour(start)
    if (h < 12 || h > 15) continue
    const live = e.sleep.endAt === null
    if (sleepMinutes(e, now) >= (live ? 60 : 75)) return true
  }
  return false
}

/** Pumping events of today between 08:00 and 15:59. */
export function todayPumpingCount(events: readonly TrackerEvent[], now: number): number {
  const today = israelDateKey(now)
  return events.filter((e) => {
    if (e.eventType !== 'PUMPING') return false
    const ts = Date.parse(e.timestamp)
    const h = israelHour(ts)
    return israelDateKey(ts) === today && h >= 8 && h < 16
  }).length
}

/** The breast feed that a preventive pumping reminder is about, or null. */
export function pumpingReminderFeed(
  events: readonly TrackerEvent[],
  now: number,
): TrackerEvent | null {
  const h = israelHour(now)
  if (h < 8 || h >= 16) return null
  if (todayPumpingCount(events, now) >= 3) return null
  const feed = events.find((e) => e.eventType === 'NUTRITION' && e.nutrition?.feedType === 'BREAST')
  if (!feed) return null
  const feedAt = Date.parse(feed.timestamp)
  if (now - feedAt < 15 * MIN) return null
  const pumpedAfter = events.some(
    (e) => e.eventType === 'PUMPING' && Date.parse(e.timestamp) > feedAt,
  )
  return pumpedAfter ? null : feed
}

/** "x minutes ago" text parts: `{ kind, a, b }` for the template to format. */
export function timeAgoParts(
  timestamp: string,
  now: number,
): { kind: 'now' | 'minutes' | 'hours' | 'days'; h: number; m: number; d: number } {
  const mins = Math.max(0, Math.floor((now - Date.parse(timestamp)) / MIN))
  if (mins < 1) return { kind: 'now', h: 0, m: 0, d: 0 }
  if (mins < 60) return { kind: 'minutes', h: 0, m: mins, d: 0 }
  if (mins < 1440) return { kind: 'hours', h: Math.floor(mins / 60), m: mins % 60, d: 0 }
  return { kind: 'days', h: 0, m: 0, d: Math.floor(mins / 1440) }
}
