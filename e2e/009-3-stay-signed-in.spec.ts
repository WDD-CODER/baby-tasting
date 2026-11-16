import { expect, test } from '@playwright/test'
import { ensureBaby, monthsAgo, resetHousehold, signIn } from './support/session'

test('009-3: after signing in, a new page of the same browser opens the Tracker home without the sign-in page', async ({
  page,
  context,
  request,
}) => {
  await resetHousehold(request)
  await signIn(page)
  await ensureBaby(page, { name: 'נועה', birthDate: monthsAgo(5) })
  await page.close()

  const fresh = await context.newPage()
  const paths: string[] = []
  fresh.on('framenavigated', (frame) => {
    if (frame === fresh.mainFrame()) paths.push(new URL(frame.url()).pathname)
  })
  await fresh.goto('/')
  await expect(fresh.getByText('יום חדש ורענן!')).toBeVisible()
  expect(new URL(fresh.url()).pathname).toBe('/')
  expect(paths).not.toContain('/login')
  await expect(fresh.getByRole('button', { name: 'כניסה' })).toHaveCount(0)
  await fresh.screenshot({ path: 'e2e/screens/009-3.png' })
})
