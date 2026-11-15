import { AllergensRepository } from './allergens-repository.js'
import { BabiesRepository } from './babies-repository.js'
import { CalendarItemsRepository } from './calendar-items-repository.js'
import { FoodsRepository } from './foods-repository.js'
import { HouseholdsRepository } from './households-repository.js'
import { SettingsRepository } from './settings-repository.js'
import { SessionsRepository } from './sessions-repository.js'
import { TestResetRepository } from './test-reset-repository.js'

export function createRepos(db) {
  return {
    sessions: new SessionsRepository(db),
    households: new HouseholdsRepository(db),
    babies: new BabiesRepository(db),
    allergens: new AllergensRepository(db),
    foods: new FoodsRepository(db),
    calendarItems: new CalendarItemsRepository(db),
    settings: new SettingsRepository(db),
    testReset: new TestResetRepository(db),
  }
}
