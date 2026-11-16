import { withCreateAudit, withUpdateAudit } from '../lib/audit.js'
import { BaseRepository } from './base-repository.js'

// A lock keeps a suspected allergen or food out of the plan until a parent releases it.
// One active lock (`releasedAt: null`) per target; a second reaction adds its id to it.
export class LocksRepository extends BaseRepository {
  constructor(db) {
    super(db, 'locks')
  }

  listActive(householdId) {
    return this.findMany(householdId, { releasedAt: null })
  }

  findActive(householdId, targetType, targetId) {
    return this.findOne(householdId, { targetType, targetId, releasedAt: null })
  }

  // `targets` is `{ allergenIds, foodIds }`; every target gets (or keeps) its one active lock.
  async lockTargets(householdId, babyId, targets, reactionId, user, now) {
    const pairs = [
      ...targets.allergenIds.map((id) => ['allergen', id]),
      ...targets.foodIds.map((id) => ['food', id]),
    ]
    for (const [targetType, targetId] of pairs) {
      const active = await this.findActive(householdId, targetType, targetId)
      if (active) {
        await this.collection.updateOne(
          { _id: active._id, householdId },
          { $addToSet: { reactionIds: reactionId }, $set: withUpdateAudit({}, user, now) },
        )
        continue
      }
      await this.collection.insertOne(
        withCreateAudit(
          {
            householdId,
            babyId,
            targetType,
            targetId,
            reactionIds: [reactionId],
            lockedAt: now,
            lockedBy: user,
            releasedAt: null,
            releasedBy: null,
          },
          user,
          now,
        ),
      )
    }
  }

  // Returns the released lock, or null when the target was not locked.
  async release(householdId, targetType, targetId, user, now) {
    return this.collection.findOneAndUpdate(
      { householdId, targetType, targetId, releasedAt: null },
      { $set: withUpdateAudit({ releasedAt: now, releasedBy: user }, user, now) },
      { returnDocument: 'after' },
    )
  }
}
