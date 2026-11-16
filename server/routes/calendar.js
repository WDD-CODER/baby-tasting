import { Router } from 'express'
import { checkDuplicate, checkPlacement, checkStatus } from '../domain/calendar-rules.js'
import { isoDiffDays, isRealDate } from '../domain/dates.js'
import { isPlacementLocked } from '../domain/locks.js'
import {
  createCalendarItem,
  invalid,
  isFoodLocked,
  parseDate,
  parseMeal,
  refusal,
  STATUSES,
} from '../lib/calendar-create.js'
import { todayIso } from '../lib/dates.js'
import { getLockedIds } from '../lib/locks.js'
import { handle, notFound } from './catalog-helpers.js'

const AMOUNTS = ['taste', 'teaspoon', 'portion']
const MAX_RANGE_DAYS = 62

export function toItemDto(doc, locked = false) {
  return {
    id: String(doc._id),
    date: doc.date,
    meal: doc.meal,
    foodId: doc.foodId,
    status: doc.status,
    amount: doc.amount ?? null,
    note: doc.note ?? '',
    liked: doc.liked ?? null,
    givenBy: doc.givenBy ?? null,
    givenAt: doc.givenAt ? new Date(doc.givenAt).toISOString() : null,
    locked,
  }
}

function parsePatch(body) {
  const patch = {}
  if (body?.status !== undefined) {
    if (!STATUSES.includes(body.status)) throw invalid('Unknown status')
    patch.status = body.status
  }
  if (body?.amount !== undefined) {
    if (body.amount !== null && !AMOUNTS.includes(body.amount)) throw invalid('Unknown amount')
    patch.amount = body.amount
  }
  if (body?.note !== undefined) {
    if (typeof body.note !== 'string' || body.note.trim().length > 200) throw invalid('note must be up to 200 characters')
    patch.note = body.note.trim()
  }
  if (body?.liked !== undefined) {
    if (body.liked !== null && typeof body.liked !== 'boolean') throw invalid('liked must be true, false or null')
    patch.liked = body.liked
  }
  return patch
}

export function createCalendarRouter({ repos }) {
  const router = Router()

  const loadItem = async (req) => {
    const doc = await repos.calendarItems.findById(req.householdId, req.params.id)
    if (!doc) throw notFound()
    return doc
  }

  router.get(
    '/',
    handle(async (req, res) => {
      const { from, to } = req.query
      if (!isRealDate(from) || !isRealDate(to) || to < from) throw invalid('from and to must be real YYYY-MM-DD dates')
      if (isoDiffDays(from, to) + 1 > MAX_RANGE_DAYS) throw invalid(`range is at most ${MAX_RANGE_DAYS} days`)
      const [docs, foods, ids] = await Promise.all([
        repos.calendarItems.listRange(req.householdId, from, to),
        repos.foods.listAll(req.householdId),
        getLockedIds(repos, req.householdId),
      ])
      const foodById = new Map(foods.map((f) => [String(f._id), { id: String(f._id), allergenId: f.allergenId ?? null }]))
      res.json({
        items: docs.map((d) => toItemDto(d, isPlacementLocked({ food: foodById.get(d.foodId), ...ids }))),
      })
    }),
  )

  router.post(
    '/',
    handle(async (req, res) => {
      const saved = await createCalendarItem({
        repos,
        householdId: req.householdId,
        babyId: req.babyId,
        user: req.user.username,
        input: req.body,
        today: todayIso(),
      })
      res.status(201).json({ item: toItemDto(saved) })
    }),
  )

  router.patch(
    '/:id',
    handle(async (req, res) => {
      const doc = await loadItem(req)
      const patch = parsePatch(req.body)
      const user = req.user.username
      if (patch.status !== undefined) {
        const future = checkStatus({ status: patch.status, date: doc.date, today: todayIso() })
        if (future) throw refusal(future)
        if (patch.status === 'given' && doc.status !== 'given') {
          patch.givenBy = user
          patch.givenAt = new Date()
        } else if (patch.status === 'planned') {
          patch.amount = null
          patch.givenBy = null
          patch.givenAt = null
        } else if (patch.status === 'skipped') {
          patch.givenBy = null
          patch.givenAt = null
        }
      }
      const saved = await repos.calendarItems.update(req.householdId, req.params.id, patch, user)
      res.json({ item: toItemDto(saved) })
    }),
  )

  router.post(
    '/:id/move',
    handle(async (req, res) => {
      const doc = await loadItem(req)
      const date = parseDate(req.body?.date)
      const meal = parseMeal(req.body?.meal)
      const food = await repos.foods.findById(req.householdId, doc.foodId)
      if (food && (await isFoodLocked(repos, req.householdId, food))) throw refusal('food_locked')
      const placement = checkPlacement({ food, meal })
      if (placement) throw refusal(placement)
      const future = checkStatus({ status: doc.status, date, today: todayIso() })
      if (future) throw refusal(future)
      const day = await repos.calendarItems.listForDay(req.householdId, date)
      const dup = checkDuplicate({ items: day, date, meal, foodId: doc.foodId, excludeId: req.params.id })
      if (dup) throw refusal(dup)
      const saved = await repos.calendarItems.move(req.householdId, req.params.id, { date, meal }, req.user.username)
      res.json({ item: toItemDto(saved) })
    }),
  )

  router.delete(
    '/:id',
    handle(async (req, res) => {
      await loadItem(req)
      await repos.calendarItems.remove(req.householdId, req.params.id)
      res.json({ result: 'deleted' })
    }),
  )

  return router
}
