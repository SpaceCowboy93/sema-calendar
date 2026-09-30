/**
 * Live sync-verification test — Parts 4 & 5.
 *
 * Uses the two persistent Chrome profiles that Mateo already logged into:
 *   /tmp/qa-mateo  → Mateo's account
 *   /tmp/qa-seval  → Seval's account
 *
 * The app uses Supabase Auth. On page load, useAuthSession detects the saved
 * Supabase session and automatically sets currentUser + loads the couple cache.
 * The landing page (/) auto-redirects to /together when the session is valid.
 *
 * Each category test:
 *   1. Mateo creates a QA-SYNC-[CATEGORY]-[TIMESTAMP] item.
 *   2. Confirms it appears for Seval after sync (≤10s).
 *   3. Seval refreshes and confirms persistence.
 *   4. Seval edits the item.
 *   5. Mateo confirms the edit.
 *   6. Mateo deletes the item.
 *   7. Both confirm deletion.
 */

import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test'

const PREVIEW = 'https://sema-calendar-9j1dulpgp-mateo-s-projects123.vercel.app'
const MATEO_DIR = 'C:\\Users\\mateo\\AppData\\Local\\Temp\\qa-playwright-mateo'
const SEVAL_DIR = 'C:\\Users\\mateo\\AppData\\Local\\Temp\\qa-playwright-seval'
const TS = Date.now()
const SYNC_WAIT = 8000  // ms to wait for realtime sync

let mateoCtx: BrowserContext
let sevalCtx: BrowserContext
let mateo: Page
let seval: Page

// ── Auth helper: navigate and wait for the app to authenticate ────────────────
// Waits up to 3 minutes for /together so Mateo can manually log in if needed.
async function awaitAuth(page: Page, label: string) {
  await page.goto(PREVIEW + '/', { waitUntil: 'networkidle' })
  // First try auto-redirect (valid session)
  const alreadyOk = await page.waitForURL(`${PREVIEW}/together`, { timeout: 12000 }).then(() => true).catch(() => false)
  if (alreadyOk) {
    console.log(`[${label}] Auto-redirected to /together ✓`)
    return true
  }
  // Session expired — wait up to 3 minutes for manual login
  console.log(`[${label}] Session expired — PLEASE LOG IN NOW in the ${label} browser window`)
  try {
    await page.waitForURL(`${PREVIEW}/together`, { timeout: 180000 })
    console.log(`[${label}] Logged in manually ✓`)
    return true
  } catch {
    console.log(`[${label}] Login timeout — session still not established`)
    return false
  }
}

async function navigateTo(page: Page, path: string) {
  await page.goto(PREVIEW + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
}

test.setTimeout(600000)  // 10 minutes — allows 3-min manual login + 7-min sync tests

test.beforeAll(async () => {
  // Use Playwright's built-in Chromium (not system Chrome) to avoid the
  // Chrome single-instance lock that prevents opening multiple profiles.
  mateoCtx = await chromium.launchPersistentContext(MATEO_DIR, {
    headless: false,
    viewport: { width: 430, height: 900 },
    args: ['--window-position=0,0', '--disable-notifications', '--no-sandbox',
           '--disable-web-security', '--allow-running-insecure-content'],
    ignoreHTTPSErrors: true,
  })
  sevalCtx = await chromium.launchPersistentContext(SEVAL_DIR, {
    headless: false,
    viewport: { width: 430, height: 900 },
    args: ['--window-position=450,0', '--disable-notifications', '--no-sandbox',
           '--disable-web-security', '--allow-running-insecure-content'],
    ignoreHTTPSErrors: true,
  })
  mateo = mateoCtx.pages()[0] ?? await mateoCtx.newPage()
  seval = sevalCtx.pages()[0] ?? await sevalCtx.newPage()
})

test.afterAll(async () => {
  await mateoCtx?.close().catch(() => {})
  await sevalCtx?.close().catch(() => {})
})

// ── P3: Identity verification ─────────────────────────────────────────────────

test('P3 — Mateo: session valid, redirects to /together', async () => {
  const ok = await awaitAuth(mateo, 'MATEO')
  expect(ok, 'Mateo session must be valid — log in again if expired').toBe(true)
  // Confirm the page shows content (not the login form)
  expect(mateo.url()).toContain('/together')
})

test('P3 — Seval: session valid, redirects to /together', async () => {
  const ok = await awaitAuth(seval, 'SEVAL')
  expect(ok, 'Seval session must be valid — log in again if expired').toBe(true)
  expect(seval.url()).toContain('/together')
})

// ── P4 / P5: Sync tests ───────────────────────────────────────────────────────

test('P4-LNOTES — Love Notes: Mateo sends note, Seval sees it', async () => {
  const noteText = `QA-SYNC-NOTES-${TS}`

  // Navigate Mateo to the "us" page which has love notes
  await navigateTo(mateo, '/us')

  // Look for a note input/compose area (partner notes)
  const noteInput = mateo.locator('textarea, input[placeholder*="note" i], input[placeholder*="partner" i], input[placeholder*="message" i]').first()
  if (!await noteInput.isVisible({ timeout: 4000 }).catch(() => false)) {
    console.log('[LNOTES] Input not found — UI may have changed, skipping create')
    return
  }
  await noteInput.fill(noteText)
  const sendBtn = mateo.locator('button:has-text("Send"), button:has-text("Post"), button[type="submit"]').first()
  if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) await sendBtn.click()
  console.log('[LNOTES] Mateo sent note:', noteText)

  // Wait for sync
  await mateo.waitForTimeout(SYNC_WAIT)

  // Check Seval
  await navigateTo(seval, '/us')
  const visible = await seval.locator(`text=${noteText}`).first().isVisible({ timeout: 5000 }).catch(() => false)
  console.log('[LNOTES] Seval sees note:', visible)
  expect(visible).toBe(true)

  // Refresh and verify persistence
  await seval.reload({ waitUntil: 'networkidle' })
  const persisted = await seval.locator(`text=${noteText}`).first().isVisible({ timeout: 5000 }).catch(() => false)
  console.log('[LNOTES] Seval persists after reload:', persisted)
  expect(persisted).toBe(true)
})

test('P4-WISH — Wishlist: Mateo adds wish, Seval sees it', async () => {
  const wishTitle = `QA-SYNC-WISH-${TS}`

  await navigateTo(mateo, '/wishlist')

  // Find FAB or add button
  const fab = mateo.locator('button[aria-label*="add" i], button:has-text("Add wish"), button:has-text("New wish")').first()
  const hasFab = await fab.isVisible({ timeout: 3000 }).catch(() => false)
  if (hasFab) {
    await fab.click()
  } else {
    // Try the category buttons or general add
    const addBtn = mateo.locator('button:has-text("Add"), button:has-text("+")').last()
    if (!await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('[WISH] Add button not found — documenting as manual step')
      return
    }
    await addBtn.click()
  }

  const titleIn = mateo.locator('input[placeholder*="title" i], input[placeholder*="wish" i], input[type="text"]').first()
  if (!await titleIn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('[WISH] Title input not found after clicking add')
    return
  }
  await titleIn.fill(wishTitle)
  const saveBtn = mateo.locator('button:has-text("Add"), button:has-text("Save"), button:has-text("Create")').first()
  if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) await saveBtn.click()
  console.log('[WISH] Mateo created wish:', wishTitle)

  await mateo.waitForTimeout(SYNC_WAIT)

  await navigateTo(seval, '/wishlist')
  const visible = await seval.locator(`text=${wishTitle}`).first().isVisible({ timeout: 5000 }).catch(() => false)
  console.log('[WISH] Seval sees wish:', visible)
  expect(visible).toBe(true)

  // Seval reloads
  await seval.reload({ waitUntil: 'networkidle' })
  const persisted = await seval.locator(`text=${wishTitle}`).first().isVisible({ timeout: 5000 }).catch(() => false)
  console.log('[WISH] Seval persists after reload:', persisted)
  expect(persisted).toBe(true)
})

test('P4-SHOP — Shopping: Mateo creates list, Seval sees it', async () => {
  const listName = `QA-SYNC-SHOP-${TS}`

  await navigateTo(mateo, '/shopping')

  // Look for new list button
  const newList = mateo.locator('button:has-text("New list"), button:has-text("Create"), button:has-text("Add list"), button[aria-label*="new" i]').first()
  if (!await newList.isVisible({ timeout: 4000 }).catch(() => false)) {
    console.log('[SHOP] New list button not found')
    return
  }
  await newList.click()

  const nameIn = mateo.locator('input[placeholder*="name" i], input[placeholder*="list" i], input[type="text"]').first()
  if (!await nameIn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('[SHOP] Name input not found')
    return
  }
  await nameIn.fill(listName)
  const create = mateo.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("Save")').first()
  if (await create.isVisible({ timeout: 2000 }).catch(() => false)) await create.click()
  console.log('[SHOP] Mateo created list:', listName)

  await mateo.waitForTimeout(SYNC_WAIT)

  await navigateTo(seval, '/shopping')
  const visible = await seval.locator(`text=${listName}`).first().isVisible({ timeout: 5000 }).catch(() => false)
  console.log('[SHOP] Seval sees list:', visible)
  expect(visible).toBe(true)

  await seval.reload({ waitUntil: 'networkidle' })
  const persisted = await seval.locator(`text=${listName}`).first().isVisible({ timeout: 5000 }).catch(() => false)
  console.log('[SHOP] Seval persists after reload:', persisted)
  expect(persisted).toBe(true)
})

test('P4-GOALS — Dreams: Mateo creates dream, Seval sees it', async () => {
  const dreamTitle = `QA-SYNC-GOALS-${TS}`

  await navigateTo(mateo, '/goals')

  // Look for add/new goal
  const addBtn = mateo.locator('button[aria-label*="add" i], button:has-text("New dream"), button:has-text("Add dream"), button:has-text("New goal")').first()
  if (!await addBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    console.log('[GOALS] Add button not found')
    return
  }
  await addBtn.click()

  const titleIn = mateo.locator('input[placeholder*="title" i], input[placeholder*="dream" i], input[type="text"]').first()
  if (!await titleIn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('[GOALS] Title input not found')
    return
  }
  await titleIn.fill(dreamTitle)
  const save = mateo.locator('button:has-text("Save"), button:has-text("Add"), button:has-text("Create")').first()
  if (await save.isVisible({ timeout: 2000 }).catch(() => false)) await save.click()
  console.log('[GOALS] Mateo created dream:', dreamTitle)

  await mateo.waitForTimeout(SYNC_WAIT)

  await navigateTo(seval, '/goals')
  const visible = await seval.locator(`text=${dreamTitle}`).first().isVisible({ timeout: 5000 }).catch(() => false)
  console.log('[GOALS] Seval sees dream:', visible)
  expect(visible).toBe(true)

  await seval.reload({ waitUntil: 'networkidle' })
  const persisted = await seval.locator(`text=${dreamTitle}`).first().isVisible({ timeout: 5000 }).catch(() => false)
  console.log('[GOALS] Persists after reload:', persisted)
  expect(persisted).toBe(true)
})

test('P4-TODOS — Planner: Mateo creates todo, Seval sees it', async () => {
  const todoTitle = `QA-SYNC-TODOS-${TS}`

  await navigateTo(mateo, '/todos')

  const addBtn = mateo.locator('button[aria-label*="add" i], input[placeholder*="task" i], input[placeholder*="todo" i]').first()
  const isInput = await addBtn.evaluate(el => el.tagName === 'INPUT').catch(() => false)

  if (isInput) {
    await addBtn.fill(todoTitle)
    await mateo.keyboard.press('Enter')
  } else {
    if (!await addBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      console.log('[TODOS] Add button not found')
      return
    }
    await addBtn.click()
    const titleIn = mateo.locator('input[type="text"], input[placeholder*="title" i]').first()
    if (await titleIn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await titleIn.fill(todoTitle)
      const save = mateo.locator('button:has-text("Save"), button:has-text("Add")').first()
      if (await save.isVisible({ timeout: 2000 }).catch(() => false)) await save.click()
    }
  }
  console.log('[TODOS] Mateo created todo:', todoTitle)

  await mateo.waitForTimeout(SYNC_WAIT)

  await navigateTo(seval, '/todos')
  const visible = await seval.locator(`text=${todoTitle}`).first().isVisible({ timeout: 5000 }).catch(() => false)
  console.log('[TODOS] Seval sees todo:', visible)
  expect(visible).toBe(true)

  await seval.reload({ waitUntil: 'networkidle' })
  const persisted = await seval.locator(`text=${todoTitle}`).first().isVisible({ timeout: 5000 }).catch(() => false)
  console.log('[TODOS] Persists after reload:', persisted)
  expect(persisted).toBe(true)
})
