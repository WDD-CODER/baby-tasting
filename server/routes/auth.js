import bcrypt from 'bcryptjs'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { parentNameFor, withTrackerDefaults } from '../domain/tracker/settings.js'
import { SESSION_COOKIE, SESSION_MAX_AGE_MS, sessionCookieOptions } from '../middleware/auth.js'

// Compared when the name is unknown so a wrong name and a wrong password take the same time.
const DUMMY_HASH = bcrypt.hashSync('not-a-password', 10)

export function createAuthRouter({ repos, config, requireAuth }) {
  const router = Router()
  const users = (config.appUsers ?? []).map((u, index) => ({
    username: u.username,
    hash: u.hash,
    parentType: index === 0 ? 'PARENT_A' : 'PARENT_B',
  }))
  const byName = new Map(users.map((u) => [u.username.toLowerCase(), u]))
  const cookieOptions = sessionCookieOptions(config)

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
      const password = req.body?.password
      if (typeof raw !== 'string' || typeof password !== 'string' || !password) return fail(res)
      const user = byName.get(raw.trim().toLowerCase())
      const match = await bcrypt.compare(password, user?.hash ?? DUMMY_HASH)
      if (!user || !match) return fail(res)
      const now = new Date()
      const household = await repos.households.ensureDefault(user.username, now)
      const token = await repos.sessions.create({
        username: user.username,
        householdId: String(household._id),
        now,
        maxAgeMs: SESSION_MAX_AGE_MS,
      })
      res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS })
      const tracker = withTrackerDefaults(await repos.settings.getTracker(String(household._id)))
      res.json({ username: user.username, parentType: user.parentType, parentName: parentNameFor(tracker, user.parentType) })
    } catch (err) {
      next(err)
    }
  })

  router.post('/auth/logout', async (req, res, next) => {
    try {
      await repos.sessions.delete(req.cookies?.[SESSION_COOKIE])
      res.clearCookie(SESSION_COOKIE, cookieOptions)
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  router.get('/auth/me', requireAuth, async (req, res, next) => {
    try {
      const tracker = withTrackerDefaults(await repos.settings.getTracker(req.householdId))
      res.json({
        username: req.user.username,
        parentType: req.user.parentType,
        parentName: parentNameFor(tracker, req.user.parentType),
      })
    } catch (err) {
      next(err)
    }
  })

  return router
}
