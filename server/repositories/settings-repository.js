import { withCreateAudit, withUpdateAudit } from '../lib/audit.js'
import { BaseRepository } from './base-repository.js'

// One document per household holding only the values the household changed.
export class SettingsRepository extends BaseRepository {
  constructor(db) {
    super(db, 'settings')
  }

  async get(householdId) {
    const doc = await this.findOne(householdId, {})
    return doc?.values ?? {}
  }

  async save(householdId, values, user) {
    const existing = await this.findOne(householdId, {})
    const merged = { ...(existing?.values ?? {}), ...values }
    if (existing) {
      await this.collection.updateOne(
        { _id: existing._id, householdId },
        { $set: withUpdateAudit({ values: merged }, user, new Date()) },
      )
    } else {
      await this.collection.insertOne(withCreateAudit({ householdId, values: merged }, user, new Date()))
    }
    return merged
  }
}
