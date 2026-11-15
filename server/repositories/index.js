import { BabiesRepository } from './babies-repository.js'
import { HouseholdsRepository } from './households-repository.js'
import { SessionsRepository } from './sessions-repository.js'
import { TestResetRepository } from './test-reset-repository.js'

export function createRepos(db) {
  return {
    sessions: new SessionsRepository(db),
    households: new HouseholdsRepository(db),
    babies: new BabiesRepository(db),
    testReset: new TestResetRepository(db),
  }
}
