import { expect, test } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('002-3: changing the baby name and going back asks about unsaved changes', async ({ page, request }) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(5) })
  await page.getByRole('link', { name: 'הגדרות' }).click()
  await expect(page).toHaveURL(/\/settings$/)
  await page.getByLabel('שם', { exact: true }).fill('מיה')
  await page.goBack()
  await expect(page.getByText('יש שינויים שלא נשמרו')).toBeVisible()
  await page.screenshot({ path: 'e2e/screens/002-3.png' })
})
