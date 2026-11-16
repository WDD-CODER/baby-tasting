import { Page } from '@playwright/test'
import { giveFood } from './allergens'
import { addDaysIso, todayIso } from './calendar'

const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:3000'

/** Day of the week of an ISO date, Sunday = 0. */
export function weekdayOf(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay()
}

/** True when fewer than two days are left in this week after today (Friday or Saturday). */
export function tooLateInWeek(): boolean {
  return weekdayOf(todayIso()) >= 5
}

/** Puts a food in the tasting queue through the API. */
export async function queueFood(page: Page, foodName: string): Promise<void> {
  const foods = await page.request.get(`${API_URL}/api/v1/foods`)
  const list = ((await foods.json()) as { foods: { id: string; name: string }[] }).foods
  const food = list.find((f) => f.name === foodName)
  if (!food) throw new Error(`food not found: ${foodName}`)
  const res = await page.request.post(`${API_URL}/api/v1/foods/${food.id}/queue`, { data: { queued: true } })
  if (!res.ok()) throw new Error(`queue failed: ${res.status()}`)
}

/** Sesame at 1/3 (given today) and a pear in the queue. */
export async function seedSuggestionWeek(page: Page): Promise<void> {
  await giveFood(page, 'טחינה', todayIso())
  await queueFood(page, 'אגס')
}

export { addDaysIso, todayIso }
