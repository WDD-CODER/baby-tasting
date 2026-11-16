import { expect, test } from '@playwright/test'
import { openLog, startSleep } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

const API_URL = process.env['E2E_API_URL'] ?? 'http://localhost:3000'

test('016-3: a quick meal during a running sleep asks, and לסיים ולתעד ends the sleep and logs the meal after it', async ({
  page,
  request,
}) => {
  await openLog(page, request)
  await startSleep(page)
  await page.reload()
  await expect(page.getByTestId('open-sleep-pill')).toBeVisible()

  await page.locator('[data-quick="meal"] button').click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('התינוק ישן מאז')
  await page.screenshot({ path: 'screens/016-3.png' })
  await dialog.getByRole('button', { name: 'לסיים ולתעד' }).click()

  await expect(page.getByTestId('open-sleep-pill')).toHaveCount(0)
  await page.goto('/timeline')
  await expect(page.getByTestId('timeline-sleeping')).toHaveCount(0)
  await expect(page.getByTestId('timeline-row')).toHaveCount(2)
  const res = await page.request.get(`${API_URL}/api/v1/tracker/events?limit=10`)
  const { events } = (await res.json()) as {
    events: { eventType: string; timestamp: string; sleep?: { endAt: string | null } }[]
  }
  const sleep = events.find((e) => e.eventType === 'SLEEP')
  const meal = events.find((e) => e.eventType === 'NUTRITION')
  expect(sleep?.sleep?.endAt).toBe(meal?.timestamp)
})
