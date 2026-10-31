import { test, expect } from '@playwright/test'

test.beforeAll(async ({ request }) => {
  // Warm development-only route aliases before WebKit navigation, matching the
  // main iPhone suite. First-time compilation can otherwise trigger Fast Refresh.
  for (const route of ['plans', 'together', 'us']) await request.get(`/dev-preview/${route}`, { timeout: 30_000 })
})

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && !url.pathname.startsWith('/api/')
      ? route.continue() : route.abort()
  })
})

test('finance editors suppress shell controls on iPhone only and restore them after closing', async ({ page }, testInfo) => {
  await page.goto('/dev-preview/plans')
  const ios = await page.evaluate(() => /iPad|iPhone|iPod/.test(navigator.userAgent))
  await page.getByRole('button', { name: /^Income/ }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  for (const selector of ['.glass-nav', '.app-fab', '.activity-bell', '.partner-note-trigger']) {
    const control = page.locator(selector)
    if (ios) await expect(control).toBeHidden()
    else await expect(control).toHaveCSS('visibility', 'visible')
  }
  await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeInViewport()
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-ios-modal-open')
  await expect(page.getByRole('navigation', { name: 'Preview navigation' })).toBeVisible()
  await page.getByRole('button', { name: 'Category', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Add Category', exact: true })).toBeInViewport()
  await page.screenshot({ path: testInfo.outputPath('finance-editor.png') })
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Preview navigation' })).toBeVisible()
})

test('daily budgets and days together work locally on iPhone and stay absent elsewhere', async ({ page }, testInfo) => {
  await page.goto('/dev-preview/plans')
  const ios = await page.evaluate(() => /iPad|iPhone|iPod/.test(navigator.userAgent))
  if (!ios) {
    await expect(page.getByRole('button', { name: 'Daily budget', exact: true })).toHaveCount(0)
    await page.goto('/dev-preview/us')
    await expect(page.getByRole('button', { name: 'Days together', exact: true })).toHaveCount(0)
    return
  }
  await page.getByRole('button', { name: 'Daily budget', exact: true }).click()
  const budget = page.getByRole('dialog', { name: 'Daily budget', exact: true })
  await budget.getByLabel('Daily budget amount').fill('20,75')
  await page.evaluate(() => {
    Object.defineProperty(visualViewport!, 'height', { configurable: true, value: 300 })
    visualViewport!.dispatchEvent(new Event('resize'))
  })
  await expect(budget.getByRole('button', { name: 'Save daily budget' })).toBeInViewport()
  await budget.getByRole('button', { name: 'Save daily budget' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Daily budget', exact: true })).toContainText('€20.75')
  // Seed only the existing offline fixture cache; no authenticated store or API.
  await page.evaluate(() => {
    const key = 'semacalendar-dev-preview-v1'
    const state = JSON.parse(localStorage.getItem(key)!)
    state.countdowns.push({ id: 'qa-days-start', title: 'Our beginning', date: '2020-02-29', emoji: '💕', createdBy: 'mateo' })
    localStorage.setItem(key, JSON.stringify(state))
  })
  for (const route of ['together', 'us']) {
    await page.goto(`/dev-preview/${route}`)
    if (route === 'us') {
      const hero = page.getByRole('button', { name: 'Toggle total days together' })
      await hero.click()
      await expect(hero).toHaveAttribute('aria-pressed', 'true')
      await expect(hero).toContainText('days together')
      await hero.press('Enter')
      await expect(hero).toHaveAttribute('aria-pressed', 'false')
    }
    await page.getByRole('button', { name: 'Days together', exact: true }).click()
    const days = page.getByRole('dialog', { name: 'Days together', exact: true })
    await days.getByLabel('Count days from').selectOption('qa-days-start')
    await expect(days.getByRole('status')).toContainText('days together')
    await expect(days.getByRole('status')).toContainText('29 February 2020')
    await page.screenshot({ path: testInfo.outputPath(`days-${route}.png`) })
    await days.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page.getByRole('navigation', { name: 'Preview navigation' })).toBeVisible()
  }
})
