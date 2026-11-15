export const SESSION_COOKIE = 'bt_session'

export function createRequireAuth({ repos }) {
  return async function requireAuth(req, res, next) {
    try {
      const session = await repos.sessions.findValid(req.cookies?.[SESSION_COOKIE], new Date())
      if (!session) {
        res.status(401).json({ error: { code: 'unauthorized', message: 'Unauthorized' } })
        return
      }
      req.user = { username: session.username }
      req.householdId = String(session.householdId)
      next()
    } catch (err) {
      next(err)
    }
  }
}
