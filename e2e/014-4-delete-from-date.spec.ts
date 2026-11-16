import { expect, test } from '@playwright/test'
import { addEvent, hoursAgo, openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

const israelDay = (hours: number): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date(Date.now() - hours * 3600000))

test('014-4: delete from yesterday removes yesterday\'s events and keeps today\'s (F7)', async ({ page, request }) => {
  await openLog(page, request)
  const old = { eventType: 'ACTIVITY', timestamp: hoursAgo(25), activity: { activityName: 'שירים' } }
  await addEvent(page, old)
  await addEvent(page, { eventType: 'ACTIVITY', timestamp: hoursAgo(0.05), activity: { activityName: 'טיול בעגלה' } })
  await page.goto('/settings')
  await page.getByLabel('בחר תאריך יעד למחיקה אחורה:').fill(israelDay(25))
  await page.getByRole('button', { name: /מחק נתונים מתאריך/ }).click()
  await page.getByRole('button', { name: 'כן, למחוק לצמיתות' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'הנתונים הישנים נמחקו בהצלחה' })).toBeVisible()
  await page.goto('/timeline')
  await expect(page.getByTestId('timeline-row')).toHaveCount(1)
  await expect(page.getByTestId('timeline-row')).toContainText('טיול בעגלה')
  await page.screenshot({ path: 'screens/014-4.png' })
})
