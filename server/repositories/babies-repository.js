import { BaseRepository } from './base-repository.js'

export class BabiesRepository extends BaseRepository {
  constructor(db) {
    super(db, 'babies')
  }

  getForHousehold(householdId) {
    return this.findOne(householdId, {})
  }

  // fields: name, birthDate and, when given, birthWeightGrams (grams or null).
  async upsert(householdId, fields, user) {
    const existing = await this.getForHousehold(householdId)
    if (existing) return this.updateOne(householdId, existing._id, fields, user)
    return this.insertOne(householdId, fields, user)
  }
}
