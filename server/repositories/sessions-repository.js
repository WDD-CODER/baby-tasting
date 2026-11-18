import crypto from 'node:crypto'

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// A valid session is remembered this long in the server process (D-020-3).
const CACHE_MS = 60 * 1000

export class SessionsRepository {
  constructor(db) {
    this.collection = db.collection('sessions')
    // tokenHash -> { session, until }
    this.cache = new Map()
  }

  clearCache() {
    this.cache.clear()
  }

  async create({ username, parentType, householdId, now = new Date(), maxAgeMs }) {
    const token = crypto.randomBytes(32).toString('hex')
    await this.collection.insertOne({
      tokenHash: hashToken(token),
      username,
      parentType,
      householdId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + maxAgeMs),
    })
    return token
  }

  async findValid(token, now = new Date()) {
    if (typeof token !== 'string' || !token) return null
    const tokenHash = hashToken(token)
    const hit = this.cache.get(tokenHash)
    if (hit && hit.until > now.getTime() && hit.session.expiresAt > now) return hit.session
    if (hit) this.cache.delete(tokenHash)
    const session = await this.collection.findOne({ tokenHash, expiresAt: { $gt: now } })
    if (session) this.cache.set(tokenHash, { session, until: now.getTime() + CACHE_MS })
    return session
  }

  // Moves the expiry to now + maxAgeMs; false when the session is gone.
  async renew(token, now, maxAgeMs) {
    if (typeof token !== 'string' || !token) return false
    const tokenHash = hashToken(token)
    const expiresAt = new Date(now.getTime() + maxAgeMs)
    const { matchedCount } = await this.collection.updateOne(
      { tokenHash, expiresAt: { $gt: now } },
      { $set: { expiresAt, renewedAt: now } },
    )
    const hit = this.cache.get(tokenHash)
    if (matchedCount === 0) this.cache.delete(tokenHash)
    else if (hit) hit.session = { ...hit.session, expiresAt, renewedAt: now }
    return matchedCount > 0
  }

  // Signs a user out everywhere (used when parent B is reset).
  async deleteByUsername(username) {
    for (const [key, hit] of this.cache) if (hit.session.username === username) this.cache.delete(key)
    const { deletedCount } = await this.collection.deleteMany({ username })
    return deletedCount
  }

  async delete(token) {
    if (typeof token !== 'string' || !token) return false
    const tokenHash = hashToken(token)
    this.cache.delete(tokenHash)
    const { deletedCount } = await this.collection.deleteOne({ tokenHash })
    return deletedCount > 0
  }
}
