import { defineConfig, devices } from '@playwright/test'

// Exercise the real production-built route, never the development-only shell.
const baseURL = process.env.SHOPPING_QA_URL
  ?? 'https://sema-calendar-git-fix-iphone-pwa-mateo-s-projects123.vercel.app'
const host = new URL(baseURL).hostname
if (!['localhost', '127.0.0.1'].includes(host)
  && !/^sema-calendar-.+-mateo-s-projects123\.vercel\.app$/.test(host)) {
  throw new Error('Shopping QA must target localhost or a SeMa Preview deployment')
}

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'shopping-preview.spec.ts',
  workers: 1,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL,
    viewport: { width: 367, height: 599 },
    serviceWorkers: 'block',
    contextOptions: { reducedMotion: 'reduce' },
    screenshot: 'only-on-failure',
    trace: 'off',
  },
  projects: [
    { name: 'desktop-chrome', grep: /top add-item|resizing/, use: { browserName: 'chromium', channel: 'chrome' } },
    // Mobile viewport metrics with the normal desktop UA, without a device preset.
    { name: 'responsive-chromium', grep: /top add-item/, use: { browserName: 'chromium', isMobile: true, hasTouch: true } },
    { name: 'iphone-webkit', grep: /top add-item/, use: { ...devices['iPhone 14'], browserName: 'webkit', viewport: { width: 367, height: 599 } } },
    { name: 'android', grep: /Android retains/, use: { ...devices['Pixel 7'], browserName: 'chromium' } },
  ],
})
