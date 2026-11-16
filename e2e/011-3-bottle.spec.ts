import { expect, test } from '@playwright/test'
import { openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

test('011-3: a bottle with an empty amount shows the message; filling the amount saves at once', async ({
  page,
  request,
}) => {
  await openLog(page, request)
  // a long press on the meal button opens the full sheet
  const box = await page.locator('[data-quick="meal"] button').boundingBox()
  if (!box) throw new Error('no meal button')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(800)
  await page.mouse.up()

  await page.getByRole('button', { name: /בקבוק \(שאוב/ }).click()
  await page.locator('#es-offered').fill('')
  await page.getByRole('button', { name: 'שמור תיעוד רפואי ✔️' }).click()
  await expect(page.getByRole('alert')).toContainText('יש להזין כמות')
  await page.screenshot({ path: 'e2e/screens/011-3.png' })

  await page.locator('#es-offered').fill('90')
  await page.getByRole('button', { name: 'שמור תיעוד רפואי ✔️' }).click()
  await expect(page.getByTestId('today-carousel')).toContainText('נצרך: 90 מ״ל')
})
