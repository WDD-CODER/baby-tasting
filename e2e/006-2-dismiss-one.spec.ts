import { expect, test } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'
import { seedSuggestionWeek, tooLateInWeek } from './support/suggestions'

test('006-2: dismissing one dashed suggestion removes only that one', async ({ page, request }) => {
  test.skip(tooLateInWeek(), 'needs Sunday–Thursday')
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  await seedSuggestionWeek(page)
  await page.goto('/tasting')
  await page.getByRole('button', { name: 'הצע לי שבוע' }).click()
  await expect(page.locator('.suggested')).toHaveCount(3)
  await page.locator('.suggested[aria-label="אגס"]').click()
  await expect(page.getByText('מזון חדש מהתור')).toBeVisible()
  await page.getByRole('button', { name: 'הסרה', exact: true }).click()
  await expect(page.locator('.suggested')).toHaveCount(2)
  await expect(page.locator('.suggested[aria-label="אגס"]')).toHaveCount(0)
  await page.screenshot({ path: 'e2e/screens/006-2.png' })
})
