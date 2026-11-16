import { expect, test } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('009-4: טעימות opens /tasting (the calendar); its top tab מזונות opens /tasting/foods', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(5) })
  await page.goto('/')
  await page.locator('nav.shell__nav').getByRole('link', { name: 'טעימות' }).click()
  await page.waitForURL((url) => url.pathname === '/tasting')
  const topTabs = page.locator('nav.top-tabs')
  await expect(topTabs.getByRole('link', { name: 'יומן' })).toHaveAttribute('aria-current', 'page')
  await topTabs.getByRole('link', { name: 'מזונות' }).click()
  await page.waitForURL((url) => url.pathname === '/tasting/foods')
  await expect(topTabs.getByRole('link', { name: 'מזונות' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('button', { name: 'הוספת מזון' }).or(page.getByRole('link', { name: 'הוספת מזון' })).first()).toBeVisible()
  await page.screenshot({ path: 'e2e/screens/009-4.png' })
})
