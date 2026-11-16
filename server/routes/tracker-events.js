import { Router } from 'express'
import { isDateString, jerusalemMidnight } from '../domain/tracker/baby-day.js'
import {
  EVENT_TYPES,
  PAYLOAD_KEY,
  isIso,
  normalizeEvent,
  normalizeNote,
  toApiEvent,
  validateEvent,
} from '../domain/tracker/events.js'
import { checkOverlap, durationMinutes } from '../domain/tracker/sleep.js'
import { HttpError } from '../lib/http-error.js'
import { handle, notFound } from './catalog-helpers.js'

const DEFAULT_LIMIT = 400
const MAX_LIMIT = 2000

const invalid = (errors) =>
  new HttpError(400, 'invalid', errors.map((e) => (e.field ? `${e.field} ${e.message}` : e.message)).join('; '))

// from / to accept a YYYY-MM-DD day (Asia/Jerusalem) or an ISO moment. `to` is exclusive; a day means up to its end.
function parseBound(value, name, isTo) {
  if (value === undefined || value === '') return undefined
  if (isDateString(value)) return jerusalemMidnight(value, isTo ? 1 : 0)
  if (isIso(value)) return new Date(value).toISOString()
  throw new HttpError(400, 'invalid', `${name} must be YYYY-MM-DD or an ISO date-time`)
}

function parseLimit(value) {
  if (value === undefined) return DEFAULT_LIMIT
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
    throw new HttpError(400, 'invalid', `limit must be a whole number from 1 to ${MAX_LIMIT}`)
  }
  return n
}

// A stored sleep payload for a client payload: ISO moments normalized, duration derived, who started/ended kept.
function buildSleep(input, existing, parentType) {
  const startAt = new Date(input.startAt).toISOString()
  const endRaw = input.endAt === undefined ? (existing?.endAt ?? null) : input.endAt
  const endAt = endRaw === null ? null : new Date(endRaw).toISOString()
  const sleep = { startAt, endAt }
  if (input.startLocation) sleep.startLocation = input.startLocation
  if (endAt !== null) sleep.durationMinutes = durationMinutes(startAt, endAt)
  const startedBy = existing?.startedBy ?? parentType
  sleep.startedBy = startedBy
  const endedBy = existing?.endedBy ?? (endAt !== null ? parentType : undefined)
  if (endAt !== null && endedBy) sleep.endedBy = endedBy
  return sleep
}

export async function assertSleepFits(repos, householdId, sleep, id) {
  const near = await repos.trackerEvents.findSleepsNear(householdId, sleep.startAt, sleep.endAt)
  if (checkOverlap(near, { startAt: sleep.startAt, endAt: sleep.endAt, id }).overlaps) {
    throw new HttpError(409, 'sleep_overlap', 'This sleep overlaps another sleep')
  }
}

export function createTrackerEventsRouter({ repos }) {
  const router = Router()

  router.get(
    '/',
    handle(async (req, res) => {
      const from = parseBound(req.query.from, 'from', false)
      const to = parseBound(req.query.to, 'to', true)
      const limit = parseLimit(req.query.limit)
      const docs = await repos.trackerEvents.list(req.householdId, { from, to, limit })
      res.json({ events: docs.map(toApiEvent) })
    }),
  )

  router.post(
    '/',
    handle(async (req, res) => {
      const type = req.body?.eventType
      if (!EVENT_TYPES.includes(type)) throw invalid([{ field: 'eventType', message: `must be one of ${EVENT_TYPES.join(', ')}` }])
      const check = validateEvent(type, req.body)
      if (!check.ok) throw invalid(check.errors)
      const parentType = req.user.parentType
      const doc = normalizeEvent(type, req.body, { now: new Date().toISOString(), loggedBy: parentType })
      if (type === 'SLEEP') {
        doc.sleep = buildSleep(req.body.sleep, null, parentType)
        if (doc.sleep.endAt === null && (await repos.trackerEvents.findOpenSleep(req.householdId))) {
          throw new HttpError(409, 'sleep_already_open', 'A sleep is already open')
        }
        await assertSleepFits(repos, req.householdId, doc.sleep)
      }
      const baby = await repos.babies.getForHousehold(req.householdId)
      doc.babyId = baby ? String(baby._id) : null
      const saved = await repos.trackerEvents.create(req.householdId, doc, req.user.username)
      res.status(201).json({ event: toApiEvent(saved) })
    }),
  )

  // before the /:id routes
  router.post(
    '/clear',
    handle(async (req, res) => {
      const before = req.body?.before
      if (!isDateString(before)) throw new HttpError(400, 'invalid', 'before must be a date as YYYY-MM-DD')
      // the chosen date is included: everything before the next midnight (Asia/Jerusalem) goes
      const deleted = await repos.trackerEvents.clearBefore(req.householdId, jerusalemMidnight(before, 1))
      res.json({ deleted })
    }),
  )

  router.put(
    '/:id',
    handle(async (req, res) => {
      const existing = await repos.trackerEvents.get(req.householdId, req.params.id)
      if (!existing) throw notFound()
      const type = existing.eventType
      const body = req.body
      if (body?.eventType !== undefined && body.eventType !== type) {
        throw new HttpError(400, 'invalid', 'eventType cannot be changed')
      }
      const check = validateEvent(type, { ...body, eventType: undefined }, { partial: true })
      if (!check.ok) throw invalid(check.errors)

      const set = {}
      const unset = {}
      const key = PAYLOAD_KEY[type]
      if (body.note !== undefined) {
        const note = normalizeNote(body.note)
        if (note) set.note = note
        else unset.note = ''
      }
      if (body.quickRecorded !== undefined) set.quickRecorded = body.quickRecorded
      if (type === 'SLEEP') {
        if (body.sleep !== undefined) {
          const sleep = buildSleep(body.sleep, existing.sleep, req.user.parentType)
          await assertSleepFits(repos, req.householdId, sleep, String(existing._id))
          set.sleep = sleep
          set.timestamp = sleep.startAt
        }
      } else {
        if (body.timestamp !== undefined) set.timestamp = new Date(body.timestamp).toISOString()
        if (body[key] !== undefined) set[key] = body[key]
      }
      const updated = await repos.trackerEvents.update(req.householdId, req.params.id, { set, unset }, req.user.username)
      if (!updated) throw notFound()
      res.json({ event: toApiEvent(updated) })
    }),
  )

  router.delete(
    '/:id',
    handle(async (req, res) => {
      const done = await repos.trackerEvents.softDelete(req.householdId, req.params.id, req.user.username)
      if (!done) throw notFound()
      res.json({ success: true, deletedId: req.params.id })
    }),
  )

  return router
}
