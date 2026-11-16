import { BUILT_IN_ALLERGENS, BUILT_IN_FOODS } from './catalog.js'

const SEED_USER = 'system'

async function insertIgnoringDuplicate(repo, householdId, doc) {
  try {
    return await repo.insertOne(householdId, doc, SEED_USER)
  } catch (err) {
    // a concurrent first request already inserted it (unique householdId + builtInKey)
    if (err?.code === 11000) return null
    throw err
  }
}

async function builtInAllergenIds(repos, householdId) {
  const docs = await repos.allergens.findMany(householdId, { builtInKey: { $type: 'string' } })
  return new Map(docs.map((a) => [a.builtInKey, String(a._id)]))
}

// Insert-if-missing by builtInKey: never touches an existing document, so edits and archives stay.
export async function ensureCatalog(repos, householdId, babyId) {
  let allergenIds = await builtInAllergenIds(repos, householdId)
  let added = false
  for (const allergen of BUILT_IN_ALLERGENS) {
    if (allergenIds.has(allergen.key)) continue
    await insertIgnoringDuplicate(repos.allergens, householdId, {
      babyId,
      name: allergen.name,
      builtIn: true,
      builtInKey: allergen.key,
      archived: false,
    })
    added = true
  }
  if (added) allergenIds = await builtInAllergenIds(repos, householdId)

  const existing = await repos.foods.findMany(
    householdId,
    { builtInKey: { $type: 'string' } },
    { projection: { builtInKey: 1 } },
  )
  const have = new Set(existing.map((food) => food.builtInKey))
  for (const food of BUILT_IN_FOODS) {
    if (have.has(food.key)) continue
    await insertIgnoringDuplicate(repos.foods, householdId, {
      babyId,
      name: food.name,
      emoji: food.emoji,
      category: food.category,
      allergenId: food.allergenKey ? (allergenIds.get(food.allergenKey) ?? null) : null,
      warning: food.warning ? { text: food.warning.text, untilMonths: food.warning.untilMonths } : null,
      builtIn: true,
      builtInKey: food.key,
      archived: false,
    })
  }
}
