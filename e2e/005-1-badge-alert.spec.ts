import { expect, test } from '@playwright/test'
import { giveFood } from './support/allergens'
import { addDaysIso, cell, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('005-1: טחינה given 3 days ago and yesterday shows 2/3 and the missing-day alert', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  await giveFood(page, 'טחינה', addDaysIso(today, -3))
  await giveFood(page, 'טחינה', addDaysIso(today, -1))
  await page.goto('/')
  await expect(page.getByText('חסר יום ברצף — כדאי לתת היום שומשום')).toBeVisible()
  const yesterday = cell(page, addDaysIso(today, -1), 1)
  if ((await yesterday.count()) === 0) await page.getByRole('button', { name: 'הקודם' }).click()
  await expect(yesterday.locator('.tile__badge')).toHaveText('2/3')
  await page.screenshot({ path: 'e2e/screens/005-1.png' })
})
