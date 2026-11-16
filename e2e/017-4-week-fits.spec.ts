import { expect, test } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('017-4: at 360x780 the week view shows 7 days and 3 meals without scrolling the page', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  await page.goto('/tasting')
  await expect(page.locator('.cell')).toHaveCount(21)
  const hint = page.locator('app-calendar-hint').getByRole('button')
  if (await hint.count()) await hint.first().click()
  await page.screenshot({ path: 'screens/017-4.png' })
  const size = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  expect(size.scrollHeight).toBeLessThanOrEqual(size.innerHeight)
  expect(size.scrollWidth).toBeLessThanOrEqual(size.innerWidth)
})
