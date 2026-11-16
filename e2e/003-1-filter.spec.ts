import { expect, test } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('003-1: the list shows בננה; אלרגנים בלבד hides it and keeps טחינה with the chip שומשום', async ({
  page,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(5) })
  await page.goto('/tasting/foods')
  await expect(page.getByText('בננה')).toBeVisible()
  await page.getByRole('button', { name: 'אלרגנים בלבד' }).click()
  await expect(page.getByText('בננה')).toHaveCount(0)
  const tahini = page.getByRole('link', { name: /טחינה/ })
  await expect(tahini).toBeVisible()
  await expect(tahini.getByText('שומשום')).toBeVisible()
  await page.screenshot({ path: 'e2e/screens/003-1.png' })
})
