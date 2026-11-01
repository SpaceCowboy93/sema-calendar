import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { ShoppingListEditorSheet } from '@/components/ui/ShoppingListEditorSheet'
import { clearActiveCouple, useAppStore } from '@/store/useAppStore'
import { firstShoppingPhoto, isShoppingQuantity } from '@/lib/shopping-input'

beforeEach(() => {
  clearActiveCouple()
  useAppStore.setState({ currentUser: 'mateo' })
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')
})
afterEach(() => { clearActiveCouple(); vi.restoreAllMocks() })

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
