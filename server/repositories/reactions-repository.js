import { BaseRepository } from './base-repository.js'

export class ReactionsRepository extends BaseRepository {
  constructor(db) {
    super(db, 'reactions')
  }

  // Newest first; `foodId` keeps the reactions that list this food.
  list(householdId, { foodId = null } = {}) {
    const filter = foodId ? { foodIds: foodId } : {}
    return this.findMany(householdId, filter, { sort: { noticedAt: -1, createdAt: -1 } })
  }

  findById(householdId, id) {
    return this.findOne(householdId, { _id: this.toObjectId(id) })
  }

  create(householdId, doc, user) {
    return this.insertOne(householdId, doc, user)
  }

  update(householdId, id, patch, user) {
    return this.updateOne(householdId, id, patch, user)
  }

  remove(householdId, id) {
    return this.deleteOne(householdId, id)
  }
}
