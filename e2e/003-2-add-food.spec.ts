import { expect, test } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('003-2: saving קוסקוס with a new allergen כוסמין shows it in the list with the chip', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(5) })
  await page.goto('/tasting/foods/new')
  await page.getByLabel('שם', { exact: true }).fill('קוסקוס')
  await page.getByLabel('קטגוריה').selectOption({ label: 'דגנים' })
  await page.getByRole('button', { name: '🍚' }).first().click()
  await page.getByLabel('אלרגן', { exact: true }).selectOption({ label: '+ אלרגן חדש' })
  await page.getByLabel('שם האלרגן החדש').fill('כוסמין')
  await page.getByRole('button', { name: 'הוספה', exact: true }).click()
  await expect(page.getByLabel('אלרגן', { exact: true })).toHaveValue(/^(?!__new$).+/)
  await page.getByRole('button', { name: 'שמירה', exact: true }).click()
  await expect(page).toHaveURL(/\/tasting\/foods$/)
  const row = page.getByRole('link', { name: /קוסקוס/ })
  await expect(row).toBeVisible()
  await expect(row.getByText('כוסמין')).toBeVisible()
  await page.screenshot({ path: 'e2e/screens/003-2.png' })
})
