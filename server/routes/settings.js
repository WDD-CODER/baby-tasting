import { Router } from 'express'
import { validateSettings, withDefaults } from '../domain/settings.js'
import { HttpError } from '../lib/http-error.js'
import { handle } from './catalog-helpers.js'

export function createSettingsRouter({ repos }) {
  const router = Router()

  router.get(
    '/',
    handle(async (req, res) => {
      res.json({ settings: withDefaults(await repos.settings.get(req.householdId)) })
    }),
  )

  router.put(
    '/',
    handle(async (req, res) => {
      const check = validateSettings(req.body)
      if (!check.ok) throw new HttpError(400, 'invalid', check.errors.map((e) => e.message).join('; '))
      const stored = await repos.settings.save(req.householdId, req.body, req.user.username)
      res.json({ settings: withDefaults(stored) })
    }),
  )

  return router
}
