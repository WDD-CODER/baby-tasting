import { Router } from 'express'
import { deriveFoodStatus } from '../domain/calendar-rules.js'
import { summarize } from '../domain/progress.js'
import { compute } from './allergen-status.js'
import { handle } from './catalog-helpers.js'

export function createProgressRouter({ repos }) {
  const router = Router()

  router.get(
    '/',
    handle(async (req, res) => {
      const [foods, items, status] = await Promise.all([
        repos.foods.listActive(req.householdId),
        repos.calendarItems.listGiven(req.householdId),
        compute(repos, req),
      ])
      const progress = summarize({
        foods: foods.map((f) => ({ id: String(f._id), category: f.category, archived: f.archived === true })),
        statuses: deriveFoodStatus(items),
        allergenStates: status.allergens.map((a) => a.state),
      })
      res.json({ progress })
    }),
  )

  return router
}
