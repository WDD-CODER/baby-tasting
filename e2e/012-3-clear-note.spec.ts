import { expect, test } from '@playwright/test'
import { addEvent, hoursAgo, openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

test('012-3: clearing an event note and saving removes the note from its row', async ({ page, request }) => {
  await openLog(page, request)
  await addEvent(page, {
    eventType: 'ACTIVITY',
    timestamp: hoursAgo(1),
    note: 'בכה קצת',
    activity: { activityName: 'שירים' },
  })
  await page.goto('/timeline')
  await expect(page.getByTestId('timeline-row')).toContainText('בכה קצת')
  await page.getByTestId('timeline-row').click()
  await page.locator('#es-note').fill('')
  await page.getByRole('button', { name: 'שמור עדכונים' }).click()
  await expect(page.getByTestId('timeline-row')).toContainText('פעילות: שירים')
  await expect(page.getByTestId('timeline-row')).not.toContainText('בכה קצת')
  await page.screenshot({ path: 'e2e/screens/012-3.png' })
})
