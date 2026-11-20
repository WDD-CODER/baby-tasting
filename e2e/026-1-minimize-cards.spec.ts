import { expect, test } from '@playwright/test'
import { openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 1400 } })

test('026-1: diapers and pumping start as bars; a tap opens one; switching it off in edit mode keeps it full size', async ({ page, request }) => {
  await openLog(page, request)
  const bar = page.getByTestId('home-card-bar-pumping')
  await expect(page.getByTestId('home-card-bar-diaper')).toBeVisible()
  await expect(page.getByTestId('diaper-tracker')).toBeHidden()
  await expect(bar).toContainText('שאיבות חלב יומיות (היום)')
  await expect(page.getByTestId('pumping-tracker')).toBeHidden()
  await bar.click()
  await expect(page.getByTestId('pumping-tracker')).toBeVisible()
  await page.screenshot({ path: 'e2e/screens/026-1.png' })
  await page.getByRole('button', { name: /ערוך פריסה/ }).click()
  await page.getByTestId('home-card-switch-pumping').getByRole('button', { name: 'מזער' }).click()
  await page.getByRole('button', { name: /סיום ושמירה/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'סדר הכפתורים נשמר' })).toBeVisible()
  await page.reload()
  await expect(page.getByTestId('pumping-tracker')).toBeVisible()
  await expect(bar).toHaveCount(0)
  await expect(page.getByTestId('home-card-bar-diaper')).toBeVisible()
})

test('026-1b: minimizing the quick grid keeps the edit button and a tap on its bar shows the six buttons', async ({ page, request }) => {
  await openLog(page, request)
  await page.getByRole('button', { name: /ערוך פריסה/ }).click()
  await page.getByTestId('home-card-switch-quick').getByRole('button', { name: 'מזער' }).click()
  await page.getByRole('button', { name: /סיום ושמירה/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'סדר הכפתורים נשמר' })).toBeVisible()
  await expect(page.getByRole('button', { name: /ערוך פריסה/ })).toBeVisible()
  await expect(page.locator('[data-quick]').first()).toBeHidden()
  await page.getByTestId('home-card-bar-quick').click()
  await expect(page.locator('[data-quick]')).toHaveCount(6)
  await expect(page.locator('[data-quick="meal"]')).toBeVisible()
})
