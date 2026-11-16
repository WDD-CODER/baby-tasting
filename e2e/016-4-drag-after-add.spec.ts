import { expect, test } from '@playwright/test'
import { addDaysIso, cell, dragTo, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('016-4: dragging a tile right after adding it keeps it (no disappearing tile)', async ({ page, request }) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  test.skip(new Date(`${today}T00:00:00Z`).getUTCDay() === 6, 'tomorrow is in the next week')
  const tomorrow = addDaysIso(today, 1)
  await page.goto('/tasting')
  await cell(page, today, 2).locator('.cell__add').click()
  await page.getByLabel('חיפוש מזון').fill('בננה')
  // no wait for the server here: the drag starts while the add is still being confirmed
  await page.getByRole('button', { name: /בננה/ }).first().click()
  await page.getByRole('button', { name: 'הוספה (1)' }).click()
  await expect(cell(page, today, 2).locator('.tile')).toBeVisible()
  await page.evaluate(() => window.scrollBy(0, 300))
  await dragTo(page, cell(page, today, 2).locator('.tile'), cell(page, tomorrow, 3))

  await page.waitForLoadState('networkidle')
  await expect(page.locator('.cell .tile')).toHaveCount(1)
  await page.screenshot({ path: 'screens/016-4.png' })
  await page.reload()
  await expect(page.locator('.cell .tile')).toHaveCount(1)
})
