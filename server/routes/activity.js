import { Router } from 'express'
import { handle } from './catalog-helpers.js'

export function createActivityRouter({ repos }) {
  const router = Router()

  router.get(
    '/',
    handle(async (req, res) => {
      res.json({ items: await repos.activity.latest(req.householdId, 100) })
    }),
  )

  return router
}
