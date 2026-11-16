import { expect, test } from '@playwright/test'
import { cell, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('017-1: a food not found opens the new-food form with the typed name and is added to the meal after saving', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  await page.goto('/tasting')
  const today = todayIso()
  await cell(page, today, 2).locator('.cell__add').click()
  await page.getByLabel('חיפוש מזון').fill('קישוא')
  await page.getByRole('button', { name: 'הוספת "קישוא" כמזון חדש' }).click()
  await expect(page.getByLabel('שם', { exact: true })).toHaveValue('קישוא')
  await page.screenshot({ path: 'screens/017-1.png' })
  await page.getByRole('button', { name: 'שמירה', exact: true }).click()
  await expect(page).toHaveURL(/\/tasting\/?(\?.*)?$/)
  await expect(cell(page, today, 2).getByRole('button', { name: 'קישוא' })).toBeVisible()
})
