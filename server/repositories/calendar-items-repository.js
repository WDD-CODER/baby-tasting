import { withUpdateAudit } from '../lib/audit.js'
import { BaseRepository } from './base-repository.js'

export class CalendarItemsRepository extends BaseRepository {
  constructor(db) {
    super(db, 'calendarItems')
  }

  countByFoodIds(householdId, foodIds) {
    return this.collection.countDocuments({ householdId, foodId: { $in: foodIds } })
  }

  listRange(householdId, from, to) {
    return this.findMany(householdId, { date: { $gte: from, $lte: to } }, { sort: { date: 1, meal: 1, createdAt: 1 } })
  }

  listForDay(householdId, date) {
    return this.findMany(householdId, { date }, { sort: { meal: 1, createdAt: 1 } })
  }

  listByFood(householdId, foodId) {
    return this.findMany(householdId, { foodId }, { sort: { date: 1, meal: 1 } })
  }

  listPlannedFrom(householdId, date) {
    return this.findMany(householdId, { status: 'planned', date: { $gte: date } })
  }

  listGiven(householdId) {
    return this.findMany(householdId, { status: 'given' }, { sort: { date: 1, meal: 1 } })
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

  // One findOneAndUpdate on the item: date and meal change together.
  move(householdId, id, { date, meal }, user) {
    return this.updateOne(householdId, id, { date, meal }, user)
  }

  // One updateMany: every food of the meal not yet given becomes given; a given one keeps its givenAt.
  async markMealGiven(householdId, date, meal, user) {
    const now = new Date()
    const patch = withUpdateAudit({ status: 'given', givenBy: user, givenAt: now }, user, now)
    return this.collection.updateMany({ householdId, date, meal, status: { $ne: 'given' } }, { $set: patch })
  }

  remove(householdId, id) {
    return this.deleteOne(householdId, id)
  }
}
