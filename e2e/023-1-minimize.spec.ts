import { expect, test } from '@playwright/test'
import { dragTo } from './support/calendar'
import { openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 1400 } })

test('023-1: dragging activity into the minimized row keeps it there after a reload and a tap opens its sheet', async ({ page, request }) => {
  await openLog(page, request)
  await page.getByRole('button', { name: /ערוך פריסה/ }).click()
  await expect(page.getByText('גררו לכאן כדי למזער')).toBeVisible()
  await dragTo(page, page.locator('[data-quick="activity"]'), page.getByTestId('quick-minimized'))
  await page.getByRole('button', { name: /סיום ושמירה/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'סדר הכפתורים נשמר' })).toBeVisible()
  await expect(page.locator('[data-quick="activity"]')).toHaveCount(0)
  await expect(page.locator('[data-chip="activity"]')).toHaveCount(1)
  await page.reload()
  const chip = page.locator('[data-chip="activity"] button')
  await expect(chip).toBeVisible()
  await expect(page.locator('[data-quick="activity"]')).toHaveCount(0)
  await chip.click()
  await expect(page.getByText('סוג הפעילות')).toBeVisible()
  await page.screenshot({ path: 'e2e/screens/023-1.png' })
})
