import { expect, test } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('017-3: the icon search offers 🥑 for אבוקדו and a food saved with ללא אייקון shows 🍽️ in the list', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  await page.goto('/tasting/foods/new')
  await page.getByLabel('חיפוש אייקון').fill('אבוקדו')
  await expect(page.locator('.picker__item', { hasText: '🥑' })).toBeVisible()
  await page.screenshot({ path: 'screens/017-3.png' })

  await page.getByLabel('חיפוש אייקון').fill('')
  await expect(page.getByRole('button', { name: 'ללא אייקון' })).toHaveAttribute('aria-pressed', 'true')
  await page.getByLabel('שם', { exact: true }).fill('מזון בלי אייקון')
  await page.getByRole('button', { name: 'שמירה', exact: true }).click()
  await expect(page).toHaveURL(/\/tasting\/foods$/)
  await expect(page.getByRole('link', { name: /מזון בלי אייקון/ }).first()).toContainText('🍽️')
})
