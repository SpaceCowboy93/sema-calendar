import { test, expect } from '@playwright/test'

test.beforeAll(async ({ request }) => { await request.get('/dev-preview/shopping', { timeout: 30_000 }) })
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    return ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && !url.pathname.startsWith('/api/')
      ? route.continue() : route.abort()
  })
})

test('shopping Enter, digits-only quantity and first-photo thumbnails', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 367, height: 599 })
  await page.goto('/dev-preview/shopping')
  const ios = await page.evaluate(() => /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (matchMedia('(max-width: 767px)').matches && !/Android/i.test(navigator.userAgent)))
  await page.getByRole('button', { name: /New list/ }).click()
  const sheet = page.getByRole('dialog', { name: 'New Shopping List' })
  await sheet.getByPlaceholder(/List name/).fill('Keyboard QA')
  const name = sheet.getByPlaceholder('Item name…')
  const qty = sheet.getByLabel('Item quantity', { exact: true })
  const price = sheet.getByPlaceholder('€', { exact: true })
  await name.fill('Pears')
  await qty.fill('2')
  await price.fill('3.50')
    await expect(qty).toHaveAttribute('type', 'text')
    await qty.pressSequentially('eE+-x')
    await expect(qty).toHaveValue('2')
    await qty.fill('1e3')
    await expect(qty).toHaveValue('2')
    await price.press('Enter')
    await expect(name).toBeFocused()
    await expect(name).toHaveValue('')
    await expect(qty).toHaveValue('1')
    await expect(sheet.getByText('Pears', { exact: true })).toBeVisible()
    await name.fill('Apples')
    await qty.fill('3')
    await qty.press('Enter')
    await expect(name).toBeFocused()
    await expect(sheet.getByText('Apples', { exact: true })).toBeVisible()
    await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: 'Close', exact: true }).click()
  const first = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect width="30" height="30" fill="red"/></svg>')
  const second = first.replace('red', 'blue')
  await page.evaluate(({ first, second }) => {
    const key = 'semacalendar-dev-preview-v1'
    const state = JSON.parse(localStorage.getItem(key)!)
    state.shoppingLists = [{ id: 'photo-qa', name: 'Photo QA', createdAt: '2099-01-01T00:00:00Z', updatedAt: '2099-01-01T00:00:00Z', createdBy: 'mateo', isCompleted: false, items: [
      { id: 'photo-1', name: 'Single photo pears', quantity: 1, isChecked: false, createdAt: '', photo: first },
      { id: 'photo-2', name: 'Gallery apples', quantity: 2, isChecked: false, createdAt: '', photos: [first, second] },
    ] }]
    localStorage.setItem(key, JSON.stringify(state))
  }, { first, second })
  await page.reload()
  await page.getByRole('button', { name: /Photo QA/ }).first().click()
  for (const title of ['Single photo pears', 'Gallery apples']) {
    const photo = page.getByRole('img', { name: `${title} photo`, exact: true })
    if (ios) { await expect(photo).toHaveCount(1); await expect(photo).toHaveAttribute('src', first) }
    else await expect(photo).toHaveCount(0)
  }
  await page.getByRole('button', { name: 'Edit Photo QA', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Edit Shopping List' })
  const editName = editor.getByPlaceholder('Item name…')
  const editQty = editor.getByLabel('Item quantity', { exact: true })
    await expect(editQty).toHaveAttribute('type', 'text')
    await editName.fill('New edit-list item')
    await editQty.fill('4')
    await editQty.pressSequentially('eE')
    await expect(editQty).toHaveValue('4')
    await editQty.press('Enter')
    await expect(editName).toBeFocused()
    await expect(editName).toHaveValue('')
    await expect(editQty).toHaveValue('1')
    await expect(editor.getByText('New edit-list item', { exact: true })).toHaveCount(1)
    await expect(editor).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('shopping-367.png') })
})
