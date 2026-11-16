import { expect, test } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('009-1: signing in with parent-a and its password opens / and shows the Tracker home', async ({
  page,
  context,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(5) })
  await context.clearCookies()

  await page.goto('/login')
  await page.getByLabel('שם משתמש').fill('parent-a')
  await page.getByLabel('סיסמה', { exact: true }).fill('test-pass-a')
  await page.getByRole('button', { name: 'כניסה' }).click()
  await page.waitForURL((url) => url.pathname === '/')
  await expect(page.getByText('יום חדש ורענן!')).toBeVisible()
  await page.screenshot({ path: 'e2e/screens/009-1.png' })
})
