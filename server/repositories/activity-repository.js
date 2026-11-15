import {
  allergenSummary,
  babySummary,
  calendarSummary,
  foodSummary,
  lockSummary,
  reactionSummary,
  settingsSummary,
} from '../lib/activity-summary.js'

const entry = (doc, summary) => ({
  at: new Date(doc.updatedAt ?? doc.createdAt).toISOString(),
  user: doc.updatedBy ?? doc.createdBy ?? null,
  kind: summary.kind,
  summary,
})

// Reads the audit fields already on every household document (latest state per document).
export class ActivityRepository {
  constructor(db) {
    this.db = db
  }

  async latest(householdId, limit = 100) {
    const find = (name) =>
      this.db
        .collection(name)
        .find({ householdId, updatedAt: { $type: 'date' }, updatedBy: { $nin: ['system', null] } })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .toArray()
    const names = (name) => this.db.collection(name).find({ householdId }, { projection: { name: 1 } }).toArray()
    const [items, foods, allergens, reactions, locks, babies, settings, allFoods, allAllergens] = await Promise.all([
      find('calendarItems'),
      find('foods'),
      find('allergens'),
      find('reactions'),
      find('locks'),
      find('babies'),
      find('settings'),
      names('foods'),
      names('allergens'),
    ])
    const foodNames = new Map(allFoods.map((f) => [String(f._id), f.name]))
    const allergenNames = new Map(allAllergens.map((a) => [String(a._id), a.name]))
    const all = [
      ...items.map((d) => entry(d, calendarSummary(d, foodNames.get(d.foodId) ?? ''))),
      ...foods.map((d) => entry(d, foodSummary(d))),
      ...allergens.map((d) => entry(d, allergenSummary(d))),
      ...reactions.map((d) => entry(d, reactionSummary())),
      ...locks.map((d) =>
        entry(d, lockSummary(d, (d.targetType === 'food' ? foodNames : allergenNames).get(d.targetId) ?? '')),
      ),
      ...babies.map((d) => entry(d, babySummary())),
      ...settings.map((d) => entry(d, settingsSummary())),
    ]
    return all.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, limit)
  }
}
