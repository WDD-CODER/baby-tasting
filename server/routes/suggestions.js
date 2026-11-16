import { Router } from 'express'
import { computeAllergens } from '../domain/allergen-engine.js'
import { dayOfWeek, isoAddDays, isRealDate } from '../domain/dates.js'
import { withDefaults } from '../domain/settings.js'
import { noSuggestionsReason, suggestWeek } from '../domain/suggestions.js'
import { createCalendarItem } from '../lib/calendar-create.js'
import { todayIso } from '../lib/dates.js'
import { HttpError } from '../lib/http-error.js'
import { getActiveLocks } from '../lib/locks.js'
import { toItemDto } from './calendar.js'
import { handle } from './catalog-helpers.js'

const MAX_ACCEPT = 50
const idOf = (doc) => String(doc._id)

export function createSuggestionsRouter({ repos }) {
  const router = Router()

  router.post(
    '/preview',
    handle(async (req, res) => {
      const weekStart = req.body?.weekStart
      if (!isRealDate(weekStart) || dayOfWeek(weekStart) !== 0) {
        throw new HttpError(400, 'invalid', 'weekStart must be a Sunday as YYYY-MM-DD')
      }
      const householdId = req.householdId
      const today = todayIso()
      const [baby, stored, allergenDocs, foodDocs, given, weekDocs, activeLocks] = await Promise.all([
        repos.babies.getForHousehold(householdId),
        repos.settings.get(householdId),
        repos.allergens.listAll(householdId),
        repos.foods.listAll(householdId),
        repos.calendarItems.listGiven(householdId),
        repos.calendarItems.listRange(householdId, weekStart, isoAddDays(weekStart, 6)),
        getActiveLocks(repos, householdId),
      ])
      const locks = {
        lockedFoodIds: activeLocks.filter((l) => l.targetType === 'food').map((l) => l.targetId),
        lockedAllergenIds: activeLocks.filter((l) => l.targetType === 'allergen').map((l) => l.targetId),
      }
      const settings = withDefaults(stored)
      const allergens = allergenDocs.map((a) => ({ id: idOf(a), name: a.name, archived: a.archived === true }))
      const lastGiven = new Map()
      for (const it of given) {
        if (it.date <= today && (lastGiven.get(it.foodId) ?? '') < it.date) lastGiven.set(it.foodId, it.date)
      }
      const foods = foodDocs.map((f) => ({
        id: idOf(f),
        name: f.name,
        allergenId: f.allergenId ?? null,
        archived: f.archived === true,
        tried: lastGiven.has(idOf(f)),
        lastGivenDate: lastGiven.get(idOf(f)) ?? null,
      }))
      const engine = computeAllergens({
        birthDate: baby?.birthDate ?? null,
        settings,
        allergens,
        foods: foods.map((f) => ({ id: f.id, allergenId: f.allergenId })),
        items: given.map((it) => ({ date: it.date, foodId: it.foodId, status: it.status })),
        today,
        locks: activeLocks,
      })
      const queue = foodDocs
        .filter((f) => typeof f.queuePosition === 'number' && f.archived !== true)
        .sort((a, b) => a.queuePosition - b.queuePosition)
        .map(idOf)
      const suggestions = suggestWeek({
        engine,
        foods,
        allergens,
        queue,
        weekItems: weekDocs.map((it) => ({ date: it.date, meal: it.meal, foodId: it.foodId, status: it.status })),
        settings,
        weekStart,
        today,
        ...locks,
      })
      res.json(
        suggestions.length === 0
          ? { suggestions, reason: noSuggestionsReason({ weekStart, today }) }
          : { suggestions },
      )
    }),
  )

  router.post(
    '/accept',
    handle(async (req, res) => {
      const items = req.body?.items
      if (!Array.isArray(items) || items.length > MAX_ACCEPT) {
        throw new HttpError(400, 'invalid', `items must be a list of at most ${MAX_ACCEPT}`)
      }
      const created = []
      const rejected = []
      for (const item of items) {
        try {
          const input = { date: item?.date, meal: item?.meal, foodId: item?.foodId, status: 'planned' }
          const saved = await createCalendarItem({
            repos,
            householdId: req.householdId,
            babyId: req.babyId,
            user: req.user.username,
            input,
            today: todayIso(),
          })
          created.push(toItemDto(saved))
        } catch (err) {
          if (!(err instanceof HttpError)) throw err
          rejected.push({ item, code: err.code })
        }
      }
      res.json({ created, rejected })
    }),
  )

  return router
}
