import { expect, test } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('009-5: saving מאיה as parent A name on /settings shows מאיה in the top bar', async ({ page, request }) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(5) })
  await page.goto('/settings')
  const topBar = page.locator('header.shell__top')
  await expect(topBar).toContainText('אמא')
  const parentA = page.getByLabel('שם הורה א׳ (אמא כברירת מחדל)')
  await expect(parentA).toHaveValue('אמא')
  await parentA.fill('מאיה')
  await page.getByRole('button', { name: 'שמור הגדרות מערכת' }).click()
  await expect(page.getByText('ההגדרות עודכנו בהצלחה')).toBeVisible()
  await expect(topBar).toContainText('מאיה')
  await page.screenshot({ path: 'e2e/screens/009-5.png' })
})
