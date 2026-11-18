import { Router } from 'express'
import { isDateString, jerusalemMidnight } from '../domain/tracker/baby-day.js'
import { toApiEvent } from '../domain/tracker/events.js'
import { STAT_KINDS, datesInRange, rangeBounds } from '../domain/tracker/stats.js'
import { HttpError } from '../lib/http-error.js'
import { handle, notFound } from './catalog-helpers.js'

// Program P4: the dashboards count baby days that start at 06:00 Asia/Jerusalem.
const DAY_START_HOUR = 6
const MAX_DAYS = 366
const EVENT_LIMIT = 20000

// from / to are plain YYYY-MM-DD days (F1); a full ISO date-time is refused.
function parseDay(value, name) {
  if (!isDateString(value)) throw new HttpError(400, 'invalid', `${name} must be a YYYY-MM-DD date`)
  return value
}

function parseRange(query) {
  const from = parseDay(query.from, 'from')
  const to = parseDay(query.to, 'to')
  if (to < from) throw new HttpError(400, 'invalid', 'to must not be before from')
  if (datesInRange(from, to).length > MAX_DAYS) throw new HttpError(400, 'invalid', `the range is at most ${MAX_DAYS} days`)
  return { from, to }
}

// One read of the events and of the first timestamp, shared by every statistic asked for.
async function loadStatInput(repos, householdId, { from, to }) {
  // One extra day on each side: the domain makes the exact 06:00 cut.
  const docs = await repos.trackerEvents.list(householdId, {
    from: jerusalemMidnight(from, -1),
    to: jerusalemMidnight(to, 2),
    limit: EVENT_LIMIT,
  })
  const opts = { from, to, dayStartHour: DAY_START_HOUR, now: new Date().toISOString() }
  // D-015-2: the first event of any type inside the exact range; the averages count the days from there.
  const firstEventAt = await repos.trackerEvents.firstTimestamp(householdId, rangeBounds(opts))
  return { events: docs.map(toApiEvent), opts: { ...opts, firstEventAt } }
}

export function createTrackerStatsRouter({ repos }) {
  const router = Router()

  // all six sections from one read of the events
  router.get(
    '/',
    handle(async (req, res) => {
      const range = parseRange(req.query)
      const { events, opts } = await loadStatInput(repos, req.householdId, range)
      res.json(Object.fromEntries(Object.entries(STAT_KINDS).map(([kind, compute]) => [kind, compute(events, opts)])))
    }),
  )

  router.get(
    '/:kind',
    handle(async (req, res) => {
      const compute = Object.hasOwn(STAT_KINDS, req.params.kind) ? STAT_KINDS[req.params.kind] : null
      if (!compute) throw notFound('Unknown statistic')
      const range = parseRange(req.query)
      const { events, opts } = await loadStatInput(repos, req.householdId, range)
      res.json(compute(events, opts))
    }),
  )

  return router
}
