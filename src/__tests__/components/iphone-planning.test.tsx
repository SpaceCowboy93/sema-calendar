import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { DailyBudgetCard } from '@/components/ui/DailyBudgetCard'
import { DaysTogetherCard } from '@/components/ui/DaysTogetherCard'
import { calcMonth } from '@/lib/financeCalc'
import type { FinanceMonth } from '@/types'

const month: FinanceMonth = { key: '2026-01', income: 1000, budgetItems: [], isFinalized: false,
  createdAt: '', updatedAt: '', dailyBudgets: { '2026-01-04': 10 } }
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 0, 5, 12))
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

it('saves a decimal daily plan without changing other dates or monthly calculations', () => {
  const save = vi.fn()
  render(<DailyBudgetCard month={month} onSave={save} />)
  fireEvent.click(screen.getByRole('button', { name: 'Daily budget' }))
  fireEvent.change(screen.getByLabelText('Daily budget amount'), { target: { value: '25,50' } })
  expect(save).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Save daily budget' }))
  const expected = { '2026-01-04': 10, '2026-01-05': 25.5 }
  expect(save).toHaveBeenCalledWith(expected)
  expect(calcMonth({ ...month, dailyBudgets: expected }, [])).toEqual(calcMonth(month, []))
})

it('rejects invalid amounts and preserves another day when a plan is removed', () => {
  const save = vi.fn()
  render(<DailyBudgetCard month={{ ...month, dailyBudgets: { ...month.dailyBudgets, '2026-01-05': 20 } }} onSave={save} />)
  fireEvent.click(screen.getByRole('button', { name: 'Daily budget' }))
  for (const value of ['-5', 'Infinity', '12.345', '12abc']) {
    fireEvent.change(screen.getByLabelText('Daily budget amount'), { target: { value } })
    expect(screen.getByRole('button', { name: 'Save daily budget' })).toBeDisabled()
  }
  fireEvent.change(screen.getByLabelText('Daily budget amount'), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save daily budget' }))
  expect(save).toHaveBeenCalledWith({ '2026-01-04': 10 })
})

it('counts calendar days from the chosen past milestone and excludes future dates', () => {
  render(<DaysTogetherCard countdowns={[
    { id: 'start', title: 'Our beginning', date: '2026-01-01', emoji: '💕', createdBy: 'mateo' },
    { id: 'future', title: 'Future anniversary', date: '2027-01-01', emoji: '💕', createdBy: 'mateo' },
  ]} />)
  fireEvent.click(screen.getByRole('button', { name: 'Days together' }))
  expect(screen.queryByRole('option', { name: /Future anniversary/ })).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Count days from'), { target: { value: 'start' } })
  expect(screen.getByRole('status')).toHaveTextContent('4days together')
})

it('uses the existing relationship origin without asking for a new start date', () => {
  render(<DaysTogetherCard countdowns={[]} />)
  fireEvent.click(screen.getByRole('button', { name: 'Days together' }))
  expect(screen.getByRole('status')).toHaveTextContent('306days together')
  expect(screen.getByRole('status')).toHaveTextContent('5 March 2025')
})

it('keeps the new controls absent on Android and desktop', () => {
  for (const ua of ['Mozilla/5.0 (Linux; Android 15; Samsung)', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)']) {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(ua)
    const view = render(<><DailyBudgetCard month={month} onSave={() => {}} /><DaysTogetherCard countdowns={[]} /></>)
    expect(view.container).toBeEmptyDOMElement()
    act(() => view.unmount())
  }
})
