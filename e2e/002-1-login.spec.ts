import { expect, test } from '@playwright/test'
import { resetHousehold, signIn } from './support/session'

test('002-1: the right name and password open the app, a wrong one is refused', async ({ page, request }) => {
  await resetHousehold(request)
  await page.goto('/login')
  await page.getByLabel('שם משתמש').fill('nobody')
  await page.getByLabel('סיסמה', { exact: true }).fill('test-pass-a')
  await page.getByRole('button', { name: 'כניסה' }).click()
  await expect(page.getByText('שם משתמש או סיסמה שגויים')).toBeVisible()
  await expect(page).toHaveURL(/\/login/)
  await page.screenshot({ path: 'e2e/screens/002-1.png' })

  await signIn(page, 'parent-a')
  await expect(page).not.toHaveURL(/\/login/)
})
