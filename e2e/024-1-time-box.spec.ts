import { expect, test } from '@playwright/test'
import { openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

// The box must sit inside the screen: in RTL a -50% translate once pushed it off to the left (run-023).
async function expectBoxInView(page: import('@playwright/test').Page): Promise<void> {
  const box = await page.getByRole('dialog', { name: 'בחירת שעה' }).boundingBox()
  const vw = page.viewportSize()!.width
  expect(box && box.x >= 0 && box.x + box.width <= vw).toBe(true)
}

test('024-1: the activity sheet time box sets 09:30 in two taps', async ({ page, request }) => {
  await openLog(page, request)
  await page.locator('[data-quick="activity"] button').click()
  await page.getByRole('button', { name: 'בחירת שעה' }).click()
  await expectBoxInView(page)
  await page.locator('.dt__grid').getByRole('button', { name: '09', exact: true }).click()
  await page.locator('.dt__grid').getByRole('button', { name: '30', exact: true }).click()
  await expect(page.locator('input.dt__typed')).toHaveValue('09:30')
  await page.screenshot({ path: 'e2e/screens/024-1.png' })
})

test('024-2: the reaction form uses the same picker and keeps the chosen time', async ({ page, request }) => {
  await openLog(page, request)
  await page.goto('/tasting/reactions/new')
  const when = page.getByTestId('reaction-when')
  await expect(when.locator('input.dt__typed')).toBeVisible()
  await expect(when.getByRole('button', { name: 'עכשיו' })).toBeVisible()
  await when.getByRole('button', { name: 'בחירת שעה' }).click()
  await expectBoxInView(page)
  await page.locator('.dt__grid').getByRole('button', { name: '08', exact: true }).click()
  await page.locator('.dt__grid').getByRole('button', { name: '45', exact: true }).click()
  await expect(when.locator('input.dt__typed')).toHaveValue('08:45')
  await page.screenshot({ path: 'e2e/screens/024-2.png' })
})
