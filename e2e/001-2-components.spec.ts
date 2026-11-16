import { expect, test } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('001-2: /dev/components shows the heading and one section per shared component', async ({ page, request }) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(5) })
  await page.goto('/dev/components')
  await expect(page.getByRole('heading', { name: 'רכיבים משותפים' })).toBeVisible()
  await expect(page.locator('section[data-component]')).toHaveCount(14)
  await page.screenshot({ path: 'e2e/screens/001-2.png', fullPage: true })
})
