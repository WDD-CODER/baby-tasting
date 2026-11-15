import { expect, test } from '@playwright/test'
import { addDaysIso, cell, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'
import { seedSuggestionWeek, tooLateInWeek } from './support/suggestions'

test('006-1: suggest a week and accept all turns the dashed tiles into planned ones', async ({
  page,
  request,
}) => {
  test.skip(tooLateInWeek(), 'needs Sunday–Thursday')
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  await seedSuggestionWeek(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'הצע לי שבוע' }).click()
  const today = todayIso()
  for (const offset of [1, 2]) {
    await expect(cell(page, addDaysIso(today, offset), 1).getByRole('button', { name: 'טחינה' })).toBeVisible()
  }
  await expect(page.locator('.cell[data-meal="2"] .suggested[aria-label="אגס"]')).toHaveCount(1)
  await expect(page.locator('.suggested')).toHaveCount(3)
  await page.screenshot({ path: 'e2e/screens/006-1.png' })
  await page.getByRole('button', { name: 'אשר הכול' }).click()
  await expect(page.locator('.suggested')).toHaveCount(0)
  await expect(cell(page, addDaysIso(today, 1), 1).locator('.tile')).toBeVisible()
  await expect(cell(page, addDaysIso(today, 2), 1).locator('.tile')).toBeVisible()
})
