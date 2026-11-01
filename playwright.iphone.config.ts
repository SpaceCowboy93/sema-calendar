import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
  ...base,
  testMatch: '**/iphone-*.spec.ts',
  reporter: [['list']],
  timeout: 120_000,
  use: { ...base.use, actionTimeout: 10_000, navigationTimeout: 30_000 },
  projects: [
    ...[320, 375, 390, 393, 414, 430].map(width => ({
      name: `webkit-${width}`,
      use: { ...devices['iPhone 14'], browserName: 'webkit' as const, viewport: { width, height: width === 320 ? 568 : 844 } },
    })),
    // Also verify exact CSS viewport metrics independently of Windows WebKit DPI.
    ...[320, 375, 390, 393, 414, 430].map(width => ({
      name: `chromium-${width}`,
      use: { ...devices['iPhone 14'], browserName: 'chromium' as const, viewport: { width, height: width === 320 ? 568 : 844 } },
    })),
    { name: 'android', use: { ...devices['Pixel 7'], browserName: 'chromium', userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36' } },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
  ],
})
