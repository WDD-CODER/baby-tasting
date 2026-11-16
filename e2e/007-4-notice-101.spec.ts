import { expect, test } from '@playwright/test'
import { giveFood } from './support/allergens'
import { cell, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('007-4: choosing breathing difficulty shows the 101 notice', async ({ page, request }) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  await giveFood(page, 'ביצה קשה', today)
  await page.goto('/')
  await cell(page, today, 1).locator('.tile').click()
  await page.getByRole('button', { name: 'תגובה', exact: true }).click()
  const notice = 'במקרה של קושי בנשימה או החמרה מהירה — התקשרו 101'
  await expect(page.getByText(notice)).toHaveCount(0)
  await page.getByRole('button', { name: 'קושי בנשימה', exact: true }).click()
  await expect(page.getByText(notice)).toBeVisible()
  await page.screenshot({ path: 'e2e/screens/007-4.png' })
})
