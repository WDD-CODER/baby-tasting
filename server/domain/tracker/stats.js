// Tracker statistics (plan 013). Pure: events + a range + a clock value in, numbers out; no I/O, no clock reads.
// A "day" is a baby day: it starts at `dayStartHour` Asia/Jerusalem (06:00 for the dashboards, program P4).
// Range `from` / `to` are YYYY-MM-DD days, both inclusive: [from 06:00, day after `to` 06:00).

import { jerusalemParts, jerusalemToUtc } from './baby-day.js'

const pad = (n) => String(n).padStart(2, '0')
const keyOf = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`

function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number)
  const s = new Date(Date.UTC(y, m - 1, d + n))
  return keyOf(s.getUTCFullYear(), s.getUTCMonth() + 1, s.getUTCDate())
}

function dayStartMs(date, hour) {
  const [y, m, d] = date.split('-').map(Number)
  return jerusalemToUtc(y, m, d, hour)
}

// The YYYY-MM-DD baby day that holds an instant (ms).
export function dayKey(ms, dayStartHour) {
  const p = jerusalemParts(ms)
  return p.hour < dayStartHour ? addDays(keyOf(p.year, p.month, p.day), -1) : keyOf(p.year, p.month, p.day)
}

// Every YYYY-MM-DD from `from` to `to` inclusive (empty when `to` is before `from`).
export function datesInRange(from, to) {
  const out = []
  for (let d = from; d <= to && out.length < 4000; d = addDays(d, 1)) out.push(d)
  return out
}

function rangeOf({ from, to, dayStartHour = 6 }) {
  return {
    fromMs: dayStartMs(from, dayStartHour),
    toMs: dayStartMs(addDays(to, 1), dayStartHour),
    hour: dayStartHour,
    to,
    dates: datesInRange(from, to),
  }
}

// The exact instants of a range as ISO strings: [from 06:00, day after `to` 06:00).
export function rangeBounds(opts) {
  const range = rangeOf(opts)
  return { from: new Date(range.fromMs).toISOString(), to: new Date(range.toMs).toISOString() }
}

// D-015-2: the averages divide by the baby days from the first day in the range that has any Tracker event (any type)
// to the last day of the range, capped at the day of `opts.now`. Days without events in between still count; no event
// in the range gives 0. `opts.firstEventAt` (ISO or null, from the repository) wins; without it the first event is
// taken from `events` (any type, by `timestamp`).
export function daysWithData(events, opts) {
  const range = rangeOf(opts)
  let firstMs = null
  if (opts.firstEventAt !== undefined) {
    const ms = opts.firstEventAt === null ? NaN : Date.parse(opts.firstEventAt)
    if (Number.isFinite(ms) && ms >= range.fromMs && ms < range.toMs) firstMs = ms
  } else {
    for (const e of events) {
      const ms = e ? Date.parse(e.timestamp) : NaN
      if (Number.isFinite(ms) && ms >= range.fromMs && ms < range.toMs && (firstMs === null || ms < firstMs)) firstMs = ms
    }
  }
  if (firstMs === null) return 0
  const first = dayKey(firstMs, range.hour)
  let last = range.to
  if (opts.now) {
    const today = dayKey(Date.parse(opts.now), range.hour)
    if (today < last) last = today
  }
  return Math.max(1, datesInRange(first, last).length)
}

// Events of `type` whose `at(e)` falls in the range, each with its day key; oldest first.
function pick(events, type, payloadKey, range, at) {
  return events
    .filter((e) => e && e.eventType === type && e[payloadKey])
    .map((e) => ({ e, ms: Date.parse(at(e)) }))
    .filter((x) => Number.isFinite(x.ms) && x.ms >= range.fromMs && x.ms < range.toMs)
    .sort((a, b) => a.ms - b.ms)
    .map((x) => ({ ...x, date: dayKey(x.ms, range.hour) }))
}

function byDay(items, make, fold) {
  const map = new Map()
  for (const it of items) {
    if (!map.has(it.date)) map.set(it.date, make(it.date))
    fold(map.get(it.date), it)
  }
  return [...map.values()].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

const sum = (list, f) => list.reduce((s, x) => s + f(x), 0)
const perDay = (n, days) => (days > 0 ? n / days : 0)

// Breast duration of a feed without one counts as 15 minutes (spec-timeline-dashboards §3.3).
const BREAST_DEFAULT_MINUTES = 15

export function nutritionStats(events, opts) {
  const range = rangeOf(opts)
  const withData = daysWithData(events, opts)
  const items = pick(events, 'NUTRITION', 'nutrition', range, (e) => e.timestamp)
  const days = byDay(
    items,
    (date) => ({ date, offered: 0, consumed: 0, delta: 0, feedsCount: 0, breastCount: 0, bottleCount: 0, breastMinutes: 0 }),
    (d, { e }) => {
      const n = e.nutrition
      d.feedsCount++
      if (n.feedType === 'BOTTLE') {
        d.bottleCount++
        d.offered += n.amountOfferedMl || 0
        d.consumed += n.amountConsumedMl || 0
      } else {
        d.breastCount++
        d.breastMinutes += n.durationMinutes || BREAST_DEFAULT_MINUTES
      }
      d.delta = Math.max(0, d.offered - d.consumed)
    },
  )
  const feedsCount = sum(days, (d) => d.feedsCount)
  return {
    days,
    totals: {
      feedsCount,
      breastCount: sum(days, (d) => d.breastCount),
      bottleCount: sum(days, (d) => d.bottleCount),
      breastMinutes: sum(days, (d) => d.breastMinutes),
      bottleMl: sum(days, (d) => d.consumed),
      rangeDays: range.dates.length,
      daysWithData: withData,
      feedsPerDay: perDay(feedsCount, withData),
    },
  }
}

function sleepMinutes(sleep, nowMs) {
  if (sleep.endAt === null || sleep.endAt === undefined) {
    return Math.max(0, Math.round((nowMs - Date.parse(sleep.startAt)) / 60000))
  }
  if (typeof sleep.durationMinutes === 'number') return sleep.durationMinutes
  return Math.max(0, Math.floor((Date.parse(sleep.endAt) - Date.parse(sleep.startAt)) / 60000))
}

// `opts.now`: ISO instant, used only for a sleep that is still open. Every day of the range is listed (zero when empty)
// so the bar chart always shows one bar per day.
export function sleepStats(events, opts) {
  const range = rangeOf(opts)
  const withData = daysWithData(events, opts)
  const nowMs = Date.parse(opts.now ?? new Date(range.toMs).toISOString())
  const items = pick(events, 'SLEEP', 'sleep', range, (e) => e.sleep.startAt ?? e.timestamp)
  const sessions = byDay(
    items,
    (date) => ({ date, totalMinutes: 0, sessionCount: 0, sessions: [] }),
    (d, { e }) => {
      const minutes = sleepMinutes(e.sleep, nowMs)
      d.totalMinutes += minutes
      d.sessionCount++
      const s = {
        id: e.id,
        startAt: e.sleep.startAt,
        endAt: e.sleep.endAt ?? null,
        durationMinutes: minutes,
        loggedBy: e.loggedBy,
      }
      if (e.sleep.startLocation) s.location = e.sleep.startLocation
      d.sessions.push(s)
    },
  )
  const have = new Map(sessions.map((d) => [d.date, d]))
  const days = range.dates.map((date) => have.get(date) ?? { date, totalMinutes: 0, sessionCount: 0, sessions: [] })
  const totalMinutes = sum(days, (d) => d.totalMinutes)
  const locations = { CRIB: 0, HANDS: 0, CARRIER: 0, STROLLER: 0 }
  for (const d of days) for (const s of d.sessions) if (s.location in locations) locations[s.location]++
  return {
    days,
    totals: {
      totalMinutes,
      sessionCount: sum(days, (d) => d.sessionCount),
      rangeDays: range.dates.length,
      daysWithData: withData,
      hoursPerDay: perDay(totalMinutes / 60, withData),
      locations,
    },
  }
}

export function diaperStats(events, opts) {
  const range = rangeOf(opts)
  const withData = daysWithData(events, opts)
  const items = pick(events, 'DIAPER', 'diaper', range, (e) => e.timestamp)
  const days = byDay(
    items,
    (date) => ({ date, pee: 0, poo: 0, both: 0, total: 0, pooColors: [], pooTextures: [] }),
    (d, { e }) => {
      const x = e.diaper
      d.total++
      if (x.contains === 'PEE') d.pee++
      else if (x.contains === 'POO') d.poo++
      else if (x.contains === 'BOTH') d.both++
      if (x.pooColor && !d.pooColors.includes(x.pooColor)) d.pooColors.push(x.pooColor)
      if (x.pooTexture && !d.pooTextures.includes(x.pooTexture)) d.pooTextures.push(x.pooTexture)
    },
  )
  const total = sum(days, (d) => d.total)
  return {
    days,
    totals: {
      pee: sum(days, (d) => d.pee),
      poo: sum(days, (d) => d.poo),
      both: sum(days, (d) => d.both),
      total,
      rangeDays: range.dates.length,
      daysWithData: withData,
      perDay: perDay(total, withData),
    },
  }
}

// One row per weigh-in, oldest first; `change` is the latest minus the earliest (0 with fewer than two).
export function weightStats(events, opts) {
  const range = rangeOf(opts)
  const items = pick(events, 'WEIGHT', 'weight', range, (e) => e.timestamp)
  const entries = items.map(({ e, date }) => {
    const row = { id: e.id, timestamp: e.timestamp, date, weightGrams: e.weight.weightGrams }
    if (e.weight.percentile !== undefined && e.weight.percentile !== null) row.percentile = e.weight.percentile
    return row
  })
  const latest = entries.length ? entries[entries.length - 1] : null
  const earliest = entries.length ? entries[0] : null
  return {
    entries,
    totals: {
      count: entries.length,
      latestGrams: latest ? latest.weightGrams : null,
      latestPercentile: latest && latest.percentile !== undefined ? latest.percentile : null,
      latestDate: latest ? latest.date : null,
      changeGrams: latest && earliest && latest.id !== earliest.id ? latest.weightGrams - earliest.weightGrams : 0,
      rangeDays: range.dates.length,
      daysWithData: daysWithData(events, opts),
    },
  }
}

// `todayMl` ignores the range: the pumped total of the baby day that holds `opts.now` (spec §3.6).
export function pumpingStats(events, opts) {
  const range = rangeOf(opts)
  const withData = daysWithData(events, opts)
  const items = pick(events, 'PUMPING', 'pumping', range, (e) => e.timestamp)
  const days = byDay(
    items,
    (date) => ({ date, leftMl: 0, rightMl: 0, totalMl: 0, sessionCount: 0 }),
    (d, { e }) => {
      d.leftMl += e.pumping.leftAmountMl || 0
      d.rightMl += e.pumping.rightAmountMl || 0
      d.totalMl = d.leftMl + d.rightMl
      d.sessionCount++
    },
  )
  const leftMl = sum(days, (d) => d.leftMl)
  const rightMl = sum(days, (d) => d.rightMl)
  const totalMl = leftMl + rightMl
  const today = opts.now ? dayKey(Date.parse(opts.now), range.hour) : null
  const todayRow = days.find((d) => d.date === today)
  return {
    days,
    totals: {
      leftMl,
      rightMl,
      totalMl,
      sessionCount: sum(days, (d) => d.sessionCount),
      rangeDays: range.dates.length,
      daysWithData: withData,
      avgMlPerDay: Math.round(perDay(totalMl, withData)),
      todayMl: todayRow ? todayRow.totalMl : 0,
    },
  }
}

export function vomitingStats(events, opts) {
  const range = rangeOf(opts)
  const withData = daysWithData(events, opts)
  const items = pick(events, 'VOMITING', 'vomiting', range, (e) => e.timestamp)
  const days = byDay(
    items,
    (date) => ({ date, small: 0, medium: 0, large: 0, total: 0 }),
    (d, { e }) => {
      const size = e.vomiting.size || 'MEDIUM'
      d.total++
      if (size === 'SMALL') d.small++
      else if (size === 'LARGE') d.large++
      else d.medium++
    },
  )
  const total = sum(days, (d) => d.total)
  return {
    days,
    totals: {
      small: sum(days, (d) => d.small),
      medium: sum(days, (d) => d.medium),
      large: sum(days, (d) => d.large),
      total,
      rangeDays: range.dates.length,
      daysWithData: withData,
      perDay: perDay(total, withData),
    },
  }
}

export const STAT_KINDS = Object.freeze({
  nutrition: nutritionStats,
  sleep: sleepStats,
  diapers: diaperStats,
  weight: weightStats,
  pumping: pumpingStats,
  vomiting: vomitingStats,
})
