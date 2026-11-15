import { expect, test } from '@playwright/test'
import { giveFood } from './support/allergens'
import { addDaysIso, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('008-2: banana detail lists each given date and הוספה ליומן preselects it', async ({ page, request }) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  await giveFood(page, 'בננה', addDaysIso(today, -1))
  await giveFood(page, 'בננה', today)
  await page.goto('/foods')
  await page.getByRole('link', { name: /בננה/ }).first().click()
  await expect(page.getByRole('heading', { name: 'בננה' })).toBeVisible()
  await expect(page.locator('.entry')).toHaveCount(2)
  await page.screenshot({ path: 'e2e/screens/008-2.png' })
  await page.getByRole('button', { name: 'הוספה ליומן' }).click()
  await page.waitForURL((url) => url.pathname === '/')
  await expect(page.getByText('מוצע')).toBeVisible()
})
