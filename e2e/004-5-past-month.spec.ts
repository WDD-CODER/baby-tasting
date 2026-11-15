import { expect, test } from '@playwright/test'
import { todayIso } from './support/calendar'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('004-5: an item given on a date last month shows its emoji on that day after a reload', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(8) })
  const today = todayIso()
  const lastMonth = new Date(`${today.slice(0, 7)}-01T00:00:00Z`)
  lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1)
  const day = `${lastMonth.toISOString().slice(0, 7)}-10`

  const openLastMonth = async (): Promise<void> => {
    await page.getByRole('button', { name: 'חודש' }).click()
    await page.getByRole('button', { name: 'הקודם' }).click()
  }

  await openLastMonth()
  await page.locator(`.day[data-date="${day}"]`).click()
  await page.getByRole('button', { name: 'הוספת מזון' }).nth(1).click()
  await page.getByLabel('חיפוש מזון').fill('בננה')
  await page.getByRole('button', { name: /בננה/ }).first().click()
  await page.getByRole('button', { name: 'בננה', exact: true }).click()
  await page.getByRole('button', { name: 'ניתן', exact: true }).click()
  await page.getByRole('button', { name: 'סגירה' }).last().click()
  await page.getByRole('button', { name: 'סגירה' }).last().click()
  await page.reload()
  await openLastMonth()
  await expect(page.locator(`.day[data-date="${day}"]`)).toContainText('🍌')
  await page.screenshot({ path: 'e2e/screens/004-5.png' })
})
