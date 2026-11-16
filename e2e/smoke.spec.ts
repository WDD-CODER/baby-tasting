import { expect, test } from '@playwright/test'

test('the app loads in Hebrew right-to-left', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'he')
  await page.screenshot({ path: 'e2e/screens/smoke.png' })
})
