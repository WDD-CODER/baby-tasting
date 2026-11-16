import { expect, test } from '@playwright/test'
import { giveFood } from './support/allergens'
import { addDaysIso, cell, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('005-2: tapping the alert opens the add-food sheet with טחינה preselected for today, meal 1', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  await giveFood(page, 'טחינה', addDaysIso(today, -3))
  await giveFood(page, 'טחינה', addDaysIso(today, -1))
  await page.goto('/')
  await page.getByText('חסר יום ברצף — כדאי לתת היום שומשום').click()
  const suggested = page.locator('.food--preselected')
  await expect(suggested).toContainText('טחינה')
  await page.screenshot({ path: 'e2e/screens/005-2.png' })
  await suggested.click()
  await expect(cell(page, today, 1).locator('.tile')).toBeVisible()
})
