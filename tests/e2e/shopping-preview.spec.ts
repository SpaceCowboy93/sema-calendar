import { test, expect } from '@playwright/test'
import { isolateShoppingPreview } from '../fixtures/shoppingPreview'

test.beforeEach(async ({ context, baseURL }) => {
  await isolateShoppingPreview(context, baseURL!)
})

for (const mode of ['create', 'edit'] as const) {
  test(`${mode}: top add-item quantity rejects letters and Enter adds exactly once`, async ({ page, browserName, context }, testInfo) => {
    test.skip(testInfo.project.name === 'android', 'Android has a separate regression contract below')
    await page.goto('/shopping')
    if (mode === 'edit') await page.getByRole('button', { name: 'Edit Isolated Shopping QA', exact: true }).click()
    else await page.getByRole('button', { name: 'New list Start another list', exact: true }).click()
    const sheet = page.getByRole('dialog', { name: mode === 'edit' ? 'Edit Shopping List' : 'New Shopping List', exact: true })
    const name = sheet.getByPlaceholder('Item name…')
    const qty = sheet.getByLabel('Item quantity', { exact: true })
    await sheet.getByPlaceholder(/List name/).fill('Unsaved metadata QA')
    await expect(qty).toHaveCount(1)
    await expect(qty).toHaveAttribute('type', 'text')
    await expect(qty).toHaveAttribute('inputmode', 'numeric')
    await expect(qty).toHaveValue('1')
    if (testInfo.project.name !== 'iphone-webkit') {
      expect(await page.evaluate(() => navigator.userAgent)).not.toMatch(/iPhone|iPad|Android/)
      expect(await page.evaluate(() => ({ width: innerWidth, height: innerHeight }))).toEqual({ width: 367, height: 599 })
    }
    await name.fill('Quantity Enter QA')
    await qty.fill('4')
    for (const key of ['e', 'E', 'x', '+', '-', '.']) {
      await qty.press(key)
      await expect(qty).toHaveValue('4')
    }
    for (const text of ['1e3', '2E4', 'cat', '2.5', '-2', '+3']) {
      await qty.fill(text)
      await expect(qty).toHaveValue('4')
    }
    if (browserName === 'chromium') {
      // Exercise an actual browser paste, rather than only a change/fill event.
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      await page.evaluate(() => navigator.clipboard.writeText('1e3'))
      await qty.focus()
      await qty.press('Control+V')
      await expect(qty).toHaveValue('4')
    }
    await qty.press('Enter')
    await expect(sheet).toBeVisible()
    await expect(name).toHaveValue('')
    await expect(name).toBeFocused()
    await expect(qty).toHaveValue('1')
    await expect(sheet.getByPlaceholder('€', { exact: true })).toHaveValue('')
    await expect(sheet.getByText('Quantity Enter QA', { exact: true })).toHaveCount(1)
    await expect(sheet.getByText('×4', { exact: true })).toHaveCount(1)
    await name.press('Enter')
    await expect(sheet.getByText('Quantity Enter QA', { exact: true })).toHaveCount(1)
    const lists = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(key => key.endsWith(':qa-isolated:sema'))!
      return JSON.parse(localStorage.getItem(key)!).state.shoppingLists
    })
    expect(lists).toHaveLength(1)
    expect(lists[0].name).toBe('Isolated Shopping QA') // Enter never saves list metadata.
    if (mode === 'edit') {
      const items = lists[0].items
      expect(items).toHaveLength(2)
      expect(items[1]).toMatchObject({ name: 'Quantity Enter QA', quantity: 4 })
    }
    await page.screenshot({ path: testInfo.outputPath(`${mode}-367x599.png`) })
  })

  test(`${mode}: Android retains its existing quantity and name-Enter behavior`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'android', 'Android-specific regression')
    await page.goto('/shopping')
    if (mode === 'edit') await page.getByRole('button', { name: 'Edit Isolated Shopping QA', exact: true }).click()
    else await page.getByRole('button', { name: 'New list Start another list', exact: true }).click()
    const sheet = page.getByRole('dialog', { name: mode === 'edit' ? 'Edit Shopping List' : 'New Shopping List', exact: true })
    const name = sheet.getByPlaceholder('Item name…')
    const qty = sheet.getByLabel('Item quantity', { exact: true })
    await expect(qty).toHaveAttribute('type', 'number')
    await expect(qty).toHaveAttribute('inputmode', 'decimal')
    await name.fill('Android fixture item')
    await qty.fill('3')
    await qty.press('Enter')
    await expect(name).toHaveValue('Android fixture item')
    await expect(sheet.getByText('Android fixture item', { exact: true })).toHaveCount(0)
    await name.press('Enter')
    await expect(sheet.getByText('Android fixture item', { exact: true })).toHaveCount(1)
    await expect(name).toHaveValue('')
    await expect(sheet).toBeVisible()
  })
}

test('resizing an already open desktop editor activates quantity controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chrome', 'Desktop resize transition')
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/shopping')
  await page.getByRole('button', { name: 'Edit Isolated Shopping QA', exact: true }).click()
  const sheet = page.getByRole('dialog', { name: 'Edit Shopping List', exact: true })
  const qty = sheet.getByLabel('Item quantity', { exact: true })
  await expect(qty).toHaveAttribute('type', 'number')
  await page.setViewportSize({ width: 367, height: 599 })
  await expect(qty).toHaveAttribute('type', 'text')
  const name = sheet.getByPlaceholder('Item name…')
  await name.fill('Resized fixture item')
  await qty.fill('5')
  await qty.pressSequentially('eE')
  await expect(qty).toHaveValue('5')
  await qty.press('Enter')
  await expect(sheet.getByText('Resized fixture item', { exact: true })).toHaveCount(1)
  await expect(sheet.getByText('×5', { exact: true })).toHaveCount(1)
  await expect(name).toBeFocused()
  await expect(name).toHaveValue('')
  await expect(sheet).toBeVisible()
})
