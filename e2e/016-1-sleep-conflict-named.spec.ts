import { expect, test } from '@playwright/test'
import { addEvent, hoursAgo, openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

const minutesAgo = (m: number): string => new Date(Date.now() - m * 60000).toISOString()

test('016-1: a past sleep over an earlier sleep names it, and הצג opens that sleep', async ({ page, request }) => {
  await openLog(page, request)
  // an earlier sleep from 3 h ago to 10 minutes ago; the recorded sleep defaults to 1 h ago until now
  await addEvent(page, { eventType: 'SLEEP', sleep: { startAt: hoursAgo(3), endAt: minutesAgo(10) } })
  await page.reload()

  const sleep = page.locator('[data-quick="sleep"] button')
  await sleep.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  const box = await sleep.boundingBox()
  if (!box) throw new Error('no sleep button')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(800)
  await page.mouse.up()
  await page.getByRole('button', { name: '📅 תיעוד שינה שהסתיימה' }).click()
  await page.getByRole('button', { name: 'שמור תיעוד שינה ✔️' }).click()

  await expect(page.getByText(/השינה חופפת לשינה מ-\d{2}:\d{2} עד \d{2}:\d{2} \(\d{2}\/\d{2}\)/)).toBeVisible()
  await page.screenshot({ path: 'screens/016-1.png' })
  await page.getByRole('button', { name: 'הצג', exact: true }).click()
  await expect(page.getByTestId('edit-delete')).toBeVisible()
})
