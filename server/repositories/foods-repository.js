import { withUpdateAudit } from '../lib/audit.js'
import { CatalogRepository } from './catalog-repository.js'

export class FoodsRepository extends CatalogRepository {
  constructor(db) {
    super(db, 'foods')
  }

  countByAllergenId(householdId, allergenId) {
    return this.collection.countDocuments({ householdId, allergenId })
  }

  // Active queued foods in queue order.
  listQueue(householdId) {
    return this.findMany(
      householdId,
      { queuePosition: { $type: 'number' }, archived: { $ne: true } },
      { sort: { queuePosition: 1 } },
    )
  }

  // Adds to the end of the queue (already queued stays where it is), or removes from it.
  async setQueued(householdId, foodId, queued, user) {
    const food = await this.findById(householdId, foodId)
    if (!food) return null
    const isQueued = typeof food.queuePosition === 'number'
    if (queued === isQueued) return food
    let queuePosition = null
    if (queued) {
      const last = await this.collection.find({ householdId, queuePosition: { $type: 'number' } }).sort({ queuePosition: -1 }).limit(1).toArray()
      queuePosition = last.length ? last[0].queuePosition + 1 : 0
    }
    return this.updateOne(householdId, foodId, { queuePosition }, user)
  }

  // `foodIds` is the whole queue in its new order.
  async reorderQueue(householdId, foodIds, user) {
    const now = new Date()
    await this.collection.bulkWrite(
      foodIds.map((id, index) => ({
        updateOne: {
          filter: { _id: this.toObjectId(id), householdId },
          update: { $set: withUpdateAudit({ queuePosition: index }, user, now) },
        },
      })),
    )
    return this.listQueue(householdId)
  }
}
