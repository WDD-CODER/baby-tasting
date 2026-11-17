import bcrypt from 'bcryptjs'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { decideSignup, firstAccountOpen, validateCredentials } from '../domain/accounts.js'
import { parentNameFor, withTrackerDefaults } from '../domain/tracker/settings.js'
import { SESSION_COOKIE, SESSION_MAX_AGE_MS, sessionCookieOptions } from '../middleware/auth.js'

// Compared when the name is unknown so a wrong name and a wrong password take the same time.
const DUMMY_HASH = bcrypt.hashSync('not-a-password', 10)
const BCRYPT_COST = 10

function closed(res) {
  res.status(409).json({ error: { code: 'signup_closed', message: 'Sign-up is closed' } })
}

function forbidden(res) {
  res.status(403).json({ error: { code: 'forbidden', message: 'Only the first parent can do this' } })
}

function sendInvite(res, { token, expiresAt }) {
  res.json({ token, expiresAt: expiresAt.toISOString() })
}

export function createAuthRouter({ repos, config, requireAuth }) {
  const router = Router()
  const mode = config.accountsMode ?? ((config.appUsers ?? []).length ? 'env' : 'db')
  const envUsers = (config.appUsers ?? []).map((u, index) => ({
    username: u.username,
    hash: u.hash,
    parentType: index === 0 ? 'PARENT_A' : 'PARENT_B',
  }))
  const byName = new Map(envUsers.map((u) => [u.username.toLowerCase(), u]))
  const cookieOptions = sessionCookieOptions(config)

  // login, sign-up and invite checks share one counter
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

  // { username, hash, parentType } from the right place, or null
  async function findAccount(name) {
    if (mode === 'env') return byName.get(name.trim().toLowerCase()) ?? null
    const doc = await repos.users.findByName(name)
    return doc ? { username: doc.username, hash: doc.passwordHash, parentType: doc.parentType } : null
  }

  // creates the session cookie and answers with the login body (login and sign-up)
  async function signIn(res, user) {
    const now = new Date()
    const household = await repos.households.ensureDefault(user.username, now)
    const token = await repos.sessions.create({
      username: user.username,
      parentType: user.parentType,
      householdId: String(household._id),
      now,
      maxAgeMs: SESSION_MAX_AGE_MS,
    })
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS })
    const tracker = withTrackerDefaults(await repos.settings.getTracker(String(household._id)))
    res.json({ username: user.username, parentType: user.parentType, parentName: parentNameFor(tracker, user.parentType) })
  }

  async function partnerExists() {
    if (mode === 'env') return envUsers.length > 1
    return (await repos.users.findAll()).some((u) => u.parentType === 'PARENT_B')
  }

  router.get('/auth/signup-status', async (_req, res, next) => {
    try {
      const users = mode === 'db' ? await repos.users.findAll() : []
      res.json({ mode, firstAccountOpen: firstAccountOpen({ mode, users }) })
    } catch (err) {
      next(err)
    }
  })

  router.get('/auth/invites/:token', loginLimiter, async (req, res, next) => {
    try {
      if (mode === 'env') return closed(res)
      const invite = await repos.invites.findUsable(req.params.token, new Date())
      res.json({ valid: Boolean(invite) })
    } catch (err) {
      next(err)
    }
  })

  router.post('/auth/signup', loginLimiter, async (req, res, next) => {
    try {
      if (mode === 'env') return closed(res)
      const body = req.body ?? {}
      const inviteToken = typeof body.inviteToken === 'string' && body.inviteToken ? body.inviteToken : null
      const decision = decideSignup({ users: await repos.users.findAll(), inviteProvided: Boolean(inviteToken) })
      if (!decision.ok) {
        res.status(decision.status).json({ error: { code: decision.code, message: 'Cannot sign up' } })
        return
      }
      const checked = validateCredentials({ username: body.username, password: body.password })
      if (!checked.ok) {
        const [first] = checked.errors
        res.status(400).json({ error: { code: 'invalid', message: first.message, field: first.field } })
        return
      }
      if (await repos.users.findByName(checked.username)) {
        res.status(409).json({ error: { code: 'username_taken', message: 'That name is taken' } })
        return
      }
      const now = new Date()
      if (decision.needsInvite && !(await repos.invites.consume(inviteToken, now))) {
        res.status(403).json({ error: { code: 'invite_invalid', message: 'The invite link is not valid' } })
        return
      }
      const passwordHash = await bcrypt.hash(body.password, BCRYPT_COST)
      let user
      try {
        user = await repos.users.create({
          username: checked.username,
          passwordHash,
          parentType: decision.parentType,
          now,
        })
      } catch (err) {
        if (decision.needsInvite) await repos.invites.release(inviteToken)
        if (err?.code !== 11000) throw err
        const nameClash = err.keyPattern?.usernameLower || /usernameLower/.test(err.message ?? '')
        if (nameClash) {
          res.status(409).json({ error: { code: 'username_taken', message: 'That name is taken' } })
        } else {
          closed(res)
        }
        return
      }
      await signIn(res, { username: user.username, parentType: user.parentType })
    } catch (err) {
      next(err)
    }
  })

  router.post('/auth/login', loginLimiter, async (req, res, next) => {
    try {
      const raw = req.body?.username
      const password = req.body?.password
      if (typeof raw !== 'string' || typeof password !== 'string' || !password) return fail(res)
      const user = await findAccount(raw)
      const match = await bcrypt.compare(password, user?.hash ?? DUMMY_HASH)
      if (!user || !match) return fail(res)
      await signIn(res, user)
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
        mode,
        partnerExists: await partnerExists(),
      })
    } catch (err) {
      next(err)
    }
  })

  router.post('/auth/invites', requireAuth, async (req, res, next) => {
    try {
      if (mode === 'env') return closed(res)
      if (req.user.parentType !== 'PARENT_A') return forbidden(res)
      if (await partnerExists()) return closed(res)
      sendInvite(res, await repos.invites.create(new Date()))
    } catch (err) {
      next(err)
    }
  })

  router.post('/auth/parent-b/reset', requireAuth, async (req, res, next) => {
    try {
      if (mode === 'env') return closed(res)
      if (req.user.parentType !== 'PARENT_A') return forbidden(res)
      const removed = await repos.users.deleteByParentType('PARENT_B')
      if (!removed) {
        res.status(409).json({ error: { code: 'no_partner', message: 'There is no second parent to reset' } })
        return
      }
      await repos.sessions.deleteByUsername(removed.username)
      sendInvite(res, await repos.invites.create(new Date()))
    } catch (err) {
      next(err)
    }
  })

  return router
}
