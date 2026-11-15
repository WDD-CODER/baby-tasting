import { Router } from 'express'

export function createTestResetRouter({ repos }) {
  const router = Router()
  router.post('/test/reset', async (_req, res, next) => {
    try {
      await repos.testReset.clearAll()
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })
  return router
}
