import { APIRequestContext, Page } from '@playwright/test'

const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:3000'

/** Empties the end-to-end database (the backend must run with E2E_RESET=1). Sessions are cleared too: sign in again. */
export async function resetHousehold(request: APIRequestContext): Promise<void> {
  const res = await request.post(`${API_URL}/api/v1/test/reset`)
  if (!res.ok()) throw new Error(`test reset failed: ${res.status()}`)
}

/** Signs in through the sign-in page; the slots' APP_USERS hold parent-a / test-pass-a and parent-b / test-pass-b. */
export async function signIn(
  page: Page,
  username = process.env['E2E_USERNAME'] ?? 'parent-a',
  password = 'test-pass-a',
): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('שם משתמש').fill(username)
  await page.getByLabel('סיסמה', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'כניסה' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}

/** Saves the baby on the first-run page, or in Settings when a baby already exists. */
export async function ensureBaby(page: Page, baby: { name: string; birthDate: string }): Promise<void> {
  await page.goto('/welcome')
  await page.getByLabel('שם', { exact: true }).fill(baby.name)
  await page.getByLabel('תאריך לידה').fill(baby.birthDate)
  await page.getByRole('button', { name: 'שמירה' }).click()
  await page.waitForURL((url) => url.pathname === '/')
}

/** YYYY-MM-DD for a date some months ago. */
export function monthsAgo(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}
