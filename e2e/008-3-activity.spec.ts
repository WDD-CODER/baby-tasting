import { expect, test } from '@playwright/test'
import { giveFood } from './support/allergens'
import { todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('008-3: the activity log lists parent-a and the change just made first', async ({ page, request }) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  await giveFood(page, 'בננה', todayIso())
  await page.goto('/settings')
  const first = page.locator('.log__row').first()
  await expect(first).toContainText('parent-a')
  await expect(first).toContainText('בננה כניתן')
  await page.screenshot({ path: 'e2e/screens/008-3.png' })
})
