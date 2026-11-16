import { expect, test } from '@playwright/test'
import { openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

test('011-2: a short press on sleep shows the open-sleep pill; a second one ends it with a duration', async ({
  page,
  request,
}) => {
  test.setTimeout(60_000)
  await openLog(page, request)
  const sleep = page.locator('[data-quick="sleep"] button')
  await sleep.click()
  await expect(page.getByTestId('open-sleep-pill')).toBeVisible()
  // the 10 s double-submit guard covers the sleep toggle
  await page.waitForTimeout(10_500)
  await sleep.click()
  await expect(page.getByTestId('open-sleep-pill')).toHaveCount(0)
  await expect(page.getByTestId('today-carousel')).toContainText('משך:')
  await page.screenshot({ path: 'e2e/screens/011-2.png' })
})
