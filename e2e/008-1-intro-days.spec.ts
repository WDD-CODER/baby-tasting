import { expect, test } from '@playwright/test'
import { giveFood } from './support/allergens'
import { addDaysIso, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('008-1: changing introDays from 3 to 4 turns 3/3 into 3/4 and בחשיפה', async ({ page, request }) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  for (const back of [2, 1, 0]) await giveFood(page, 'טחינה', addDaysIso(today, -back))
  await page.goto('/allergens')
  await expect(page.locator('li', { hasText: 'שומשום' }).first()).toContainText('3/3')
  await page.goto('/settings')
  await page.getByLabel('ימי חשיפה').fill('4')
  await page.getByRole('button', { name: 'שמירה', exact: true }).last().click()
  await page.goto('/allergens')
  const card = page.locator('li', { hasText: 'שומשום' }).first()
  await expect(card).toContainText('3/4')
  await expect(card).toContainText('בחשיפה')
  await page.screenshot({ path: 'e2e/screens/008-1.png' })
})
