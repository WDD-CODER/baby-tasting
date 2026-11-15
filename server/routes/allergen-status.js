import { Router } from 'express'
import { computeAllergens } from '../domain/allergen-engine.js'
import { foodLockAlerts, plannedCount } from '../domain/locks.js'
import { withDefaults } from '../domain/settings.js'
import { todayIso } from '../lib/dates.js'
import { getActiveLocks } from '../lib/locks.js'
import { handle, notFound } from './catalog-helpers.js'

const idOf = (doc) => String(doc._id)

export async function compute(repos, req) {
  const today = todayIso()
  const [baby, stored, allergens, foods, items, planned, locks] = await Promise.all([
    repos.babies.getForHousehold(req.householdId),
    repos.settings.get(req.householdId),
    repos.allergens.listAll(req.householdId),
    repos.foods.listAll(req.householdId),
    repos.calendarItems.listGiven(req.householdId),
    repos.calendarItems.listPlannedFrom(req.householdId, today),
    getActiveLocks(repos, req.householdId),
  ])
  const foodList = foods.map((f) => ({ id: idOf(f), name: f.name, allergenId: f.allergenId ?? null }))
  const result = computeAllergens({
    birthDate: baby?.birthDate ?? null,
    settings: withDefaults(stored),
    allergens: allergens.map((a) => ({ id: idOf(a), name: a.name, archived: a.archived === true })),
    foods: foodList,
    items: items.map((it) => ({ date: it.date, foodId: it.foodId, status: it.status })),
    today,
    locks,
  })
  const names = new Map(allergens.map((a) => [idOf(a), a.name]))
  const plannedItems = planned.map((it) => ({ date: it.date, foodId: it.foodId, status: it.status }))
  const alerts = result.alerts.map((alert) => {
    const out = { ...alert, allergenName: names.get(alert.allergenId) ?? '' }
    if (alert.kind === 'locked') {
      out.targetName = out.allergenName
      out.plannedCount = plannedCount({ items: plannedItems, foods: foodList, today, allergenId: alert.allergenId })
    }
    return out
  })
  alerts.push(...foodLockAlerts({ locks, items: plannedItems, foods: foodList, today }))
  return { allergens: result.allergens, alerts }
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
