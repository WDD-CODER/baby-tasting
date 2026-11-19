import { expect, test } from '@playwright/test'
import { addEvent, hoursAgo, openLog } from './support/tracker'

// iPhone 13 visible height: the old inline strip was drawn below this and looked dead
test.use({ viewport: { width: 390, height: 664 } })

test('012-4: deleting a row asks in a dialog inside the viewport; ביטול keeps it, מחק removes it and the toast ביטול brings it back', async ({ page, request }) => {
  await openLog(page, request)
  await addEvent(page, {
    eventType: 'ACTIVITY',
    timestamp: hoursAgo(1),
    activity: { activityName: 'שירים' },
  })
  await page.goto('/timeline')
  await page.getByTestId('timeline-row').click()
  await page.getByTestId('edit-delete').click()

  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('האם למחוק את האירוע הזה?')
  await expect(dialog).toBeInViewport({ ratio: 1 })
  await page.screenshot({ path: 'e2e/screens/012-4.png' })

  await dialog.getByRole('button', { name: 'ביטול' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByTestId('edit-delete')).toBeVisible()
  await page.getByTestId('edit-delete').click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'מחק', exact: true }).click()
  await expect(page.getByTestId('timeline-row')).toHaveCount(0)
  await page.getByRole('status').getByRole('button', { name: 'ביטול' }).click()
  await expect(page.getByTestId('timeline-row')).toHaveCount(1)
})
