import { Router } from 'express'
import { parseName } from '../lib/catalog-validation.js'
import { duplicateName, handle, notFound, wantsArchived } from './catalog-helpers.js'

export function toAllergenDto(doc) {
  return { id: String(doc._id), name: doc.name, builtIn: doc.builtIn === true, archived: doc.archived === true }
}

export function createAllergensRouter({ repos }) {
  const router = Router()
  const load = async (req) => {
    const doc = await repos.allergens.findById(req.householdId, req.params.id)
    if (!doc) throw notFound()
    return doc
  }

  router.get(
    '/',
    handle(async (req, res) => {
      const docs = wantsArchived(req)
        ? await repos.allergens.listAll(req.householdId)
        : await repos.allergens.listActive(req.householdId)
      res.json({ allergens: docs.map(toAllergenDto) })
    }),
  )

  router.post(
    '/',
    handle(async (req, res) => {
      const name = parseName(req.body?.name)
      if (await repos.allergens.findByName(req.householdId, name)) throw duplicateName()
      const saved = await repos.allergens.insertOne(
        req.householdId,
        { babyId: req.babyId, name, builtIn: false, archived: false },
        req.user.username,
      )
      res.status(201).json({ allergen: toAllergenDto(saved) })
    }),
  )

  router.patch(
    '/:id',
    handle(async (req, res) => {
      const doc = await load(req)
      const name = parseName(req.body?.name)
      if (!doc.archived && (await repos.allergens.findByName(req.householdId, name, req.params.id))) {
        throw duplicateName()
      }
      const saved = await repos.allergens.updateOne(req.householdId, req.params.id, { name }, req.user.username)
      res.json({ allergen: toAllergenDto(saved) })
    }),
  )

  // The only way a lock ends: a parent releases it, and who and when are recorded.
  router.post(
    '/:id/release',
    handle(async (req, res) => {
      await load(req)
      const lock = await repos.locks.release(req.householdId, 'allergen', req.params.id, req.user.username, new Date())
      if (!lock) throw notFound()
      res.json({ released: { releasedBy: lock.releasedBy, releasedAt: new Date(lock.releasedAt).toISOString() } })
    }),
  )

  router.post(
    '/:id/archive',
    handle(async (req, res) => {
      await load(req)
      const saved = await repos.allergens.archive(req.householdId, req.params.id, req.user.username)
      res.json({ allergen: toAllergenDto(saved) })
    }),
  )

  router.post(
    '/:id/restore',
    handle(async (req, res) => {
      const doc = await load(req)
      if (await repos.allergens.findByName(req.householdId, doc.name, req.params.id)) throw duplicateName()
      const saved = await repos.allergens.restore(req.householdId, req.params.id, req.user.username)
      res.json({ allergen: toAllergenDto(saved) })
    }),
  )

  router.delete(
    '/:id',
    handle(async (req, res) => {
      const doc = await load(req)
      const inUse = (await repos.foods.countByAllergenId(req.householdId, req.params.id)) > 0
      if (doc.builtIn || inUse) {
        await repos.allergens.archive(req.householdId, req.params.id, req.user.username)
        res.json({ result: 'archived' })
        return
      }
      await repos.allergens.remove(req.householdId, req.params.id)
      res.json({ result: 'deleted' })
    }),
  )

  return router
}
