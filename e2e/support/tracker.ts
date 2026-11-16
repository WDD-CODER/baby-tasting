import { APIRequestContext, Page } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './session'

/** A signed-in household with a baby, on the Tracker home. */
export async function openLog(page: Page, request: APIRequestContext): Promise<void> {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(5) })
  await page.goto('/')
}

const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:3000'

/** Creates a Tracker event for the signed-in household (the page's session cookie is reused). */
export async function addEvent(page: Page, body: Record<string, unknown>): Promise<void> {
  const res = await page.request.post(`${API_URL}/api/v1/tracker/events`, { data: body })
  if (!res.ok()) throw new Error(`add event failed: ${res.status()}`)
}

/** Starts a sleep now through the API (the page's session cookie is reused). */
export async function startSleep(page: Page): Promise<void> {
  const res = await page.request.post(`${API_URL}/api/v1/tracker/sleep/toggle`, { data: {} })
  if (!res.ok()) throw new Error(`start sleep failed: ${res.status()}`)
}

/** A long press on a quick button (`meal`, `diaper`, `sleep`, `vomiting`): opens its full sheet. */
export async function holdQuick(page: Page, quick: string): Promise<void> {
  const button = page.locator(`[data-quick="${quick}"] button`)
  // centre it: the fixed bottom navigation covers the lowest buttons
  await button.evaluate((el) => el.scrollIntoView({ block: "center" }))
  const box = await button.boundingBox()
  if (!box) throw new Error(`no ${quick} button`)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(800)
  await page.mouse.up()
}

/** An ISO moment some hours ago. */
export function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600000).toISOString()
}
