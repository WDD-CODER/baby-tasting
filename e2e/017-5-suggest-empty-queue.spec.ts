import { expect, test } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('017-5: with an empty queue and untried foods, הצע לי שבוע shows suggestions', async ({ page, request }) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  await page.goto('/tasting')
  await page.getByRole('button', { name: 'הצע לי שבוע' }).click()
  await expect(page.locator('.suggested').first()).toBeVisible()
  await page.screenshot({ path: 'screens/017-5.png' })
})
