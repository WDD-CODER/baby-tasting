import { APIRequestContext, Page } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './session'

/** A signed-in household with a baby, on the Tracker home. */
export async function openLog(page: Page, request: APIRequestContext): Promise<void> {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(5) })
  await page.goto('/')
}
