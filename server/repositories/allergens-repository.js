import { CatalogRepository } from './catalog-repository.js'

export class AllergensRepository extends CatalogRepository {
  constructor(db) {
    super(db, 'allergens')
  }
}
