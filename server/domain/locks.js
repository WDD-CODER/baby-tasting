// Locks (R7, pure): which foods and allergens a reaction locks, placement refusal and the alerts of locked foods.

// `food` is `{ id, allergenId }`.
export function isPlacementLocked({ food, lockedFoodIds = [], lockedAllergenIds = [] }) {
  if (!food) return false
  if (lockedFoodIds.includes(food.id)) return true
  return !!food.allergenId && lockedAllergenIds.includes(food.allergenId)
}

// `items` = every given item that shares date and meal with any related item; `foods` are `{ id, allergenId }`.
// Each allergen of those foods is locked; each food without an allergen is locked itself.
export function locksForReaction({ items, foods }) {
  const foodById = new Map(foods.map((f) => [f.id, f]))
  const allergenIds = new Set()
  const foodIds = new Set()
  for (const item of items) {
    const food = foodById.get(item.foodId)
    if (!food) continue
    if (food.allergenId) allergenIds.add(food.allergenId)
    else foodIds.add(food.id)
  }
  return { allergenIds: [...allergenIds], foodIds: [...foodIds] }
}

// Planned items dated from `today` on whose food is `foodId`, or whose allergen is `allergenId`.
export function plannedCount({ items, foods, today, foodId = null, allergenId = null }) {
  const foodById = new Map(foods.map((f) => [f.id, f]))
  return items.filter((it) => {
    if (it.status !== 'planned' || it.date < today) return false
    if (foodId) return it.foodId === foodId
    return !!allergenId && foodById.get(it.foodId)?.allergenId === allergenId
  }).length
}

// One `locked` alert per locked regular food (allergen locks are alerted by the engine).
export function foodLockAlerts({ locks, items, foods, today }) {
  const foodById = new Map(foods.map((f) => [f.id, f]))
  return locks
    .filter((l) => l.targetType === 'food' && foodById.has(l.targetId))
    .map((l) => ({
      id: 'locked-food:' + l.targetId,
      kind: 'locked',
      foodId: l.targetId,
      targetName: foodById.get(l.targetId).name,
      plannedCount: plannedCount({ items, foods, today, foodId: l.targetId }),
    }))
}
