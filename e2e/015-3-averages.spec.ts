import { expect, test } from '@playwright/test'
import { addEvent, openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

const minutesAgo = (n: number): string => new Date(Date.now() - n * 60000).toISOString()

test('015-3: with events from today only, switching from היום to 7 ימים leaves the nutrition average unchanged', async ({
  page,
  request,
}) => {
  await openLog(page, request)
  for (const at of [minutesAgo(3), minutesAgo(2)]) {
    await addEvent(page, { eventType: 'NUTRITION', timestamp: at, nutrition: { feedType: 'BREAST', durationMinutes: 10 } })
  }
  await page.goto('/stats')
  const avg = page.getByTestId('stats-nutrition').locator('.st__tile', { hasText: 'ממוצע יומי' }).locator('.st__tileValue')
  await page.getByRole('button', { name: 'היום', exact: true }).click()
  await expect(avg).toContainText('2.0')
  const today = (await avg.textContent())?.trim()

  const week = page.waitForResponse((r) => r.url().includes('/tracker/stats/nutrition') && r.ok())
  await page.getByRole('button', { name: '7 ימים' }).click()
  await week
  await expect(avg).toHaveText(today ?? '')
  await page.screenshot({ path: 'screens/015-3.png' })
})
