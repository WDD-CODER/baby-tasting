import { expect, test } from '@playwright/test'
import { holdQuick, openLog, startSleep } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

test('015-2: recording a past sleep during a running one and choosing להשאיר פעילה keeps both', async ({
  page,
  request,
}) => {
  await openLog(page, request)
  await startSleep(page)
  await page.reload()
  await expect(page.getByTestId('open-sleep-pill')).toBeVisible()

  await holdQuick(page, 'sleep')
  await page.getByRole('button', { name: '📅 תיעוד שינה שהסתיימה' }).click()
  // the start defaults to an hour ago and the end to now: move both an hour back (2 h ago to 1 h ago)
  const [start, end] = [page.locator('app-datetime24').nth(0), page.locator('app-datetime24').nth(1)]
  for (const picker of [start, end]) {
    await picker.getByRole('button', { name: 'הפחת 30 דקות' }).click()
    await picker.getByRole('button', { name: 'הפחת 30 דקות' }).click()
  }
  await page.getByRole('button', { name: 'שמור תיעוד שינה ✔️' }).click()

  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('לסיים את השינה הנוכחית או להשאיר אותה פעילה?')
  await expect(dialog.getByRole('button', { name: 'להשאיר פעילה' })).toBeFocused()
  await page.screenshot({ path: 'screens/015-2.png' })
  await dialog.getByRole('button', { name: 'להשאיר פעילה' }).click()

  await expect(page.getByTestId('open-sleep-pill')).toBeVisible()
  await page.goto('/timeline')
  await expect(page.getByTestId('timeline-sleeping')).toBeVisible()
  await expect(page.getByTestId('timeline-row').filter({ hasText: / עד \d{2}:\d{2}/ })).toHaveCount(1)
})
