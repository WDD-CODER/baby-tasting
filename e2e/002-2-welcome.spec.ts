import { expect, test } from '@playwright/test'
import { monthsAgo, resetHousehold, signIn } from './support/session'

test('002-2: with no baby, sign-in shows /welcome and saving shows the baby in the top bar', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await expect(page).toHaveURL(/\/welcome$/)
  await page.getByLabel('שם', { exact: true }).fill('נועה')
  await page.getByLabel('תאריך לידה').fill(monthsAgo(5))
  await page.getByRole('button', { name: 'שמירה' }).click()
  await expect(page.locator('.shell__baby')).toContainText('נועה')
  await expect(page.locator('.shell__baby')).toContainText('5 חודשים')
  await page.screenshot({ path: 'e2e/screens/002-2.png' })
})
