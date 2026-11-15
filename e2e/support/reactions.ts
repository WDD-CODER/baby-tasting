import { Page } from '@playwright/test'

const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:3000'

interface NamedId {
  id: string
  name: string
}

/** Gives a food in meal 1 and records a reaction on it through the API, which locks the meal's foods. */
export async function lockThroughReaction(page: Page, foodName: string, date: string): Promise<void> {
  const foods = await page.request.get(`${API_URL}/api/v1/foods`)
  const food = ((await foods.json()) as { foods: NamedId[] }).foods.find((f) => f.name === foodName)
  if (!food) throw new Error(`food not found: ${foodName}`)
  const item = await page.request.post(`${API_URL}/api/v1/calendar`, {
    data: { date, meal: 1, foodId: food.id, status: 'given' },
  })
  if (!item.ok()) throw new Error(`give failed: ${item.status()}`)
  const itemId = ((await item.json()) as { item: { id: string } }).item.id
  const reaction = await page.request.post(`${API_URL}/api/v1/reactions`, {
    data: { noticedAt: new Date().toISOString(), itemIds: [itemId], symptoms: ['rash'], severity: 'mild' },
  })
  if (!reaction.ok()) throw new Error(`reaction failed: ${reaction.status()}`)
}
