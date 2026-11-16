import { expect, test } from '@playwright/test'
import { openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

test('014-3: the custom activity בריכה shows in the activity sheet on /', async ({ page, request }) => {
  await openLog(page, request)
  await page.goto('/settings')
  await page.getByLabel('למשל: שחיית תינוקות, סיפור').fill('בריכה')
  await page.getByRole('button', { name: 'הוסף' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'הפעילות החדשה נוספה לרשימה' })).toBeVisible()
  await page.goto('/')
  await page.getByRole('button', { name: 'תיעוד פעילות' }).click()
  await expect(page.getByRole('button', { name: 'בריכה', exact: true })).toBeVisible()
  await page.screenshot({ path: 'screens/014-3.png' })
})
