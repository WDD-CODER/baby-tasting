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
      next(err)
    }
  }
}

// Runs on every catalog request: finds the baby and seeds the built-ins when missing (safe to repeat).
export function createCatalogContext({ repos }) {
  return async (req, _res, next) => {
    try {
      req.babyId = await requireBabyId(repos, req.householdId)
      await ensureCatalog(repos, req.householdId, req.babyId)
      next()
    } catch (err) {
      next(err)
    }
  }
}
