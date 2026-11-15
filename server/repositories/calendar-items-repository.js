import { BaseRepository } from './base-repository.js'

// Collection created by plan 004; plan 004 extends this file.
export class CalendarItemsRepository extends BaseRepository {
  constructor(db) {
    super(db, 'calendarItems')
  }

  countByFoodIds(householdId, foodIds) {
    return this.collection.countDocuments({ householdId, foodId: { $in: foodIds } })
  }
}
