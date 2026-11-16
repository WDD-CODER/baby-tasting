import { HE } from '../i18n/he'
import { CalendarItem, Meal } from '../models/calendar-item'
import { Food } from '../models/food'

export type Refusal = 'duplicate_in_meal' | 'given_in_future' | 'food_locked'

/** Mirrors the server rules so a refusal shows before the call; the server stays the judge. */
export function refusalFor(opts: {
  food: Food | undefined
  items: CalendarItem[]
  date: string
  meal: Meal
  excludeId?: string
}): Refusal | null {
  const { food, items, date, meal, excludeId } = opts
  if (food?.locked) return 'food_locked'
  const clash = items.some(
    (it) => it.id !== excludeId && it.date === date && it.meal === meal && it.foodId === food?.id,
  )
  return clash ? 'duplicate_in_meal' : null
}

/** R4 / INV-6 (ADR 0016): an allergen food may be in any meal; outside meal 1 the page shows a soft note. */
export function isAllergenOutsideMeal1(food: Food | undefined, meal: Meal): boolean {
  return Boolean(food?.allergenId) && meal !== 1
}

export function refusalMessage(code: string, foodName = ''): string {
  const t = HE.calendar.errors
  if (code === 'food_locked') return t.foodLocked.replace('{food}', foodName).trim()
  if (code === 'duplicate_in_meal') return t.duplicate
  if (code === 'given_in_future') return t.givenInFuture
  return t.notSaved
}
