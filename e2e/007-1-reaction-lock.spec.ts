import { expect, test } from '@playwright/test'
import { giveFood } from './support/allergens'
import { cell, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('007-1: a reaction from a given hard-boiled egg is listed and locks egg', async ({ page, request }) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  await giveFood(page, 'ביצה קשה', today)
  await page.goto('/')
  await cell(page, today, 1).locator('.tile').click()
  await page.getByRole('button', { name: 'תגובה', exact: true }).click()
  await page.getByRole('button', { name: 'פריחה', exact: true }).click()
  await page.getByRole('button', { name: 'קל', exact: true }).click()
  await page.locator('textarea').fill('פריחה על הלחי')
  await page.getByRole('button', { name: 'שמירה', exact: true }).click()
  await page.waitForURL((url) => url.pathname === '/allergens/reactions')
  await expect(page.getByText('פריחה על הלחי').or(page.getByText('פריחה').first())).toBeVisible()
  await page.goto('/allergens')
  await expect(page.locator('li', { hasText: 'ביצה' }).filter({ hasText: 'נעול' }).first()).toBeVisible()
  await page.screenshot({ path: 'e2e/screens/007-1.png' })
})
