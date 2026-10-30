import { test, expect, type Page } from '@playwright/test'

const routes = ['together', 'planner', 'calendar', 'goals', 'wishlist', 'todos', 'notes', 'shopping', 'plans', 'us']
const errors = new WeakMap<Page, string[]>()
test.beforeAll(async ({ request }) => {
  // Compile dev routes before opening WebKit, avoiding Fast Refresh navigation
  // interruptions during a first visit to a route that re-exports a page.
  for (const route of routes) await request.get(`/dev-preview/${route}`, { timeout: 30_000 })
})

// This suite exercises real page components through the existing isolated shell.
// No credentials, live data, push delivery or backend writes are permitted.
test.beforeEach(async ({ page }) => {
  const failures: string[] = []
  errors.set(page, failures)
  page.on('pageerror', error => { failures.push(error.message); console.log('PAGE ERROR:', error.message) })
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return route.abort()
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, json: { error: 'Offline fixture audit' } })
    return route.continue()
  })
})
test.afterEach(async ({ page }) => { expect(errors.get(page)).toEqual([]) })

async function fits(page: Page) {
  // scrollWidth/clientWidth use the same coordinate space. Windows WebKit can
  // report innerWidth in OS-scaled units (256 for a 320px layout at 125% DPI).
  const geometry = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, inner: innerWidth }))
  // Permit only subpixel rounding to the next integer CSS pixel.
  expect(geometry.scroll, JSON.stringify({ url: page.url(), ...geometry })).toBeLessThanOrEqual(page.viewportSize()!.width + 1)
  // Check actual content, since overflow-x:hidden can conceal a broken layout.
  expect(await page.locator('main').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
}

for (const standalone of [false, true]) {
  test(`${standalone ? 'standalone' : 'browser'} screens and reachable note action`, async ({ page }) => {
    await page.addInitScript(({ standalone }) => {
      const match = window.matchMedia.bind(window)
      window.matchMedia = query => query === '(display-mode: standalone)'
        ? Object.defineProperty(match(query), 'matches', { value: standalone }) : match(query)
      Object.defineProperty(navigator, 'standalone', { value: standalone })
      document.addEventListener('DOMContentLoaded', () => {
        // Desktop engines do not provide iPhone hardware insets. Exercise the
        // same CSS variables with representative notch/Home indicator values.
        document.documentElement.style.setProperty('--safe-top', standalone ? '47px' : '0px')
        document.documentElement.style.setProperty('--safe-bottom', standalone ? '34px' : '0px')
      })
    }, { standalone })
    for (const route of routes) {
      console.log('Auditing', route)
      await page.goto(`/dev-preview/${route}`, { waitUntil: 'domcontentloaded', timeout: 25000 })
      await expect(page.getByRole('navigation', { name: 'Preview navigation' })).toBeVisible({ timeout: 20_000 })
      await fits(page)
      if (standalone) await expect(page.locator('nav')).toHaveCSS('padding-bottom', '34px')
    }
    await page.getByRole('button', { name: 'Add something', exact: true }).click()
    const sheet = page.getByRole('dialog', { name: 'Add something', exact: true })
    await expect(sheet).toBeVisible()
    await sheet.getByRole('button', { name: /note/i }).click()
    const text = sheet.getByPlaceholder('Write something from the heart...')
    await text.fill('A long loving note '.repeat(40))
    await expect(text).toHaveValue('A long loving note '.repeat(40))
    const send = sheet.getByRole('button', { name: 'Send with love' })
    await expect(send).toBeInViewport()
    // Simulate a keyboard resize without remounting or modifying form state.
    await page.evaluate(() => {
      Object.defineProperty(visualViewport!, 'height', { configurable: true, value: 300 })
      visualViewport!.dispatchEvent(new Event('resize'))
    })
    await expect(page.locator('html')).toHaveCSS('--visual-height', '300px')
    await expect(send).toBeInViewport()
    const keyboardAction = await send.boundingBox()
    expect(keyboardAction!.y + keyboardAction!.height).toBeLessThanOrEqual(301)
    await expect(text).toHaveValue('A long loving note '.repeat(40))
    await page.evaluate(() => {
      Reflect.deleteProperty(visualViewport!, 'height')
      visualViewport!.dispatchEvent(new Event('resize'))
    })
    const bounds = await sheet.boundingBox()
    expect(bounds!.y).toBeGreaterThanOrEqual(0)
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual((await page.evaluate(() => innerHeight)) + 1)
    await expect(page.locator('main')).toHaveCSS('overflow-y', 'hidden')
    await send.click()
    await expect(sheet.getByText('Sent', { exact: true })).toBeVisible()
  })
}

test('login and viewport metadata', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).toContain('viewport-fit=cover')
  expect(await page.locator('link[rel="apple-touch-icon"]').count()).toBeGreaterThan(0)
})

test('date/time controls, checklist draft, nested preferences and landscape', async ({ page }) => {
  await page.goto('/dev-preview/planner', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Add something', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Add something', exact: true })
  await sheet.getByRole('button', { name: 'Moment', exact: true }).click()
  const title = sheet.getByPlaceholder('Name this moment...')
  const draft = 'Long title '.repeat(30)
  await title.fill(draft)
  await sheet.getByRole('button', { name: 'Select date', exact: true }).click()
  const calendar = sheet.getByRole('dialog', { name: 'Calendar', exact: true })
  await calendar.getByRole('button', { name: 'Next month' }).click()
  await calendar.getByRole('button', { name: 'Previous month' }).click()
  await calendar.getByRole('button', { name: /, 20\d\d/ }).nth(10).click()
  await sheet.getByRole('button', { name: 'Select time', exact: true }).click()
  const wheel = sheet.getByRole('listbox', { name: 'Hour', exact: true })
  await wheel.focus()
  await wheel.press('ArrowDown')
  await sheet.getByRole('button', { name: /^Set \d\d:\d\d$/ }).click()
  const item = sheet.getByPlaceholder('Add item...')
  await item.fill('A checklist item with a long translated description')
  await item.press('Enter')
  await expect(item).toHaveValue('')
  await expect(title).toHaveValue(draft)
  await expect(sheet.getByRole('button', { name: 'Save Moment' })).toBeInViewport()
  const original = page.viewportSize()!
  await page.setViewportSize({ width: original.height, height: original.width })
  await expect(title).toHaveValue(draft)
  await expect(sheet.getByRole('button', { name: 'Save Moment' })).toBeInViewport()
  await sheet.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(sheet).not.toBeVisible()
  await page.setViewportSize(original)
  await page.getByRole('button', { name: /^Open Activity Centre/ }).click()
  const activity = page.getByRole('dialog', { name: 'Activity Centre', exact: true })
  await activity.getByRole('button', { name: 'Notification preferences', exact: true }).click()
  const preferences = page.getByRole('dialog', { name: 'Notification preferences', exact: true })
  await expect(preferences.getByText('Quiet hours', { exact: true })).toBeVisible()
  await preferences.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(preferences).not.toBeVisible()
  await expect(activity).toBeVisible()
  await expect(page.locator('main')).toHaveCSS('overflow-y', 'hidden')
  await activity.getByRole('button', { name: 'Close Activity Centre' }).click()
  await expect(activity).not.toBeVisible()
  await expect(page.locator('main')).toHaveCSS('overflow-y', 'auto')
})

test('event creation, editing and nested delete cancellation stay reachable', async ({ page }) => {
  await page.goto('/dev-preview/calendar', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Add something', exact: true }).click()
  const create = page.getByRole('dialog', { name: 'Add something', exact: true })
  await create.getByPlaceholder('Name this moment...').fill('iPhone fixture moment')
  await create.getByRole('button', { name: 'Select date', exact: true }).click()
  const today = await page.evaluate(() => new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }))
  await create.getByRole('button', { name: today, exact: true }).click()
  await create.getByRole('button', { name: 'Save Moment', exact: true }).click()
  await expect(create).not.toBeVisible()
  await page.locator('main').getByRole('button', { name: /^iPhone fixture moment/ }).click()
  const edit = page.getByRole('dialog', { name: 'Edit event', exact: true })
  await edit.getByPlaceholder('Event title...').fill('An edited event with a very long title '.repeat(12))
  await expect(edit.getByRole('button', { name: 'Save Changes', exact: true })).toBeInViewport()
  await edit.getByRole('button', { name: 'Delete Event', exact: true }).click()
  const confirm = page.getByRole('dialog', { name: 'Delete Event?', exact: true })
  await expect(confirm.getByRole('button', { name: 'Delete', exact: true })).toBeInViewport()
  await confirm.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(confirm).not.toBeVisible()
  await expect(edit).toBeVisible()
  await expect(page.locator('main')).toHaveCSS('overflow-y', 'hidden')
  await edit.getByRole('button', { name: 'Save Changes', exact: true }).click()
  await expect(edit).not.toBeVisible()
})
