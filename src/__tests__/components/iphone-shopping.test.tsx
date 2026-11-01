import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { ShoppingListEditorSheet } from '@/components/ui/ShoppingListEditorSheet'
import { clearActiveCouple, useAppStore } from '@/store/useAppStore'
import { firstShoppingPhoto, isShoppingQuantity } from '@/lib/shopping-input'

let narrow = false

beforeEach(() => {
  narrow = false
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query === '(max-width: 767px)' && narrow,
    media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }))
  clearActiveCouple()
  useAppStore.setState({ currentUser: 'mateo' })
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')
})
afterEach(() => { clearActiveCouple(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

it.each(['create', 'edit'] as const)('supports digits and quantity Enter in a generic narrow laptop preview: %s', mode => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/156.0.0.0')
  narrow = true
  const list = { id: 'test-list', name: 'Test', items: [], createdBy: 'mateo' as const, createdAt: '', updatedAt: '', isCompleted: false }
  if (mode === 'edit') useAppStore.setState({ shoppingLists: [list] })
  const save = vi.fn()
  render(<ShoppingListEditorSheet mode={mode} list={mode === 'edit' ? list : undefined} onSave={save} onClose={() => {}} />)
  const name = screen.getByPlaceholderText('Item name…')
  const qty = screen.getByLabelText('Item quantity')
  expect(qty).toHaveAttribute('type', 'text')
  fireEvent.change(name, { target: { value: 'Pears' } })
  fireEvent.change(qty, { target: { value: '3' } })
  fireEvent.change(qty, { target: { value: '3e' } })
  expect(qty).toHaveValue('3')
  qty.focus()
  fireEvent.keyDown(qty, { key: 'Enter' })
  expect(name).toHaveValue('')
  expect(name).toHaveFocus()
  expect(save).not.toHaveBeenCalled()
  if (mode === 'edit') expect(useAppStore.getState().shoppingLists[0].items).toMatchObject([{ name: 'Pears', quantity: 3 }])
  else expect(screen.getByText('Pears')).toBeInTheDocument()
})

it('Enter from price adds the draft item and focuses the next name without saving the list', () => {
  const save = vi.fn()
  render(<ShoppingListEditorSheet mode="create" onSave={save} onClose={() => {}} />)
  const name = screen.getByPlaceholderText('Item name…')
  fireEvent.change(name, { target: { value: 'Pears' } })
  fireEvent.change(screen.getByLabelText('Item quantity'), { target: { value: '2' } })
  const price = screen.getByPlaceholderText('€')
  fireEvent.change(price, { target: { value: '3.50' } })
  price.focus()
  fireEvent.keyDown(price, { key: 'Enter' })
  expect(screen.getByText('Pears')).toBeInTheDocument()
  expect(name).toHaveFocus()
  expect(name).toHaveValue('')
  expect(screen.getByLabelText('Item quantity')).toHaveValue('1')
  expect(save).not.toHaveBeenCalled()
  expect(useAppStore.getState().shoppingLists).toHaveLength(0)
})

it('rejects exponent/letter/pasted quantity text while accepting digits', () => {
  render(<ShoppingListEditorSheet mode="create" onSave={() => {}} onClose={() => {}} />)
  const qty = screen.getByLabelText('Item quantity')
  fireEvent.change(qty, { target: { value: '12' } })
  for (const value of ['12e', '1e3', 'cat', '2.5', '-2', '+3']) {
    fireEvent.change(qty, { target: { value } })
    expect(qty).toHaveValue('12')
  }
  expect(isShoppingQuantity('')).toBe(true)
  expect(isShoppingQuantity('003')).toBe(true)
})

it('leaves the Android quantity input and Enter behavior unchanged', () => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (Linux; Android 15; Samsung)')
  render(<ShoppingListEditorSheet mode="create" onSave={() => {}} onClose={() => {}} />)
  const qty = screen.getByLabelText('Item quantity')
  expect(qty).toHaveAttribute('type', 'number')
  expect(qty).toHaveAttribute('inputmode', 'decimal')
  const name = screen.getByPlaceholderText('Item name…')
  fireEvent.change(name, { target: { value: 'Pears' } })
  fireEvent.keyDown(screen.getByPlaceholderText('€'), { key: 'Enter' })
  expect(name).toHaveValue('Pears')
})

it('uses only the first attached photo, with a single-photo fallback', () => {
  expect(firstShoppingPhoto({ photos: ['first', 'second'], photo: 'old' })).toBe('first')
  expect(firstShoppingPhoto({ photos: ['', 'first', 'second'] })).toBe('first')
  expect(firstShoppingPhoto({ photo: 'single' })).toBe('single')
  expect(firstShoppingPhoto({})).toBeUndefined()
})
