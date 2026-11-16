import { expect, test } from '@playwright/test'
import { addEvent, hoursAgo, holdQuick, openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:3000'
const minutesAgo = (m: number): string => new Date(Date.now() - m * 60000).toISOString()

test('016-2: a bottle at a time inside an earlier sleep is refused with the sleep named', async ({ page, request }) => {
  await openLog(page, request)
  await addEvent(page, { eventType: 'SLEEP', sleep: { startAt: hoursAgo(3), endAt: minutesAgo(30) } })
  await page.reload()

  await holdQuick(page, 'meal')
  await page.getByRole('button', { name: /בקבוק \(שאוב/ }).click()
  await page.locator('#es-offered').fill('90')
  // the time defaults to now: two steps of 30 minutes back is inside the sleep
  const picker = page.locator('app-datetime24').first()
  await picker.getByRole('button', { name: 'הפחת 30 דקות' }).click()
  await picker.getByRole('button', { name: 'הפחת 30 דקות' }).click()
  await page.getByRole('button', { name: 'שמור תיעוד רפואי ✔️' }).click()

  await expect(page.getByText(/התינוק ישן אז: שינה מ-\d{2}:\d{2} עד \d{2}:\d{2}/)).toBeVisible()
  await page.screenshot({ path: 'screens/016-2.png' })
  const res = await page.request.get(`${API_URL}/api/v1/tracker/events?limit=50`)
  const { events } = (await res.json()) as { events: { eventType: string }[] }
  expect(events.filter((e) => e.eventType === 'NUTRITION')).toHaveLength(0)
})
