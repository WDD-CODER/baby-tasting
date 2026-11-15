import { Router } from 'express'
import { HttpError } from '../lib/http-error.js'
import { handle } from './catalog-helpers.js'

export function createUsersRouter({ repos }) {
  const router = Router()

  router.get(
    '/me/hints',
    handle(async (req, res) => {
      res.json({ hints: await repos.userPrefs.getHints(req.householdId, req.user.username) })
    }),
  )

  router.put(
    '/me/hints',
    handle(async (req, res) => {
      if (typeof req.body?.calendarHintSeen !== 'boolean') {
        throw new HttpError(400, 'invalid', 'calendarHintSeen must be true or false')
      }
      const hints = await repos.userPrefs.setHints(req.householdId, req.user.username, {
        calendarHintSeen: req.body.calendarHintSeen,
      })
      res.json({ hints })
    }),
  )

  return router
}
