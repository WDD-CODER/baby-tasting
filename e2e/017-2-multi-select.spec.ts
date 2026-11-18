import { expect, test } from '@playwright/test'
import { cell, todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('017-2: three foods selected in the add-food sheet all go into the meal with הוספה (3)', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  await page.goto('/tasting')
  const today = todayIso()
  await cell(page, today, 2).locator('.cell__add').click()
  for (const name of ['בננה', 'אגס', 'אבוקדו']) {
    await page.locator('.food', { hasText: name }).first().click()
  }
  const add = page.getByRole('button', { name: 'הוספה (3)' })
  await expect(add).toBeVisible()
  await page.screenshot({ path: 'screens/017-2.png' })
  await add.click()
  await expect(cell(page, today, 2).locator('.tile')).toHaveCount(3)
})
