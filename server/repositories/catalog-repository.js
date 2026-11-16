import { BaseRepository } from './base-repository.js'

// Shared by allergens and foods: both carry a name, `archived` and an optional `builtInKey`.
export class CatalogRepository extends BaseRepository {
  listActive(householdId) {
    return this.findMany(householdId, { archived: { $ne: true } })
  }

  listAll(householdId) {
    return this.findMany(householdId, {})
  }

  findById(householdId, id) {
    return this.findOne(householdId, { _id: this.toObjectId(id) })
  }

  findByBuiltInKeys(householdId) {
    return this.findMany(householdId, { builtInKey: { $type: 'string' } }, { projection: { builtInKey: 1 } })
  }

  // Active entries with this exact (already trimmed) name, ignoring `excludeId`.
  async findByName(householdId, name, excludeId = null) {
    const filter = { name, archived: { $ne: true } }
    if (excludeId) filter._id = { $ne: this.toObjectId(excludeId) }
    return this.findOne(householdId, filter)
  }

  archive(householdId, id, user) {
    return this.updateOne(householdId, id, { archived: true }, user)
  }

  restore(householdId, id, user) {
    return this.updateOne(householdId, id, { archived: false }, user)
  }

  remove(householdId, id) {
    return this.deleteOne(householdId, id)
  }
}
