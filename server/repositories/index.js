import { ActivityRepository } from './activity-repository.js'
import { AllergensRepository } from './allergens-repository.js'
import { BabiesRepository } from './babies-repository.js'
import { CalendarItemsRepository } from './calendar-items-repository.js'
import { FoodsRepository } from './foods-repository.js'
import { HouseholdsRepository } from './households-repository.js'
import { LocksRepository } from './locks-repository.js'
import { ReactionsRepository } from './reactions-repository.js'
import { SettingsRepository } from './settings-repository.js'
import { SessionsRepository } from './sessions-repository.js'
import { InvitesRepository } from './invites-repository.js'
import { UsersRepository } from './users-repository.js'
import { TestResetRepository } from './test-reset-repository.js'
import { TrackerEventsRepository } from './tracker-events-repository.js'
import { UserPrefsRepository } from './user-prefs-repository.js'

export function createRepos(db) {
  return {
    sessions: new SessionsRepository(db),
    users: new UsersRepository(db),
    invites: new InvitesRepository(db),
    households: new HouseholdsRepository(db),
    babies: new BabiesRepository(db),
    allergens: new AllergensRepository(db),
    foods: new FoodsRepository(db),
    calendarItems: new CalendarItemsRepository(db),
    reactions: new ReactionsRepository(db),
    locks: new LocksRepository(db),
    settings: new SettingsRepository(db),
    userPrefs: new UserPrefsRepository(db),
    trackerEvents: new TrackerEventsRepository(db),
    activity: new ActivityRepository(db),
    testReset: new TestResetRepository(db),
  }
}
