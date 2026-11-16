import { expect, test } from '@playwright/test'
import { holdQuick, openLog, startSleep } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

/** Minutes shown by an HH:MM:SS timer. */
const timerMinutes = (text: string | null): number => {
  const [h, m] = (text ?? '').trim().split(':').map(Number)
  return h * 60 + m
}

test('015-1: during a running sleep, setting the start 20 minutes earlier keeps it active and the timer shows 20+ minutes', async ({
  page,
  request,
}) => {
  await openLog(page, request)
  await startSleep(page)
  await page.reload()
  const pill = page.getByTestId('open-sleep-pill')
  await expect(pill).toBeVisible()

  await holdQuick(page, 'sleep')
  await expect(page.getByRole('button', { name: '⏱️ תיקון שעת ההירדמות' })).toBeVisible()
  // mode 1 is time only: no date chips
  await expect(page.getByRole('button', { name: 'אתמול', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'הפחת 15 דקות' }).click()
  await page.getByRole('button', { name: 'הפחת 5 דקות' }).click()
  await page.getByRole('button', { name: 'שמירת שעת ההירדמות' }).click()

  await expect(pill).toBeVisible()
  await expect.poll(async () => timerMinutes(await pill.locator('app-sleep-timer').textContent())).toBeGreaterThanOrEqual(20)
  await page.screenshot({ path: 'screens/015-1.png' })

  await page.goto('/timeline')
  await expect(page.getByTestId('timeline-sleeping')).toContainText('שינה פעילה')
})
