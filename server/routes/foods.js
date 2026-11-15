import { Router } from 'express'
import { deriveFoodStatus } from '../domain/calendar-rules.js'
import { parseFoodInput } from '../lib/catalog-validation.js'
import { HttpError } from '../lib/http-error.js'
import { duplicateName, handle, notFound, wantsArchived } from './catalog-helpers.js'

export function toFoodDto(doc, status = null) {
  return {
    id: String(doc._id),
    name: doc.name,
    emoji: doc.emoji,
    category: doc.category,
    allergenId: doc.allergenId ?? null,
    warning: doc.warning ?? null,
    builtIn: doc.builtIn === true,
    archived: doc.archived === true,
    status: status ?? { tried: false, firstDate: null, timesGiven: 0, liked: null },
  }
}

export function createFoodsRouter({ repos }) {
  const router = Router()
  const load = async (req) => {
    const doc = await repos.foods.findById(req.householdId, req.params.id)
    if (!doc) throw notFound()
    return doc
  }
  const requireActiveAllergen = async (householdId, allergenId) => {
    const allergen = allergenId ? await repos.allergens.findById(householdId, allergenId) : null
    if (!allergen || allergen.archived) throw new HttpError(400, 'invalid', 'Unknown allergen')
  }

  router.get(
    '/',
    handle(async (req, res) => {
      const docs = wantsArchived(req)
        ? await repos.foods.listAll(req.householdId)
        : await repos.foods.listActive(req.householdId)
      const statuses = deriveFoodStatus(await repos.calendarItems.listGiven(req.householdId))
      res.json({ foods: docs.map((d) => toFoodDto(d, statuses[String(d._id)])) })
    }),
  )

  router.post(
    '/',
    handle(async (req, res) => {
      const input = parseFoodInput(req.body, { full: true })
      if (input.allergenId) await requireActiveAllergen(req.householdId, input.allergenId)
      if (await repos.foods.findByName(req.householdId, input.name)) throw duplicateName()
      const saved = await repos.foods.insertOne(
        req.householdId,
        {
          babyId: req.babyId,
          name: input.name,
          emoji: input.emoji,
          category: input.category,
          allergenId: input.allergenId ?? null,
          warning: input.warning ?? null,
          builtIn: false,
          archived: false,
        },
        req.user.username,
      )
      res.status(201).json({ food: toFoodDto(saved) })
    }),
  )

  router.patch(
    '/:id',
    handle(async (req, res) => {
      const doc = await load(req)
      const patch = parseFoodInput(req.body, { full: false })
      if (patch.allergenId && patch.allergenId !== doc.allergenId) {
        await requireActiveAllergen(req.householdId, patch.allergenId)
      }
      if (patch.name !== undefined && !doc.archived) {
        if (await repos.foods.findByName(req.householdId, patch.name, req.params.id)) throw duplicateName()
      }
      const saved = await repos.foods.updateOne(req.householdId, req.params.id, patch, req.user.username)
      res.json({ food: toFoodDto(saved) })
    }),
  )

  router.post(
    '/:id/archive',
    handle(async (req, res) => {
      await load(req)
      const saved = await repos.foods.archive(req.householdId, req.params.id, req.user.username)
      res.json({ food: toFoodDto(saved) })
    }),
  )

  router.post(
    '/:id/restore',
    handle(async (req, res) => {
      const doc = await load(req)
      if (await repos.foods.findByName(req.householdId, doc.name, req.params.id)) throw duplicateName()
      const saved = await repos.foods.restore(req.householdId, req.params.id, req.user.username)
      res.json({ food: toFoodDto(saved) })
    }),
  )

  router.delete(
    '/:id',
    handle(async (req, res) => {
      const doc = await load(req)
      const used = (await repos.calendarItems.countByFoodIds(req.householdId, [req.params.id])) > 0
      if (doc.builtIn || used) {
        await repos.foods.archive(req.householdId, req.params.id, req.user.username)
        res.json({ result: 'archived' })
        return
      }
      await repos.foods.remove(req.householdId, req.params.id)
      res.json({ result: 'deleted' })
    }),
  )

  return router
}
