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
  await page.goto('/tasting/allergens')
  await expect(page.locator('li', { hasText: 'שומשום' }).first()).toContainText('3/3')
  await page.goto('/settings')
  // the rules form sits below the Tracker settings: save it and wait for the save before leaving the page
  const rules = page.locator('app-rules-form')
  await rules.getByLabel('ימי חשיפה', { exact: true }).fill('4')
  await rules.getByRole('button', { name: 'שמירה', exact: true }).click()
  await expect(page.getByText('נשמר', { exact: true }).first()).toBeVisible()
  await page.goto('/tasting/allergens')
  const card = page.locator('li', { hasText: 'שומשום' }).first()
  await expect(card).toContainText('3/4')
  await expect(card).toContainText('בחשיפה')
  await page.screenshot({ path: 'screens/008-1.png' })
})
