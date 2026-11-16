import { Router } from 'express'
import { HttpError } from '../lib/http-error.js'
import { handle } from './catalog-helpers.js'

export function photoFolder(householdId) {
  return `baby-tasting/${householdId}`
}

export function createUploadsRouter({ photoStore }) {
  const router = Router()
  router.post(
    '/signature',
    handle(async (req, res) => {
      if (!photoStore.configured) throw new HttpError(503, 'photos_not_configured', 'Photo upload is not configured')
      res.json(photoStore.sign({ folder: photoFolder(req.householdId) }))
    }),
  )
  return router
}
