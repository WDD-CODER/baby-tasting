import { expect, test } from '@playwright/test'
import { addFood, todayIso } from './support/calendar'
import { lockThroughReaction } from './support/reactions'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('007-2: adding an omelette after an egg reaction is refused with a locked message', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  await lockThroughReaction(page, 'ביצה קשה', today)
  await page.goto('/tasting')
  await addFood(page, today, 1, 'חביתה')
  await expect(page.getByText('חביתה נעול בעקבות תגובה')).toBeVisible()
  await page.screenshot({ path: 'e2e/screens/007-2.png' })
})
