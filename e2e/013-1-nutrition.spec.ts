import { expect, test } from '@playwright/test'
import { addEvent, hoursAgo, openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

test('013-1: two bottles today (60 and 90 ml) add up to 150 in the nutrition section', async ({ page, request }) => {
  await openLog(page, request)
  for (const ml of [60, 90]) {
    await addEvent(page, {
      eventType: 'NUTRITION',
      timestamp: hoursAgo(0.1),
      nutrition: { feedType: 'BOTTLE', amountOfferedMl: ml, amountConsumedMl: ml },
    })
  }
  await page.goto('/stats')
  await expect(page.getByTestId('stats-nutrition')).toContainText('150')
  await page.screenshot({ path: 'screens/013-1.png' })
})
