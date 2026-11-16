import { expect, test } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test.use({ viewport: { width: 360, height: 740 } })

test('009-2: the five tabs are visible at 360px', async ({ page, request }) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(5) })
  await page.goto('/')
  const nav = page.locator('nav.shell__nav')
  for (const label of ['תיעוד', 'ציר זמן', 'סטטיסטיקה', 'טעימות', 'הגדרות']) {
    const tab = nav.getByRole('link', { name: label })
    await expect(tab).toBeVisible()
    await expect(tab).toBeInViewport({ ratio: 1 })
  }
  await page.screenshot({ path: 'e2e/screens/009-2.png' })
})
