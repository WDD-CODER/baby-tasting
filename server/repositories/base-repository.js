import { ObjectId } from 'mongodb'
import { withCreateAudit, withUpdateAudit } from '../lib/audit.js'

function toId(id) {
  return typeof id === 'string' ? new ObjectId(id) : id
}

export class BaseRepository {
  constructor(db, name) {
    this.collection = db.collection(name)
  }

  findMany(householdId, filter = {}, opts = {}) {
    return this.collection.find({ ...filter, householdId }, opts).toArray()
  }

  findOne(householdId, filter = {}) {
    return this.collection.findOne({ ...filter, householdId })
  }

  async insertOne(householdId, doc, user) {
    const full = withCreateAudit({ ...doc, householdId }, user, new Date())
    const { insertedId } = await this.collection.insertOne(full)
    return { ...full, _id: insertedId }
  }

  async updateOne(householdId, id, patch, user) {
    return this.collection.findOneAndUpdate(
      { _id: toId(id), householdId },
      { $set: withUpdateAudit(patch, user, new Date()) },
      { returnDocument: 'after' },
    )
  }

  async deleteOne(householdId, id) {
    const { deletedCount } = await this.collection.deleteOne({ _id: toId(id), householdId })
    return deletedCount > 0
  }
}
