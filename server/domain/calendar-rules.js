// Calendar rules (INV-1, R4, R9): pure functions; "today" is always an argument.

export function checkPlacement({ food, meal }) {
  if (food?.allergenId && meal !== 1) return 'allergen_meal_1'
  return null
}

export function checkDuplicate({ items, date, meal, foodId, excludeId = null }) {
  const clash = items.some(
    (it) =>
      it.date === date &&
      it.meal === meal &&
      String(it.foodId) === String(foodId) &&
      (excludeId === null || String(it._id ?? it.id) !== String(excludeId)),
  )
  return clash ? 'duplicate_in_meal' : null
}

export function checkStatus({ status, date, today }) {
  if (status === 'given' && date > today) return 'given_in_future'
  return null
}

// Only `given` items count. `liked` is the latest given item's non-null mark.
export function deriveFoodStatus(items) {
  const given = items
    .filter((it) => it.status === 'given')
    .sort((a, b) => (a.date === b.date ? a.meal - b.meal : a.date < b.date ? -1 : 1))
  const map = {}
  for (const it of given) {
    const key = String(it.foodId)
    const cur = map[key] ?? { tried: true, firstDate: it.date, timesGiven: 0, liked: null }
    cur.timesGiven += 1
    if (it.date < cur.firstDate) cur.firstDate = it.date
    if (it.liked === true || it.liked === false) cur.liked = it.liked
    map[key] = cur
  }
  return map
}
