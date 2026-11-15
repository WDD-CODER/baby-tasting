import { expect, test } from '@playwright/test'
import { cell, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('004-4: adding דבש to an 8-month-old shows the warning before the item is added', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  await cell(page, today, 2).locator('.cell__add').click()
  await page.getByLabel('חיפוש מזון').fill('דבש')
  await page.getByRole('button', { name: /דבש/ }).first().click()
  await expect(page.getByText('אסור לפני גיל שנה')).toBeVisible()
  await expect(cell(page, today, 2).locator('.tile')).toHaveCount(0)
  await page.screenshot({ path: 'e2e/screens/004-4.png' })
})
