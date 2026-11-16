import { expect, test } from '@playwright/test'
import { addFood, cell, dragTo, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('015-4: dragging an allergen food from meal 1 to meal 3 keeps it there after a reload and shows the note', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  await addFood(page, today, 1, 'טחינה')
  await expect(cell(page, today, 1).locator('.tile')).toBeVisible()
  // the fixed bottom navigation covers the lowest rows: scroll them clear first
  await page.evaluate(() => window.scrollBy(0, 300))
  await dragTo(page, cell(page, today, 1).locator('.tile'), cell(page, today, 3))
  await expect(page.getByText('שימו לב: אלרגן מחוץ לארוחה הראשונה')).toBeVisible()
  await expect(cell(page, today, 3).locator('.tile')).toBeVisible()
  await page.screenshot({ path: 'screens/015-4.png' })
  await page.reload()
  await expect(cell(page, today, 3).locator('.tile')).toBeVisible()
  await expect(cell(page, today, 1).locator('.tile')).toHaveCount(0)
})
