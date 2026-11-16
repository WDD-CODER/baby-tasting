import { Page } from '@playwright/test'

const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:3000'

interface FoodRow {
  id: string
  name: string
}

/** Creates a `given` item in meal 1 through the API (the page's request context carries the session). */
export async function giveFood(page: Page, foodName: string, date: string): Promise<void> {
  const foods = await page.request.get(`${API_URL}/api/v1/foods`)
  const list = ((await foods.json()) as { foods: FoodRow[] }).foods
  const food = list.find((f) => f.name === foodName)
  if (!food) throw new Error(`food not found: ${foodName}`)
  const res = await page.request.post(`${API_URL}/api/v1/calendar`, {
    data: { date, meal: 1, foodId: food.id, status: 'given' },
  })
  if (!res.ok()) throw new Error(`give failed: ${res.status()}`)
}
