import { expect, test } from '@playwright/test'
import { addFood, cell, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('021-1: כל הארוחה ניתנה (3) marks all three tiles of the meal with ✓', async ({ page, request }) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  for (const name of ['בננה', 'אגס', 'אבוקדו']) await addFood(page, today, 2, name)
  const tiles = cell(page, today, 2).locator('.tile')
  await expect(tiles).toHaveCount(3)
  await tiles.first().click()
  await page.getByRole('button', { name: 'כל הארוחה ניתנה (3)' }).click()
  await expect(cell(page, today, 2).locator('.tile--given')).toHaveCount(3)
  await expect(cell(page, today, 2).locator('.tile--given').first()).toContainText('✓')
  await page.screenshot({ path: 'e2e/screens/021-1.png' })
})
