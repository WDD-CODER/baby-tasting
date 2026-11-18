import crypto from 'node:crypto'
import { inviteExpiry } from '../domain/accounts.js'

function hashInvite(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// Only the SHA-256 of an invite token is stored: { tokenHash, createdAt, expiresAt, usedAt }.
export class InvitesRepository {
  constructor(db) {
    this.collection = db.collection('invites')
  }

  // Replaces any earlier unused invite; returns the token (shown once) and its expiry.
  async create(now = new Date()) {
    const token = crypto.randomBytes(32).toString('base64url')
    const expiresAt = inviteExpiry(now)
    await this.collection.deleteMany({ usedAt: null })
    await this.collection.insertOne({ tokenHash: hashInvite(token), createdAt: now, expiresAt, usedAt: null })
    return { token, expiresAt }
  }

  async findUsable(token, now = new Date()) {
    if (typeof token !== 'string' || !token) return null
    return this.collection.findOne({ tokenHash: hashInvite(token), usedAt: null, expiresAt: { $gt: now } })
  }

  // Atomic single use: true for exactly one caller.
  async consume(token, now = new Date()) {
    if (typeof token !== 'string' || !token) return false
    const doc = await this.collection.findOneAndUpdate(
      { tokenHash: hashInvite(token), usedAt: null, expiresAt: { $gt: now } },
      { $set: { usedAt: now } },
    )
    return Boolean(doc)
  }

  // Gives a consumed invite back when the account could not be created after all.
  async release(token) {
    await this.collection.updateOne({ tokenHash: hashInvite(token) }, { $set: { usedAt: null } })
  }
}
