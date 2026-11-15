import { Router } from 'express'
import { computeAllergens } from '../domain/allergen-engine.js'
import { withDefaults } from '../domain/settings.js'
import { todayIso } from '../lib/dates.js'
import { handle, notFound } from './catalog-helpers.js'

const idOf = (doc) => String(doc._id)

async function compute(repos, req) {
  const [baby, stored, allergens, foods, items] = await Promise.all([
    repos.babies.getForHousehold(req.householdId),
    repos.settings.get(req.householdId),
    repos.allergens.listAll(req.householdId),
    repos.foods.listAll(req.householdId),
    repos.calendarItems.listGiven(req.householdId),
  ])
  const result = computeAllergens({
    birthDate: baby?.birthDate ?? null,
    settings: withDefaults(stored),
    allergens: allergens.map((a) => ({ id: idOf(a), name: a.name, archived: a.archived === true })),
    foods: foods.map((f) => ({ id: idOf(f), allergenId: f.allergenId ?? null })),
    items: items.map((it) => ({ date: it.date, foodId: it.foodId, status: it.status })),
    today: todayIso(),
  })
  const names = new Map(allergens.map((a) => [idOf(a), a.name]))
  return {
    allergens: result.allergens,
    alerts: result.alerts.map((alert) => ({ ...alert, allergenName: names.get(alert.allergenId) ?? '' })),
  }
}

// Mounted at /api/v1 (before the /allergens/:id routes): /allergens/status, /allergens/:id/history, /alerts.
export function createAllergenStatusRouter({ repos }) {
  const router = Router()

  router.get(
    '/allergens/status',
    handle(async (req, res) => {
      res.json(await compute(repos, req))
    }),
  )

  router.get(
    '/alerts',
    handle(async (req, res) => {
      res.json({ alerts: (await compute(repos, req)).alerts })
    }),
  )

  router.get(
    '/allergens/:id/history',
    handle(async (req, res) => {
      const allergen = await repos.allergens.findById(req.householdId, req.params.id)
      if (!allergen) throw notFound()
      const foods = (await repos.foods.listAll(req.householdId)).filter((f) => f.allergenId === req.params.id)
      const byId = new Map(foods.map((f) => [idOf(f), f]))
      const given = (await repos.calendarItems.listGiven(req.householdId)).filter((it) => byId.has(it.foodId))
      const days = new Map()
      for (const it of given) {
        const food = byId.get(it.foodId)
        if (!days.has(it.date)) days.set(it.date, [])
        days.get(it.date).push({
          itemId: idOf(it),
          foodId: it.foodId,
          foodName: food.name,
          emoji: food.emoji,
          amount: it.amount ?? null,
        })
      }
      res.json({
        days: [...days.keys()]
          .sort()
          .reverse()
          .map((date) => ({ date, items: days.get(date) })),
      })
    }),
  )

  return router
}
