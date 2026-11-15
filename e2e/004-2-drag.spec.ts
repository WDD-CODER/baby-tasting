import { expect, test } from '@playwright/test'
import { addDaysIso, addFood, cell, dragTo, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('004-2: dragging an item from meal 2 of today to meal 3 of tomorrow survives a reload', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  // tomorrow can fall in the next week (when today is Saturday): the test needs both days visible
  test.skip(new Date(`${today}T00:00:00Z`).getUTCDay() === 6, 'tomorrow is in the next week')
  const tomorrow = addDaysIso(today, 1)
  await addFood(page, today, 2, 'בננה')
  await expect(cell(page, today, 2).locator('.tile')).toBeVisible()
  await dragTo(page, cell(page, today, 2).locator('.tile'), cell(page, tomorrow, 3))
  await expect(cell(page, tomorrow, 3).locator('.tile')).toBeVisible()
  await page.reload()
  await expect(cell(page, tomorrow, 3).locator('.tile')).toBeVisible()
  await expect(cell(page, today, 2).locator('.tile')).toHaveCount(0)
  await page.screenshot({ path: 'e2e/screens/004-2.png' })
})
