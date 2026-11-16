import { expect, test } from '@playwright/test'
import { openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

test('014-2: ייצוא downloads baby_tracker_report_<today>.xlsx', async ({ page, request }) => {
  await openLog(page, request)
  await page.goto('/settings')
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date())
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'הורד דוח Excel מעוצב (.xlsx)' }).click()
  expect((await download).suggestedFilename()).toBe(`baby_tracker_report_${today}.xlsx`)
  await page.screenshot({ path: 'screens/014-2.png' })
})
