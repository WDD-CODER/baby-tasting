import { Router } from 'express'
import { isIso, SLEEP_LOCATIONS, toApiEvent } from '../domain/tracker/events.js'
import { moveOpenSleepStart, toggleSleep } from '../domain/tracker/sleep.js'
import { HttpError } from '../lib/http-error.js'
import { handle } from './catalog-helpers.js'
import { assertSleepFits } from './tracker-events.js'

function checkToggleBody(body) {
  const b = body ?? {}
  for (const k of Object.keys(b)) {
    if (k !== 'location' && k !== 'at') throw new HttpError(400, 'invalid', `${k} is not a field of a sleep toggle`)
  }
  if (b.location !== undefined && !SLEEP_LOCATIONS.includes(b.location)) {
    throw new HttpError(400, 'invalid', `location must be one of ${SLEEP_LOCATIONS.join(', ')}`)
  }
  if (b.at !== undefined && !isIso(b.at)) throw new HttpError(400, 'invalid', 'at must be an ISO date-time')
  return b
}

export function createTrackerSleepRouter({ repos }) {
  const router = Router()

  router.get(
    '/open',
    handle(async (req, res) => {
      const open = await repos.trackerEvents.findOpenSleep(req.householdId)
      res.json(open ? toApiEvent(open) : null)
    }),
  )

  // D-015-1 mode 1: fix the open sleep's start. Body { startAt } (ISO). The sleep stays open.
  router.post(
    '/open/start',
    handle(async (req, res) => {
      const b = req.body ?? {}
      for (const k of Object.keys(b)) {
        if (k !== 'startAt') throw new HttpError(400, 'invalid', `${k} is not a field of a sleep start fix`)
      }
      if (!isIso(b.startAt)) throw new HttpError(400, 'invalid', 'startAt must be an ISO date-time')
      const startAt = new Date(b.startAt).toISOString()
      const open = await repos.trackerEvents.findOpenSleep(req.householdId)
      if (!open) throw new HttpError(404, 'not_found', 'No sleep is open')
      const others = await repos.trackerEvents.findSleepsNear(req.householdId, startAt, null)
      const result = moveOpenSleepStart({ open, startAt, now: new Date().toISOString(), others })
      if (result.error === 'start_in_future') throw new HttpError(400, 'start_in_future', 'The start is in the future')
      if (result.error === 'sleep_overlap') throw new HttpError(409, 'sleep_overlap', 'This sleep overlaps another sleep')
      const updated = await repos.trackerEvents.update(
        req.householdId,
        open._id,
        { set: { sleep: result.sleep, timestamp: startAt } },
        req.user.username,
      )
      res.json({ event: toApiEvent(updated) })
    }),
  )

  router.post(
    '/toggle',
    handle(async (req, res) => {
      const { location, at: atRaw } = checkToggleBody(req.body)
      const at = new Date(atRaw ?? new Date().toISOString()).toISOString()
      const open = await repos.trackerEvents.findOpenSleep(req.householdId)
      const result = toggleSleep({ open, at, parentType: req.user.parentType, location })
      if (result.error) throw new HttpError(400, 'invalid', 'The end time is before the sleep started')

      if (result.action === 'end') {
        const sleep = { ...open.sleep, ...result.patch }
        await assertSleepFits(repos, req.householdId, sleep, String(open._id))
        const updated = await repos.trackerEvents.update(req.householdId, open._id, { set: { sleep } }, req.user.username)
        res.json({ event: toApiEvent(updated), action: 'end' })
        return
      }
      await assertSleepFits(repos, req.householdId, result.event.sleep)
      const baby = await repos.babies.getForHousehold(req.householdId)
      const doc = { ...result.event, babyId: baby ? String(baby._id) : null }
      const saved = await repos.trackerEvents.create(req.householdId, doc, req.user.username)
      res.json({ event: toApiEvent(saved), action: 'start' })
    }),
  )

  return router
}
