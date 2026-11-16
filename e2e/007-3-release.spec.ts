import { expect, test } from '@playwright/test'
import { addFood, cell, todayIso } from './support/calendar'
import { lockThroughReaction } from './support/reactions'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('007-3: releasing egg asks first, then the omelette can be added', async ({ page, request }) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  await lockThroughReaction(page, 'ביצה קשה', today)
  await page.goto('/tasting/allergens')
  await page.locator('li', { hasText: 'ביצה' }).getByRole('button', { name: 'שחרור' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('לשחרר את ביצה? ודאו שהתייעצתם עם רופא/ה')
  await dialog.getByRole('button', { name: 'שחרור' }).click()
  await expect(page.locator('li', { hasText: 'ביצה' }).filter({ hasText: 'נעול' })).toHaveCount(0)
  await page.goto('/tasting')
  await addFood(page, today, 1, 'חביתה')
  await expect(cell(page, today, 1).locator('.tile[aria-label="חביתה"]')).toBeVisible()
  await page.screenshot({ path: 'e2e/screens/007-3.png' })
})
