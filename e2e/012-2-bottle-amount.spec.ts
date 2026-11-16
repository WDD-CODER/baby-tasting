import { expect, test } from '@playwright/test'
import { addEvent, hoursAgo, openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

test('012-2: editing a quick-recorded bottle amount keeps its feed type and shows the new amount', async ({ page, request }) => {
  await openLog(page, request)
  await addEvent(page, {
    eventType: 'NUTRITION',
    timestamp: hoursAgo(1),
    quickRecorded: true,
    nutrition: { feedType: 'BOTTLE' },
  })
  await page.goto('/timeline')
  await page.getByTestId('timeline-row').click()
  await page.locator('#es-offered').fill('100')
  await page.locator('#es-consumed').fill('100')
  await page.getByRole('button', { name: 'שמור עדכונים' }).click()
  await expect(page.getByTestId('timeline-row')).toContainText('נצרך: 100 מ״ל')
  await expect(page.getByTestId('timeline-row')).toContainText('חלב שאוב בבקבוק')
  await page.screenshot({ path: 'e2e/screens/012-2.png' })
})
