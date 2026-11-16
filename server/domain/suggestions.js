// Week suggestions (pure): which queued food and allergen on which day. No I/O, no clock — `today` is an argument.
// Input shapes:
//   engine     { allergens: [{ allergenId, state, intro: { daysGiven, required } }] } (the allergen engine output)
//   foods      [{ id, name, allergenId, archived, tried, lastGivenDate }]
//   allergens  [{ id, name, archived }]
//   queue      food ids in tasting-queue order
//   weekItems  [{ date, meal, foodId, status }] of the visible week
//   settings   withDefaults() values
import { isoAddDays } from './dates.js'

const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

// Candidate indices spread evenly over `count` slots.
function spreadPick(list, need) {
  if (need <= 0 || list.length === 0) return []
  if (need >= list.length) return [...list]
  const out = []
  for (let i = 0; i < need; i++) out.push(list[Math.floor(((i + 0.5) * list.length) / need)])
  return out
}

export function suggestWeek({
  engine,
  foods,
  allergens = [],
  queue = [],
  weekItems = [],
  settings,
  weekStart,
  today,
  lockedFoodIds = [],
  lockedAllergenIds = [],
}) {
  // D-017-6: with an empty tasting queue, untried non-archived foods in catalog order stand in for it.
  if (queue.length === 0) queue = foods.filter((f) => !f.archived && !f.tried).map((f) => f.id)
  const weekDays = []
  for (let i = 0; i < 7; i++) weekDays.push(isoAddDays(weekStart, i))
  const weekEnd = weekDays[6]
  const firstDay = today > weekStart ? today : weekStart
  const openDays = weekDays.filter((d) => d >= firstDay)
  if (openDays.length === 0) return []

  const foodById = new Map(foods.map((f) => [f.id, f]))
  const allergenById = new Map(allergens.map((a) => [a.id, a]))
  const lockedFoods = new Set(lockedFoodIds)
  const lockedAllergens = new Set(lockedAllergenIds)
  const eligible = (food) =>
    !!food &&
    !food.archived &&
    !lockedFoods.has(food.id) &&
    !(food.allergenId && (lockedAllergens.has(food.allergenId) || allergenById.get(food.allergenId)?.archived))

  const stateOf = new Map((engine?.allergens ?? []).map((e) => [e.allergenId, e]))
  const entries = [...(engine?.allergens ?? [])].sort((a, b) => byText(a.allergenId, b.allergenId))

  const inWeek = weekItems.filter((it) => it.date >= weekStart && it.date <= weekEnd)
  const onDay = new Map(weekDays.map((d) => [d, new Set()])) // food ids on the day, any status
  const meal1Allergens = new Map(weekDays.map((d) => [d, new Set()])) // allergens in meal 1 (not skipped)
  const allergenDays = new Map() // allergenId → days with a given/planned item
  const plannedAllergenDays = new Map() // allergenId → days (>= firstDay) with a planned item
  const introDays = new Set()
  const newFoodDays = new Set()
  const plannedNewFoods = new Set()
  for (const it of inWeek) {
    onDay.get(it.date)?.add(it.foodId)
    if (it.status === 'skipped') continue
    const food = foodById.get(it.foodId)
    if (!food) continue
    if (food.allergenId) {
      if (it.meal === 1) meal1Allergens.get(it.date)?.add(food.allergenId)
      if (!allergenDays.has(food.allergenId)) allergenDays.set(food.allergenId, new Set())
      allergenDays.get(food.allergenId).add(it.date)
      if (it.status === 'planned' && it.date >= firstDay) {
        if (!plannedAllergenDays.has(food.allergenId)) plannedAllergenDays.set(food.allergenId, new Set())
        plannedAllergenDays.get(food.allergenId).add(it.date)
      }
      if (stateOf.get(food.allergenId)?.state === 'introducing') introDays.add(it.date)
    } else if (!food.tried) {
      newFoodDays.add(it.date)
      if (it.status === 'planned') plannedNewFoods.add(food.id)
    }
  }

  const out = []
  const add = (date, meal, food, reason) => {
    out.push({ date, meal, foodId: food.id, reason })
    onDay.get(date).add(food.id)
    if (food.allergenId && meal === 1) {
      meal1Allergens.get(date).add(food.allergenId)
      if (!allergenDays.has(food.allergenId)) allergenDays.set(food.allergenId, new Set())
      allergenDays.get(food.allergenId).add(date)
    }
  }

  // The most recently given eligible food of an allergen (then by id, so the result is stable).
  const foodOfAllergen = (allergenId) =>
    foods
      .filter((f) => f.allergenId === allergenId && eligible(f))
      .sort((a, b) => byText(b.lastGivenDate ?? '', a.lastGivenDate ?? '') || byText(a.id, b.id))[0] ?? null

  const allergenOk = (allergenId) => {
    const a = allergenById.get(allergenId)
    return !!a && !a.archived && !lockedAllergens.has(allergenId)
  }

  // Rule 1: finish the introduction of each introducing allergen on consecutive days.
  const introducing = entries
    .filter((e) => e.state === 'introducing' && allergenOk(e.allergenId))
    .sort((a, b) => byText(a.intro.firstDay ?? '', b.intro.firstDay ?? '') || byText(a.allergenId, b.allergenId))
  for (const entry of introducing) {
    const food = foodOfAllergen(entry.allergenId)
    if (!food) continue
    const planned = plannedAllergenDays.get(entry.allergenId)?.size ?? 0
    const have = entry.intro.daysGiven + planned
    const remaining = entry.intro.required - have
    let placed = 0
    for (const day of openDays) {
      if (placed >= remaining) break
      if (allergenDays.get(entry.allergenId)?.has(day) || onDay.get(day).has(food.id)) continue
      placed += 1
      add(day, 1, food, {
        kind: 'intro',
        allergenId: entry.allergenId,
        n: have + placed,
        total: entry.intro.required,
      })
      introDays.add(day)
    }
  }

  // Rule 3: start the next allergen from a queued allergen food when none is introducing.
  const anyIntroducing = entries.some((e) => e.state === 'introducing')
  const startPending = entries.some((e) => e.state === 'not_started' && (plannedAllergenDays.get(e.allergenId)?.size ?? 0) > 0)
  if (!anyIntroducing && !startPending) {
    const startFood = queue
      .map((id) => foodById.get(id))
      .find((f) => f?.allergenId && stateOf.get(f.allergenId)?.state === 'not_started' && eligible(f) && allergenOk(f.allergenId))
    if (startFood) {
      const total = stateOf.get(startFood.allergenId).intro.required
      for (let i = 0; i + total <= openDays.length; i++) {
        const run = openDays.slice(i, i + total)
        const consecutive = run.every((d, k) => d === isoAddDays(run[0], k))
        if (!consecutive || !run.every((d) => meal1Allergens.get(d).size === 0 && !onDay.get(d).has(startFood.id))) continue
        run.forEach((day, k) => {
          add(day, 1, startFood, { kind: 'start', allergenId: startFood.allergenId, n: k + 1, total })
          introDays.add(day)
        })
        break
      }
    }
  }

  // Rule 2: bring each maintenance allergen to its weekly target, spread over the week.
  const cap = settings.maxAllergensPerMeal
  for (const entry of entries) {
    if (entry.state !== 'maintenance' || !allergenOk(entry.allergenId)) continue
    const food = foodOfAllergen(entry.allergenId)
    if (!food) continue
    const have = allergenDays.get(entry.allergenId)?.size ?? 0
    const need = settings.maintenancePerWeek - have
    if (need <= 0) continue
    const free = openDays.filter((d) => !allergenDays.get(entry.allergenId)?.has(d) && !onDay.get(d).has(food.id))
    const tiers = [
      free.filter((d) => !introDays.has(d) && meal1Allergens.get(d).size < cap),
      free.filter((d) => meal1Allergens.get(d).size < cap),
      free,
    ]
    const pool = tiers.find((t) => t.length >= need) ?? free
    const picked = spreadPick(pool, need)
    const total = settings.maintenancePerWeek
    picked.forEach((day, k) => {
      add(day, 1, food, { kind: 'maintenance', allergenId: entry.allergenId, x: have + k + 1, y: total })
    })
  }

  // Rule 4: queued regular foods never tried, one per day in meal 2.
  const budget = Math.max(0, settings.newFoodsPerWeek - plannedNewFoods.size)
  if (budget > 0) {
    const inWeekFoods = new Set(inWeek.map((it) => it.foodId))
    const candidates = queue
      .map((id) => foodById.get(id))
      .filter((f) => f && !f.allergenId && !f.tried && eligible(f) && !inWeekFoods.has(f.id))
      .slice(0, budget)
    const days = spreadPick(
      openDays.filter((d) => !newFoodDays.has(d)),
      candidates.length,
    )
    candidates.slice(0, days.length).forEach((food, k) => {
      add(days[k], 2, food, { kind: 'new_food' })
    })
  }

  return out.sort((a, b) => byText(a.date, b.date) || a.meal - b.meal || byText(a.foodId, b.foodId))
}

// Why a week got no suggestions (the route sends it as `reason`): 'no_open_days' when the whole week is already
// past, otherwise 'nothing_to_suggest' (no untried food and no allergen to start or keep up).
export function noSuggestionsReason({ weekStart, today }) {
  return isoAddDays(weekStart, 6) < today ? 'no_open_days' : 'nothing_to_suggest'
}
