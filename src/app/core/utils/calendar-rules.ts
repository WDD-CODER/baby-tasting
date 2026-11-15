import { HE } from '../i18n/he'
import { CalendarItem, Meal } from '../models/calendar-item'
import { Food } from '../models/food'

export type Refusal = 'allergen_meal_1' | 'duplicate_in_meal' | 'given_in_future'

/** Mirrors the server rules so a refusal shows before the call; the server stays the judge. */
export function refusalFor(opts: {
  food: Food | undefined
  items: CalendarItem[]
  date: string
  meal: Meal
  excludeId?: string
}): Refusal | null {
  const { food, items, date, meal, excludeId } = opts
  if (food?.allergenId && meal !== 1) return 'allergen_meal_1'
  const clash = items.some(
    (it) => it.id !== excludeId && it.date === date && it.meal === meal && it.foodId === food?.id,
  )
  return clash ? 'duplicate_in_meal' : null
}

export function refusalMessage(code: string): string {
  const t = HE.calendar.errors
  if (code === 'allergen_meal_1') return t.allergenMeal1
  if (code === 'duplicate_in_meal') return t.duplicate
  if (code === 'given_in_future') return t.givenInFuture
  return t.notSaved
}
