import { expect, test } from '@playwright/test'
import { addEvent, hoursAgo, openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

test('012-1: switching the filter from היום to 7 ימים shows an event from 3 days ago', async ({ page, request }) => {
  await openLog(page, request)
  await addEvent(page, {
    eventType: 'ACTIVITY',
    timestamp: hoursAgo(72),
    activity: { activityName: 'שירים' },
  })
  await page.goto('/timeline')
  await expect(page.getByTestId('timeline-row')).toHaveCount(0)
  await page.getByRole('button', { name: '7 ימים' }).click()
  await expect(page.getByTestId('timeline-row')).toHaveCount(1)
  await expect(page.getByTestId('timeline-row')).toContainText('פעילות: שירים')
  await page.screenshot({ path: 'e2e/screens/012-1.png' })
})
