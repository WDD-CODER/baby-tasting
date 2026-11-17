// Who may sign up, which parent they become, and the name and password rules (pure, no I/O).
export const USERNAME_MIN = 2
export const USERNAME_MAX = 30
export const PASSWORD_MIN = 4
export const PASSWORD_MAX = 200
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

const USERNAME_PATTERN = /^[\p{Script=Hebrew}\p{Script=Latin}0-9_-]+$/u

// Checks the typed name and password; the name comes back trimmed.
export function validateCredentials({ username, password }) {
  const errors = []
  const name = typeof username === 'string' ? username.trim() : ''
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX || !USERNAME_PATTERN.test(name)) {
    errors.push({
      field: 'username',
      message: `username must be ${USERNAME_MIN}-${USERNAME_MAX} letters, digits, - or _`,
    })
  }
  if (typeof password !== 'string' || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    errors.push({ field: 'password', message: `password must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters` })
  }
  return { ok: errors.length === 0, username: name, errors }
}

// users: [{ parentType }]. The first account is open while no PARENT_A exists; then an invite is needed; at two it is closed.
export function decideSignup({ users, inviteProvided }) {
  const hasA = users.some((u) => u.parentType === 'PARENT_A')
  const hasB = users.some((u) => u.parentType === 'PARENT_B')
  if (!hasA) return { ok: true, parentType: 'PARENT_A', needsInvite: false }
  if (hasB) return { ok: false, status: 409, code: 'signup_closed' }
  if (!inviteProvided) return { ok: false, status: 403, code: 'invite_required' }
  return { ok: true, parentType: 'PARENT_B', needsInvite: true }
}

export function firstAccountOpen({ mode, users }) {
  return mode === 'db' && !users.some((u) => u.parentType === 'PARENT_A')
}

export function inviteExpiry(now) {
  return new Date(now.getTime() + INVITE_TTL_MS)
}
