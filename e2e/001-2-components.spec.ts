import { expect, test } from '@playwright/test'

test('001-2: /dev/components shows the heading and one section per shared component', async ({ page }) => {
  await page.goto('/dev/components')
  await expect(page.getByRole('heading', { name: 'רכיבים משותפים' })).toBeVisible()
  await expect(page.locator('section[data-component]')).toHaveCount(13)
  await page.screenshot({ path: 'e2e/screens/001-2.png', fullPage: true })
})
