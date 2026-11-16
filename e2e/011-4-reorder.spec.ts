import { expect, test } from '@playwright/test'
import { dragTo } from './support/calendar'
import { openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 1400 } })

test('011-4: dragging one quick button before another keeps the new order after a reload', async ({ page, request }) => {
  await openLog(page, request)
  const items = page.locator('[data-quick]')
  await expect(items.first()).toHaveAttribute('data-quick', 'meal')
  await page.getByRole('button', { name: /ערוך פריסה/ }).click()
  await dragTo(page, page.locator('[data-quick="vomiting"]'), page.locator('[data-quick="meal"]'))
  await page.getByRole('button', { name: /סיום ושמירה/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'סדר הכפתורים נשמר' })).toBeVisible()
  await page.reload()
  await expect(items.first()).toHaveAttribute('data-quick', 'vomiting')
  await page.screenshot({ path: 'e2e/screens/011-4.png' })
})
