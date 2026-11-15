import { CatalogRepository } from './catalog-repository.js'

export class FoodsRepository extends CatalogRepository {
  constructor(db) {
    super(db, 'foods')
  }

  countByAllergenId(householdId, allergenId) {
    return this.collection.countDocuments({ householdId, allergenId })
  }
}
