import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { SESSION_COOKIE } from '../middleware/auth.js'

const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000

export function createAuthRouter({ repos, config, requireAuth }) {
  const router = Router()
  const allowed = new Map(config.appUsers.map((u) => [u.trim().toLowerCase(), u.trim()]))
  const secure = config.nodeEnv === 'production'

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'rate_limited', message: 'Too many attempts' } })
    },
  })

  function fail(res) {
    res.status(401).json({ error: { code: 'login_failed', message: 'Login failed' } })
  }

  router.post('/auth/login', loginLimiter, async (req, res, next) => {
    try {
      const raw = req.body?.username
      if (typeof raw !== 'string') return fail(res)
      const username = allowed.get(raw.trim().toLowerCase())
      if (!username) return fail(res)
      const now = new Date()
      const household = await repos.households.ensureDefault(username, now)
      const token = await repos.sessions.create({
        username,
        householdId: String(household._id),
        now,
        maxAgeMs: MAX_AGE_MS,
      })
      res.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure,
        maxAge: MAX_AGE_MS,
        path: '/',
      })
      res.json({ username })
    } catch (err) {
      next(err)
    }
  })

  router.post('/auth/logout', async (req, res, next) => {
    try {
      await repos.sessions.delete(req.cookies?.[SESSION_COOKIE])
      res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure, path: '/' })
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  router.get('/auth/me', requireAuth, (req, res) => {
    res.json({ username: req.user.username })
  })

  return router
}
