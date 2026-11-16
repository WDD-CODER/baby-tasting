import { Locator, Page } from '@playwright/test'

/** Today as YYYY-MM-DD in Asia/Jerusalem. */
export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** A week-view cell. The date must be inside the visible week. */
export function cell(page: Page, date: string, meal: number): Locator {
  return page.locator(`.cell[data-date="${date}"][data-meal="${meal}"]`)
}

/** Adds a food to a week-view cell through the add-food sheet. */
export async function addFood(page: Page, date: string, meal: number, name: string): Promise<void> {
  if (!new URL(page.url()).pathname.startsWith('/tasting')) await page.goto('/tasting')
  await cell(page, date, meal).locator('.cell__add').click()
  await page.getByLabel('חיפוש מזון').fill(name)
  await page.getByRole('button', { name: new RegExp(name) }).first().click()
}

/** Drags a tile onto another cell with the mouse (the mouse has no start delay). */
export async function dragTo(page: Page, source: Locator, target: Locator): Promise<void> {
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('drag: no bounding box')
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + from.height / 2 + 10, { steps: 4 })
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 })
  await page.mouse.up()
}
