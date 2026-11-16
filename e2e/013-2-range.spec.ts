import { expect, test } from '@playwright/test'
import { addEvent, hoursAgo, openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

test('013-2: the 7 days range shows 7 bars in the sleep bar chart', async ({ page, request }) => {
  await openLog(page, request)
  await addEvent(page, {
    eventType: 'SLEEP',
    timestamp: hoursAgo(2),
    sleep: { startAt: hoursAgo(2), endAt: hoursAgo(1), startLocation: 'CRIB' },
  })
  await page.goto('/stats')
  await page.getByRole('button', { name: '7 ימים' }).click()
  await page.getByTestId('stats-sleep').getByRole('button', { name: /הרחב/ }).click()
  await expect(page.getByTestId('stats-sleep').getByTestId('bar-chart-row')).toHaveCount(7)
  await page.screenshot({ path: 'screens/013-2.png' })
})
