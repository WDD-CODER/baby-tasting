import { Router } from 'express'
import { isoAddDays } from '../domain/dates.js'
import { locksForReaction } from '../domain/locks.js'
import { invalid } from '../lib/calendar-create.js'
import { todayIso } from '../lib/dates.js'
import { photoFolder } from './uploads.js'
import { handle, notFound } from './catalog-helpers.js'

export const SYMPTOMS = ['rash', 'mouth_redness', 'swelling', 'vomiting', 'diarrhea', 'breathing', 'other']
export const SEVERITIES = ['mild', 'moderate', 'severe']
const MAX_PHOTOS = 5
const MAX_TEXT = 1000

export function toReactionDto(doc) {
  return {
    id: String(doc._id),
    noticedAt: new Date(doc.noticedAt).toISOString(),
    date: doc.date,
    itemIds: doc.itemIds,
    foodIds: doc.foodIds,
    symptoms: doc.symptoms,
    severity: doc.severity,
    text: doc.text ?? '',
    photos: doc.photos ?? [],
    createdBy: doc.createdBy ?? null,
  }
}

function parseNoticedAt(value, now) {
  const at = typeof value === 'string' ? new Date(value) : null
  if (!at || Number.isNaN(at.getTime()) || at.toISOString() !== value) throw invalid('noticedAt must be an ISO timestamp')
  if (at.getTime() > now.getTime()) throw invalid('noticedAt cannot be in the future')
  return at
}

function parseFields(body, householdId) {
  const symptoms = body?.symptoms
  if (!Array.isArray(symptoms) || symptoms.length < 1 || symptoms.some((s) => !SYMPTOMS.includes(s))) {
    throw invalid('symptoms must list at least one known symptom')
  }
  if (!SEVERITIES.includes(body?.severity)) throw invalid('Unknown severity')
  const text = body?.text ?? ''
  if (typeof text !== 'string' || text.length > MAX_TEXT) throw invalid(`text must be up to ${MAX_TEXT} characters`)
  const photos = body?.photos ?? []
  const folder = photoFolder(householdId) + '/'
  if (
    !Array.isArray(photos) ||
    photos.length > MAX_PHOTOS ||
    photos.some(
      (p) =>
        typeof p?.publicId !== 'string' ||
        !p.publicId.startsWith(folder) ||
        typeof p?.url !== 'string' ||
        !p.url.startsWith('https://'),
    )
  ) {
    throw invalid(`photos must be up to ${MAX_PHOTOS} uploads of this household`)
  }
  return {
    symptoms: [...new Set(symptoms)],
    severity: body.severity,
    text: text.trim(),
    photos: photos.map((p) => ({ publicId: p.publicId, url: p.url })),
  }
}

export function createReactionsRouter({ repos, photoStore }) {
  const router = Router()

  const load = async (req) => {
    const doc = await repos.reactions.findById(req.householdId, req.params.id)
    if (!doc) throw notFound()
    return doc
  }

  // The related items: each must be a given item of the household dated `date` or the day before.
  const loadItems = async (householdId, itemIds, date) => {
    if (!Array.isArray(itemIds) || itemIds.length < 1 || itemIds.some((id) => typeof id !== 'string')) {
      throw invalid('itemIds must list at least one item')
    }
    const items = []
    for (const id of [...new Set(itemIds)]) {
      const doc = await repos.calendarItems.findById(householdId, id)
      if (!doc || doc.status !== 'given') throw invalid('Related items must be given items')
      if (doc.date !== date && doc.date !== isoAddDays(date, -1)) throw invalid('Related items must be from that day or the day before')
      items.push(doc)
    }
    return items
  }

  router.get(
    '/',
    handle(async (req, res) => {
      const foodId = typeof req.query.foodId === 'string' ? req.query.foodId : null
      const docs = await repos.reactions.list(req.householdId, { foodId })
      res.json({ reactions: docs.map(toReactionDto) })
    }),
  )

  router.get(
    '/:id',
    handle(async (req, res) => {
      res.json({ reaction: toReactionDto(await load(req)) })
    }),
  )

  router.post(
    '/',
    handle(async (req, res) => {
      const now = new Date()
      const noticedAt = parseNoticedAt(req.body?.noticedAt, now)
      const date = todayIso(undefined, noticedAt)
      const items = await loadItems(req.householdId, req.body?.itemIds, date)
      const fields = parseFields(req.body, req.householdId)

      // every given item of the same date and meal as any related item is suspected too
      const mates = new Map(items.map((it) => [String(it._id), it]))
      for (const day of new Set(items.map((it) => it.date))) {
        const meals = new Set(items.filter((it) => it.date === day).map((it) => it.meal))
        for (const it of await repos.calendarItems.listForDay(req.householdId, day)) {
          if (it.status === 'given' && meals.has(it.meal)) mates.set(String(it._id), it)
        }
      }
      const foods = (await repos.foods.listAll(req.householdId)).map((f) => ({
        id: String(f._id),
        allergenId: f.allergenId ?? null,
      }))
      const targets = locksForReaction({
        items: [...mates.values()].map((it) => ({ date: it.date, meal: it.meal, foodId: it.foodId })),
        foods,
      })
      const saved = await repos.reactions.create(
        req.householdId,
        {
          babyId: req.babyId,
          noticedAt,
          date,
          itemIds: items.map((it) => String(it._id)),
          foodIds: [...new Set(items.map((it) => it.foodId))],
          ...fields,
        },
        req.user.username,
      )
      await repos.locks.lockTargets(req.householdId, req.babyId, targets, String(saved._id), req.user.username, now)
      res.status(201).json({ reaction: toReactionDto(saved) })
    }),
  )

  // Editing never releases a lock and never changes which foods are locked.
  router.patch(
    '/:id',
    handle(async (req, res) => {
      const doc = await load(req)
      const noticedAt = req.body?.noticedAt === undefined ? new Date(doc.noticedAt) : parseNoticedAt(req.body.noticedAt, new Date())
      const date = todayIso(undefined, noticedAt)
      const items = await loadItems(req.householdId, req.body?.itemIds ?? doc.itemIds, date)
      const fields = parseFields({ ...doc, ...req.body }, req.householdId)
      const saved = await repos.reactions.update(
        req.householdId,
        req.params.id,
        {
          noticedAt,
          date,
          itemIds: items.map((it) => String(it._id)),
          foodIds: [...new Set(items.map((it) => it.foodId))],
          ...fields,
        },
        req.user.username,
      )
      res.json({ reaction: toReactionDto(saved) })
    }),
  )

  // Deleting never releases a lock; it does remove the photos.
  router.delete(
    '/:id',
    handle(async (req, res) => {
      const doc = await load(req)
      for (const photo of doc.photos ?? []) {
        try {
          await photoStore.destroy(photo.publicId)
        } catch (err) {
          console.error('photo delete failed', photo.publicId, err?.message)
        }
      }
      await repos.reactions.remove(req.householdId, req.params.id)
      res.json({ result: 'deleted' })
    }),
  )

  return router
}
