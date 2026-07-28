import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'html',
  timeout: 30_000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile-small',
      use: {
        ...devices['iPhone SE'],
        viewport: { width: 320, height: 568 },
      },
    },
    {
      name: 'mobile-large',
      use: {
        ...devices['iPhone 14'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'mobile-xl',
      use: {
        viewport: { width: 453, height: 926 },
        userAgent: devices['iPhone 14 Plus'].userAgent,
      },
    },
    {
      name: 'desktop',
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  // Do NOT start the dev server automatically — the user must run `npm run dev` separately.
  // This prevents accidental connections to production.
})
