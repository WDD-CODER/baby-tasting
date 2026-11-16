export const SESSION_COOKIE = 'bt_session'

const DAY_MS = 24 * 60 * 60 * 1000
// A phone stays signed in until sign-out or a year without opening the app.
export const SESSION_MAX_AGE_MS = 365 * DAY_MS
// Renew when less than this remains: at most once a day per session.
const RENEW_BELOW_MS = 364 * DAY_MS

export function sessionCookieOptions(config) {
  return { httpOnly: true, sameSite: 'lax', secure: config.nodeEnv === 'production', path: '/' }
}

// The one place that reads the session; it also rolls the expiry forward.
export function createRequireAuth({ repos, config }) {
  const order = (config.appUsers ?? []).map((u) => u.username.toLowerCase())
  const cookieOptions = sessionCookieOptions(config)
  return async function requireAuth(req, res, next) {
    try {
      const token = req.cookies?.[SESSION_COOKIE]
      const now = new Date()
      const session = await repos.sessions.findValid(token, now)
      if (!session) {
        res.status(401).json({ error: { code: 'unauthorized', message: 'Unauthorized' } })
        return
      }
      if (session.expiresAt.getTime() - now.getTime() < RENEW_BELOW_MS) {
        const renewed = await repos.sessions.renew(token, now, SESSION_MAX_AGE_MS)
        if (renewed) res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS })
      }
      const index = order.indexOf(String(session.username).toLowerCase())
      req.user = { username: session.username, parentType: index === 1 ? 'PARENT_B' : 'PARENT_A' }
      req.householdId = String(session.householdId)
      next()
    } catch (err) {
      next(err)
    }
  }
}
