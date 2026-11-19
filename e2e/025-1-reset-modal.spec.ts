import { expect, test } from '@playwright/test'
import { openLog } from './support/tracker'

test.use({ viewport: { width: 360, height: 780 } })

test('025-1: the full reset asks in the centred modal and typing the word enables it', async ({ page, request }) => {
  await openLog(page, request)
  await page.goto('/settings')
  await page.getByRole('button', { name: 'אתחל את כל הנתונים והתחל מאפס' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  const confirm = dialog.getByRole('button', { name: 'כן, למחוק לצמיתות' })
  await expect(confirm).toBeDisabled()
  await dialog.locator('input').fill('מחק הכל')
  await expect(confirm).toBeEnabled()
  await page.screenshot({ path: 'e2e/screens/025-1.png' })
  await dialog.getByRole('button', { name: 'ביטול' }).click()
  await expect(dialog).toHaveCount(0)
})
