import { expect, test } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('003-3: unsaved changes ask before leaving; archive asks for confirmation', async ({ page, request }) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(5) })
  await page.goto('/tasting/foods')
  await page.getByRole('link', { name: 'הוספת מזון' }).or(page.getByRole('button', { name: 'הוספת מזון' })).first().click()
  await expect(page).toHaveURL(/\/foods\/new$/)
  await page.getByLabel('שם', { exact: true }).fill('מזון בדיקה')
  await page.goBack()
  await expect(page.getByText('יש שינויים שלא נשמרו')).toBeVisible()
  await page.screenshot({ path: 'e2e/screens/003-3.png' })
  await page.getByRole('button', { name: 'להישאר' }).click()

  // since plan 008 a food opens its detail page; archiving lives on its edit page
  await page.goto('/tasting/foods')
  await page.getByRole('link', { name: /בננה/ }).click()
  await page.getByRole('link', { name: 'עריכה' }).click()
  await expect(page).toHaveURL(/\/edit$/)
  await page.getByRole('button', { name: 'העברה לארכיון' }).click()
  await expect(page.getByText('להעביר את בננה לארכיון?')).toBeVisible()
})
