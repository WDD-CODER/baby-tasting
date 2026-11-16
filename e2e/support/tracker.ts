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

/** An ISO moment some hours ago. */
export function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600000).toISOString()
}
