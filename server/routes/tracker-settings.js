import { Router } from 'express'
import {
  normalizeTrackerSettings,
  parentNameFor,
  validateTrackerSettings,
  withTrackerDefaults,
} from '../domain/tracker/settings.js'
import { HttpError } from '../lib/http-error.js'
import { handle } from './catalog-helpers.js'

export function createTrackerSettingsRouter({ repos }) {
  const router = Router()

  router.get(
    '/',
    handle(async (req, res) => {
      const settings = withTrackerDefaults(await repos.settings.getTracker(req.householdId))
      const { parentType } = req.user
      res.json({ settings, currentParent: { parentType, parentName: parentNameFor(settings, parentType) } })
    }),
  )

  router.put(
    '/',
    handle(async (req, res) => {
      const check = validateTrackerSettings(req.body)
      if (!check.ok) throw new HttpError(400, 'invalid', check.errors.map((e) => e.message).join('; '))
      const stored = await repos.settings.saveTracker(req.householdId, normalizeTrackerSettings(req.body), req.user.username)
      res.json({ settings: withTrackerDefaults(stored) })
    }),
  )

  return router
}
