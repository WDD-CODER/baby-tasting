// Progress summary of the foods page (pure, no I/O): tried foods overall and per category, allergens per state.
export const ALLERGEN_STATES = Object.freeze(['not_started', 'introducing', 'maintenance', 'finished', 'locked'])

// `foods`: [{ id, category, archived }]; `statuses`: { [foodId]: { tried } }; `allergenStates`: state strings.
export function summarize({ foods, statuses, allergenStates }) {
  const active = foods.filter((f) => f.archived !== true)
  const byCat = new Map()
  let tried = 0
  for (const food of active) {
    const isTried = statuses?.[food.id]?.tried === true
    if (isTried) tried += 1
    const cat = byCat.get(food.category) ?? { category: food.category, tried: 0, total: 0 }
    cat.total += 1
    if (isTried) cat.tried += 1
    byCat.set(food.category, cat)
  }
  const allergensByState = Object.fromEntries(ALLERGEN_STATES.map((s) => [s, 0]))
  for (const state of allergenStates ?? []) {
    if (state in allergensByState) allergensByState[state] += 1
  }
  return { tried, total: active.length, byCategory: [...byCat.values()], allergensByState }
}
