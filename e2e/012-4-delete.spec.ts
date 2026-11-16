import { expect, test } from '@playwright/test'
import { addEvent, hoursAgo, openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

test('012-4: deleting a row asks first; after confirming it disappears and ביטול brings it back', async ({ page, request }) => {
  await openLog(page, request)
  await addEvent(page, {
    eventType: 'ACTIVITY',
    timestamp: hoursAgo(1),
    activity: { activityName: 'שירים' },
  })
  await page.goto('/timeline')
  await page.getByTestId('timeline-row').click()
  await page.getByTestId('edit-delete').click()
  await expect(page.getByText('האם למחוק את האירוע הזה?')).toBeVisible()
  await page.screenshot({ path: 'e2e/screens/012-4.png' })
  await page.getByTestId('edit-delete-yes').click()
  await expect(page.getByTestId('timeline-row')).toHaveCount(0)
  await page.getByRole('status').getByRole('button', { name: 'ביטול' }).click()
  await expect(page.getByTestId('timeline-row')).toHaveCount(1)
})
