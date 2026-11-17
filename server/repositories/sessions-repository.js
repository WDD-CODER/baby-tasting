import crypto from 'node:crypto'

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export class SessionsRepository {
  constructor(db) {
    this.collection = db.collection('sessions')
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
    return this.collection.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: now } })
  }

  // Moves the expiry to now + maxAgeMs; false when the session is gone.
  async renew(token, now, maxAgeMs) {
    if (typeof token !== 'string' || !token) return false
    const { matchedCount } = await this.collection.updateOne(
      { tokenHash: hashToken(token), expiresAt: { $gt: now } },
      { $set: { expiresAt: new Date(now.getTime() + maxAgeMs), renewedAt: now } },
    )
    return matchedCount > 0
  }

  // Signs a user out everywhere (used when parent B is reset).
  async deleteByUsername(username) {
    const { deletedCount } = await this.collection.deleteMany({ username })
    return deletedCount
  }

  async delete(token) {
    if (typeof token !== 'string' || !token) return false
    const { deletedCount } = await this.collection.deleteOne({ tokenHash: hashToken(token) })
    return deletedCount > 0
  }
}
