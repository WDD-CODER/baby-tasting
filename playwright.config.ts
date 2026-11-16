import { defineConfig, devices } from '@playwright/test'

// End-to-end tests for [ui] Done-when items. They expect the app to be running already:
// frontend on E2E_BASE_URL (default the main folder's http://localhost:4200) and its backend.
// A slot serves on 4200+N: set E2E_BASE_URL=http://localhost:420N.
export default defineConfig({
  testDir: 'e2e',
  outputDir: 'e2e/.results',
  fullyParallel: false,
  workers: 1,
  // a remote database (Atlas) is slower than a local one: E2E_EXPECT_TIMEOUT=15000 gives assertions more time
  expect: { timeout: Number(process.env['E2E_EXPECT_TIMEOUT'] ?? 5000) },
  reporter: [['list']],
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:4200',
    locale: 'he-IL',
    timezoneId: 'Asia/Jerusalem',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-360',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 780 } },
    },
  ],
})
