/**
 * E2E smoke tests — SeMa Calendar
 *
 * These tests verify that the application loads correctly and primary
 * navigation flows work without crashing.
 *
 * Requirements:
 *   - The dev server must be running on localhost:3000 (npm run dev)
 *   - Tests do NOT connect to production data
 *   - Tests do NOT use real credentials
 *   - Tests use the landing page user-selection flow to avoid
 *     touching production authentication
 *
 * Run:  npm run test:e2e
 */

import { test, expect, type Page } from '@playwright/test'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Navigate to the landing page and select the test user.
 * This is the real app flow — no mock credentials required.
 */
async function selectUser(page: Page, user: 'Mateo' | 'Seval' = 'Mateo') {
  await page.goto('/')
  // Wait for the user selection buttons to be visible
  await page.waitForSelector(`button:has-text("${user}")`, { timeout: 10_000 })
  await page.click(`button:has-text("${user}")`)
  // Should redirect to /together
  await page.waitForURL('**/together', { timeout: 10_000 })
}

/**
 * Collect all console errors that occur during the test.
 * Returned as an array of strings for assertion.
 */
function collectErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  page.on('pageerror', err => {
    errors.push(err.message)
  })
  return errors
}

// ── Application load ──────────────────────────────────────────────────────────

test.describe('Application load', () => {
  test('landing page loads without fatal error', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    // Page should render something meaningful
    await expect(page.locator('body')).not.toBeEmpty()
    // No unhandled JS errors
    const fatalErrors = errors.filter(e => !e.includes('Warning:') && !e.includes('[HMR]'))
    expect(fatalErrors).toHaveLength(0)
  })

  test('landing page shows user selection', async ({ page }) => {
    await page.goto('/')
    // Expect both user buttons to be visible
    await expect(page.locator('button:has-text("Mateo"), button:has-text("Seval")').first()).toBeVisible({ timeout: 10_000 })
  })

  test('selecting a user navigates to /together', async ({ page }) => {
    await selectUser(page, 'Mateo')
    expect(page.url()).toContain('/together')
  })
})

// ── Bottom navigation ──────────────────────────────────────────────────────────

test.describe('BottomNav navigation', () => {
  test.beforeEach(async ({ page }) => {
    await selectUser(page, 'Mateo')
  })

  test('bottom navigation bar is visible', async ({ page }) => {
    await expect(page.locator('nav[aria-label="Main navigation"]')).toBeVisible()
  })

  test('navigates to Planner', async ({ page }) => {
    await page.click('nav a[aria-label="Planner"]')
    await page.waitForURL('**/planner', { timeout: 8_000 })
    expect(page.url()).toContain('/planner')
  })

  test('navigates to Finances (Plans)', async ({ page }) => {
    await page.click('nav a[aria-label="Finances"]')
    await page.waitForURL('**/plans', { timeout: 8_000 })
    expect(page.url()).toContain('/plans')
  })

  test('navigates to Us', async ({ page }) => {
    await page.click('nav a[aria-label="Us"]')
    await page.waitForURL('**/us', { timeout: 8_000 })
    expect(page.url()).toContain('/us')
  })

  test('navigates back to Home', async ({ page }) => {
    // First go to Planner
    await page.click('nav a[aria-label="Planner"]')
    await page.waitForURL('**/planner', { timeout: 8_000 })
    // Then back to Home
    await page.click('nav a[aria-label="Home"]')
    await page.waitForURL('**/together', { timeout: 8_000 })
    expect(page.url()).toContain('/together')
  })
})

// ── Primary routes ─────────────────────────────────────────────────────────────

test.describe('Primary routes — no crash', () => {
  test.beforeEach(async ({ page }) => {
    await selectUser(page, 'Mateo')
  })

  test('Home (/together) loads without crash', async ({ page }) => {
    const errors = collectErrors(page)
    await expect(page.locator('main')).toBeVisible()
    const fatalErrors = errors.filter(e => !e.includes('Warning:') && !e.includes('[HMR]'))
    expect(fatalErrors).toHaveLength(0)
  })

  test('Planner (/planner) loads without crash', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/planner')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('main')).toBeVisible()
    const fatalErrors = errors.filter(e => !e.includes('Warning:') && !e.includes('[HMR]'))
    expect(fatalErrors).toHaveLength(0)
  })

  test('Finances (/plans) loads without crash', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/plans')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('main')).toBeVisible()
    const fatalErrors = errors.filter(e => !e.includes('Warning:') && !e.includes('[HMR]'))
    expect(fatalErrors).toHaveLength(0)
  })

  test('Us (/us) loads without crash', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/us')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('main')).toBeVisible()
    const fatalErrors = errors.filter(e => !e.includes('Warning:') && !e.includes('[HMR]'))
    expect(fatalErrors).toHaveLength(0)
  })

  test('Shopping (/shopping) loads without crash', async ({ page }) => {
    const errors = collectErrors(page)
    await page.goto('/shopping')
    await page.waitForLoadState('domcontentloaded')
    const fatalErrors = errors.filter(e => !e.includes('Warning:') && !e.includes('[HMR]'))
    expect(fatalErrors).toHaveLength(0)
  })
})

// ── Global Add (FAB) ───────────────────────────────────────────────────────────

test.describe('Global Add button (FAB)', () => {
  test.beforeEach(async ({ page }) => {
    await selectUser(page, 'Mateo')
  })

  test('FAB is visible on the home screen', async ({ page }) => {
    const fab = page.locator('button[aria-label="Add something"]')
    await expect(fab).toBeVisible()
  })

  test('FAB opens the QuickAdd sheet', async ({ page }) => {
    await page.click('button[aria-label="Add something"]')
    // The sheet should appear — look for a dialog or sheet panel
    await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 5_000 })
  })

  test('opened sheet can be closed', async ({ page }) => {
    await page.click('button[aria-label="Add something"]')
    await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 5_000 })

    // Try pressing Escape to close
    await page.keyboard.press('Escape')
    // Sheet should disappear
    await expect(page.locator('[role="dialog"]').first()).not.toBeVisible({ timeout: 5_000 })
  })
})

// ── Layout — horizontal overflow ──────────────────────────────────────────────

test.describe('Layout — no horizontal overflow', () => {
  async function checkNoHorizontalScroll(page: Page, route: string) {
    await page.goto(route)
    await page.waitForLoadState('domcontentloaded')
    const hasScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    return hasScroll
  }

  test('no horizontal overflow on Home (mobile)', async ({ page }) => {
    await selectUser(page, 'Mateo')
    const hasScroll = await checkNoHorizontalScroll(page, '/together')
    expect(hasScroll).toBe(false)
  })

  test('no horizontal overflow on Planner (mobile)', async ({ page }) => {
    await selectUser(page, 'Mateo')
    const hasScroll = await checkNoHorizontalScroll(page, '/planner')
    expect(hasScroll).toBe(false)
  })

  test('no horizontal overflow on Finances (mobile)', async ({ page }) => {
    await selectUser(page, 'Mateo')
    const hasScroll = await checkNoHorizontalScroll(page, '/plans')
    expect(hasScroll).toBe(false)
  })

  test('no horizontal overflow on Us (mobile)', async ({ page }) => {
    await selectUser(page, 'Mateo')
    const hasScroll = await checkNoHorizontalScroll(page, '/us')
    expect(hasScroll).toBe(false)
  })
})

// ── Both users ────────────────────────────────────────────────────────────────

test.describe('Both users can log in', () => {
  test('Seval can select and reach /together', async ({ page }) => {
    await selectUser(page, 'Seval')
    expect(page.url()).toContain('/together')
  })
})
