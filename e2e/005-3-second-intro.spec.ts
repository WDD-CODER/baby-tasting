import { expect, test } from '@playwright/test'
import { giveFood } from './support/allergens'
import { addDaysIso, addFood, cell, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('005-3: starting egg while sesame is introducing asks first', async ({ page, request }) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  await giveFood(page, 'טחינה', addDaysIso(today, -1))
  await page.goto('/')
  await addFood(page, today, 1, 'ביצה קשה')
  await expect(page.getByText('שומשום עדיין בחשיפה. להתחיל גם ביצה?')).toBeVisible()
  await page.screenshot({ path: 'e2e/screens/005-3.png' })
  await page.getByRole('button', { name: 'להתחיל' }).click()
  await expect(cell(page, today, 1).locator('.tile')).toBeVisible()
})
