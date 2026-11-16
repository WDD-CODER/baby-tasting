import { expect, test } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('001-1: the shell shows the top bar, five tabs and the foods empty state', async ({ page, request }) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(5) })
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { name: 'טעימות' })).toBeVisible()
  const nav = page.locator('nav.shell__nav')
  for (const label of ['תיעוד', 'ציר זמן', 'סטטיסטיקה', 'טעימות', 'הגדרות']) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible()
  }
  await nav.getByRole('link', { name: 'טעימות' }).click()
  await page.getByRole('link', { name: 'מזונות' }).click()
  await expect(page).toHaveURL(/\/tasting\/foods$/)
  await expect(page.getByText('עוד אין כאן כלום')).toBeVisible()
  await page.screenshot({ path: 'e2e/screens/001-1.png' })
})
