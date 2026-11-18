import { Router } from 'express'
import { clearCatalogMemory } from './catalog-helpers.js'

export function createTestResetRouter({ repos }) {
  const router = Router()
  router.post('/test/reset', async (_req, res, next) => {
    try {
      await repos.testReset.clearAll()
      // the server's own memories would otherwise outlive the emptied database
      repos.sessions.clearCache()
      clearCatalogMemory()
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })
  return router
}
