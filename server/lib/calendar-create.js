// Creating a calendar item with every placement rule: shared by the calendar route and suggestion accept.
import { checkDuplicate, checkStatus } from '../domain/calendar-rules.js'
import { isRealDate } from '../domain/dates.js'
import { isPlacementLocked } from '../domain/locks.js'
import { HttpError } from './http-error.js'
import { getLockedIds } from './locks.js'

export const STATUSES = ['planned', 'given', 'skipped']

export const invalid = (message) => new HttpError(400, 'invalid', message)

export function parseMeal(value) {
  if (!Number.isInteger(value) || value < 1 || value > 3) throw invalid('meal must be 1, 2 or 3')
  return value
}

export function parseDate(value) {
  if (!isRealDate(value)) throw invalid('date must be a real YYYY-MM-DD date')
  return value
}

export function refusal(code) {
  if (code === 'food_locked') return new HttpError(409, code, 'This food is locked after a reaction')
  if (code === 'given_in_future') return new HttpError(422, code, 'A future date cannot be marked given')
  return new HttpError(409, code, 'This food is already in this meal')
}

export async function isFoodLocked(repos, householdId, food) {
  const ids = await getLockedIds(repos, householdId)
  return isPlacementLocked({ food: { id: String(food._id), allergenId: food.allergenId ?? null }, ...ids })
}

// Validates `{ date, meal, foodId, status? }` and saves it; throws an HttpError when refused.
export async function createCalendarItem({ repos, householdId, babyId, user, input, today }) {
  const date = parseDate(input?.date)
  const meal = parseMeal(input?.meal)
  const status = input?.status ?? 'planned'
  if (!STATUSES.includes(status)) throw invalid('Unknown status')
  if (typeof input?.foodId !== 'string') throw invalid('foodId is required')
  const food = await repos.foods.findById(householdId, input.foodId)
  if (!food || food.archived) throw invalid('Unknown food')
  if (await isFoodLocked(repos, householdId, food)) throw refusal('food_locked')
  const future = checkStatus({ status, date, today })
  if (future) throw refusal(future)
  const day = await repos.calendarItems.listForDay(householdId, date)
  const dup = checkDuplicate({ items: day, date, meal, foodId: input.foodId })
  if (dup) throw refusal(dup)
  return repos.calendarItems.create(
    householdId,
    {
      babyId,
      date,
      meal,
      foodId: input.foodId,
      status,
      amount: null,
      note: '',
      liked: null,
      givenBy: status === 'given' ? user : null,
      givenAt: status === 'given' ? new Date() : null,
    },
    user,
  )
}
