import { withUpdateAudit } from '../lib/audit.js'
import { BaseRepository } from './base-repository.js'

// One document per household member: { householdId, username, calendarHintSeen }.
export class UserPrefsRepository extends BaseRepository {
  constructor(db) {
    super(db, 'userPrefs')
  }

  async getHints(householdId, username) {
    const doc = await this.findOne(householdId, { username })
    return { calendarHintSeen: doc?.calendarHintSeen === true }
  }

  async setHints(householdId, username, { calendarHintSeen }) {
    const now = new Date()
    await this.collection.updateOne(
      { householdId, username },
      {
        $set: withUpdateAudit({ calendarHintSeen }, username, now),
        $setOnInsert: { createdBy: username, createdAt: now },
      },
      { upsert: true },
    )
    return this.getHints(householdId, username)
  }
}
