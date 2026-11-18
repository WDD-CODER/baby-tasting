import { requireBabyId } from '../lib/context.js'
import { HttpError } from '../lib/http-error.js'
import { ensureCatalog } from '../seed/seed-catalog.js'

export function duplicateName() {
  return new HttpError(409, 'duplicate_name', 'An item with this name already exists')
}

export function notFound() {
  return new HttpError(404, 'not_found', 'Not found')
}

export function wantsArchived(req) {
  return req.query.archived === '1'
}

export function handle(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res)
    } catch (err) {
      // a 409 event_conflict carries the blocker next to code and message (D-016-2)
      if (err?.code === 'event_conflict' && err.conflict) {
        res.status(409).json({ error: { code: err.code, message: err.message, conflict: err.conflict } })
        return
      }
      next(err)
    }
  }
}

// Each catalog context remembers householdId -> babyId of households whose built-in catalog was already checked
// (D-020-3). The memories are listed here so clearCatalogMemory() can empty them all.
const memories = new Set()

export function clearCatalogMemory() {
  for (const memory of memories) memory.clear()
}

// Finds the baby and seeds the built-ins when missing (safe to repeat); done once per household, then remembered.
export function createCatalogContext({ repos }) {
  const checkedHouseholds = new Map()
  memories.add(checkedHouseholds)
  return async (req, _res, next) => {
    try {
      const known = checkedHouseholds.get(req.householdId)
      if (known) {
        req.babyId = known
        next()
        return
      }
      req.babyId = await requireBabyId(repos, req.householdId)
      await ensureCatalog(repos, req.householdId, req.babyId)
      checkedHouseholds.set(req.householdId, req.babyId)
      next()
    } catch (err) {
      next(err)
    }
  }
}
