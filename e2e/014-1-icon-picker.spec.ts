import { expect, test } from '@playwright/test'
import { openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

test('014-1: nightlight for the sleep quick button shows on /, and איפוס לברירת מחדל brings the default back', async ({ page, request }) => {
  await openLog(page, request)
  await page.goto('/settings/icons')
  await page.locator('[data-slot="quick.sleep"]').click()
  await page.getByLabel('חיפוש (באנגלית)').fill('nightlight')
  await page.getByRole('button', { name: 'nightlight', exact: true }).click()
  await page.getByRole('button', { name: 'שמירה' }).click()
  await page.goto('/')
  const sleepButton = page.locator('[data-quick="sleep"]')
  await expect(sleepButton).toContainText('nightlight')
  await page.screenshot({ path: 'screens/014-1.png' })

  await page.goto('/settings/icons')
  await page.locator('[data-slot="quick.sleep"]').click()
  await page.getByRole('button', { name: 'איפוס לברירת מחדל' }).click()
  await page.goto('/')
  await expect(page.locator('[data-quick="sleep"]')).toContainText('bedtime')
})
