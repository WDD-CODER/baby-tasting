import { expect, test } from '@playwright/test'
import { openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

test('026-2: the export date fields fit a 360 px Settings page without a sideways scroll', async ({ page, request }) => {
  await openLog(page, request)
  await page.goto('/settings')
  const from = page.getByLabel('מתאריך')
  const to = page.getByLabel('עד תאריך')
  await expect(to).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360)
  for (const field of [from, to]) {
    const box = await field.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(360)
  }
})
