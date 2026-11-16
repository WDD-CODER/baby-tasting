import { Router } from 'express'

export function healthRouter(db) {
  const router = Router()
  router.get('/health', async (_req, res) => {
    let dbStatus = 'up'
    try {
      await db.command({ ping: 1 })
    } catch {
      dbStatus = 'down'
    }
    res.json({ status: 'ok', db: dbStatus })
  })
  return router
}
