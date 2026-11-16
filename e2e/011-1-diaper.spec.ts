import { expect, test } from '@playwright/test'
import { openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

test('011-1: tapping the diaper quick action and saving פיפי shows it in today\'s carousel', async ({ page, request }) => {
  await openLog(page, request)
  await page.locator('[data-quick="diaper"] button').click()
  await page.getByRole('button', { name: 'פיפי בלבד' }).click()
  await expect(page.getByTestId('today-carousel')).toContainText('חיתול מהיר: שתן')
  await page.screenshot({ path: 'e2e/screens/011-1.png' })
})
