import crypto from 'node:crypto'

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export class SessionsRepository {
  constructor(db) {
    this.collection = db.collection('sessions')
  }

  async create({ username, householdId, now = new Date(), maxAgeMs }) {
    const token = crypto.randomBytes(32).toString('hex')
    await this.collection.insertOne({
      tokenHash: hashToken(token),
      username,
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

  async delete(token) {
    if (typeof token !== 'string' || !token) return false
    const { deletedCount } = await this.collection.deleteOne({ tokenHash: hashToken(token) })
    return deletedCount > 0
  }
}
