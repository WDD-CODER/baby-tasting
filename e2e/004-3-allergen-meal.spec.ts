import { expect, test } from '@playwright/test'
import { addFood, cell, dragTo, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('004-3: dragging טחינה from meal 1 to meal 2 returns it and shows the allergen message', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  await addFood(page, today, 1, 'טחינה')
  await expect(cell(page, today, 1).locator('.tile')).toBeVisible()
  await dragTo(page, cell(page, today, 1).locator('.tile'), cell(page, today, 2))
  await expect(page.getByText('אלרגן ניתן בארוחה הראשונה')).toBeVisible()
  await expect(cell(page, today, 1).locator('.tile')).toBeVisible()
  await expect(cell(page, today, 2).locator('.tile')).toHaveCount(0)
  await page.screenshot({ path: 'e2e/screens/004-3.png' })
})
