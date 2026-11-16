import { Router } from 'express'
import { todayIso } from '../lib/dates.js'

function invalid(res, message) {
  res.status(400).json({ error: { code: 'invalid', message } })
}

function isRealDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

function toDto(doc) {
  return doc
    ? { id: String(doc._id), name: doc.name, birthDate: doc.birthDate, birthWeightGrams: doc.birthWeightGrams ?? null }
    : null
}

const WEIGHT_MIN = 100
const WEIGHT_MAX = 7000

// undefined keeps the stored weight, null clears it, a whole number of grams sets it.
function isWeight(value) {
  return value === undefined || value === null || (Number.isInteger(value) && value >= WEIGHT_MIN && value <= WEIGHT_MAX)
}

export function createBabyRouter({ repos }) {
  const router = Router()

  router.get('/', async (req, res, next) => {
    try {
      res.json({ baby: toDto(await repos.babies.getForHousehold(req.householdId)) })
    } catch (err) {
      next(err)
    }
  })

  router.put('/', async (req, res, next) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
      if (name.length < 1 || name.length > 40) return invalid(res, 'Name must be 1-40 characters')
      const birthDate = req.body?.birthDate
      if (!isRealDate(birthDate)) return invalid(res, 'Birth date must be a real YYYY-MM-DD date')
      const today = todayIso()
      if (birthDate > today) return invalid(res, 'Birth date cannot be in the future')
      const limit = `${Number(today.slice(0, 4)) - 6}${today.slice(4)}`
      if (birthDate < limit) return invalid(res, 'Birth date is more than 6 years ago')
      const birthWeightGrams = req.body?.birthWeightGrams
      if (!isWeight(birthWeightGrams)) {
        return invalid(res, `Birth weight must be a whole number of grams from ${WEIGHT_MIN} to ${WEIGHT_MAX}`)
      }
      const fields = birthWeightGrams === undefined ? { name, birthDate } : { name, birthDate, birthWeightGrams }
      const saved = await repos.babies.upsert(req.householdId, fields, req.user.username)
      res.json({ baby: toDto(saved) })
    } catch (err) {
      next(err)
    }
  })

  return router
}
