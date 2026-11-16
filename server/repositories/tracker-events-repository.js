import { withUpdateAudit } from '../lib/audit.js'
import { BaseRepository } from './base-repository.js'

// The only code that touches the `trackerEvents` collection. Timestamps are ISO strings (they sort as text).
export class TrackerEventsRepository extends BaseRepository {
  constructor(db) {
    super(db, 'trackerEvents')
  }

  // Newest first, never soft-deleted. `from` inclusive, `to` exclusive (ISO strings).
  list(householdId, { from, to, limit = 400 } = {}) {
    const filter = { householdId, deletedAt: { $exists: false } }
    if (from || to) filter.timestamp = { ...(from ? { $gte: from } : {}), ...(to ? { $lt: to } : {}) }
    return this.collection.find(filter).sort({ timestamp: -1, _id: -1 }).limit(limit).toArray()
  }

  // The timestamp (ISO) of the oldest event of any type with `from` <= timestamp < `to`, or null (D-015-2).
  async firstTimestamp(householdId, { from, to }) {
    const doc = await this.collection.findOne(
      { householdId, deletedAt: { $exists: false }, timestamp: { $gte: from, $lt: to } },
      { sort: { timestamp: 1, _id: 1 }, projection: { timestamp: 1 } },
    )
    return doc ? doc.timestamp : null
  }

  get(householdId, id) {
    return this.collection.findOne({ _id: this.toObjectId(id), householdId, deletedAt: { $exists: false } })
  }

  create(householdId, doc, user) {
    return this.insertOne(householdId, doc, user)
  }

  update(householdId, id, { set = {}, unset = {} }, user) {
    const update = { $set: withUpdateAudit(set, user, new Date()) }
    if (Object.keys(unset).length) update.$unset = unset
    return this.collection.findOneAndUpdate(
      { _id: this.toObjectId(id), householdId, deletedAt: { $exists: false } },
      update,
      { returnDocument: 'after' },
    )
  }

  async softDelete(householdId, id, user) {
    const res = await this.collection.updateOne(
      { _id: this.toObjectId(id), householdId, deletedAt: { $exists: false } },
      { $set: withUpdateAudit({ deletedAt: new Date().toISOString() }, user, new Date()) },
    )
    return res.matchedCount > 0
  }

  // Hard-deletes every event (soft-deleted ones too) with a timestamp before `beforeIso`. Returns the count.
  async clearBefore(householdId, beforeIso) {
    const { deletedCount } = await this.collection.deleteMany({ householdId, timestamp: { $lt: beforeIso } })
    return deletedCount
  }

  // The open sleep (endAt === null); the newest when several exist.
  findOpenSleep(householdId) {
    return this.collection.findOne(
      { householdId, eventType: 'SLEEP', 'sleep.endAt': null, deletedAt: { $exists: false } },
      { sort: { timestamp: -1 } },
    )
  }

  // Sleeps that could overlap [startAt, endAt) (endAt null = open); the domain makes the final call.
  findSleepsNear(householdId, startAt, endAt) {
    const filter = {
      householdId,
      eventType: 'SLEEP',
      deletedAt: { $exists: false },
      $or: [{ 'sleep.endAt': null }, { 'sleep.endAt': { $gt: startAt } }],
    }
    if (endAt) filter['sleep.startAt'] = { $lt: endAt }
    return this.collection.find(filter).toArray()
  }
}
