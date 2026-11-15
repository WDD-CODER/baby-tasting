import { BaseRepository } from './base-repository.js'

export class BabiesRepository extends BaseRepository {
  constructor(db) {
    super(db, 'babies')
  }

  getForHousehold(householdId) {
    return this.findOne(householdId, {})
  }

  async upsert(householdId, { name, birthDate }, user) {
    const existing = await this.getForHousehold(householdId)
    if (existing) return this.updateOne(householdId, existing._id, { name, birthDate }, user)
    return this.insertOne(householdId, { name, birthDate }, user)
  }
}
