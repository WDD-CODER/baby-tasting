import { expect, test } from '@playwright/test'
import { addFood, cell, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('004-1: banana in meal 2 marked given with a taste shows ✓, and /foods shows נוסה · 1', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  await addFood(page, today, 2, 'בננה')
  const tile = cell(page, today, 2).locator('.tile')
  await expect(tile).toBeVisible()
  await tile.click()
  await page.getByRole('button', { name: 'ניתן', exact: true }).click()
  await page.getByRole('button', { name: 'טעימה' }).click()
  await page.getByRole('button', { name: 'סגירה' }).click()
  await expect(cell(page, today, 2).locator('.tile--given')).toContainText('✓')
  await page.screenshot({ path: 'e2e/screens/004-1.png' })
  await page.goto('/tasting/foods')
  await expect(page.getByRole('link', { name: /בננה/ })).toContainText('נוסה · 1')
})
