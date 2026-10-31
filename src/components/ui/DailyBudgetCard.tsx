'use client'

import { useId, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useIOSDevice } from '@/hooks/useIOSDevice'
import type { FinanceMonth } from '@/types'
import { getTodayString } from '@/lib/utils'
import { C2Sheet, C2SheetHeader, C2SheetBody, C2SheetFooter } from './C2Sheet'

export function DailyBudgetCard({ month, onSave }: {
  month: FinanceMonth
  onSave: (budgets: Record<string, number>) => void
}) {
  const ios = useIOSDevice()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(() => getTodayString().startsWith(month.key) ? getTodayString() : `${month.key}-01`)
  const [amount, setAmount] = useState('')
  const formId = useId()
  const [year, monthNumber] = month.key.split('-').map(Number)
  const lastDate = `${month.key}-${new Date(year, monthNumber, 0).getDate()}`
  const parsed = Number(amount.trim().replace(',', '.'))
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= `${month.key}-01` && date <= lastDate
    && (amount.trim() === '' || (/^\d+(?:[.,]\d{1,2})?$/.test(amount.trim()) && Number.isFinite(parsed)))
  const saved = month.dailyBudgets?.[date]
  const money = (value: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value)
  if (!ios) return null
  return <>
    <button type="button" disabled={month.isFinalized} onClick={() => { setAmount(saved === undefined ? '' : String(saved)); setOpen(true) }}
      className="c2-card mx-4 mb-4 px-4 py-4 text-left block w-[calc(100%_-_2rem)] min-h-11" aria-label="Daily budget">
      <span className="block text-sm font-semibold text-gray-800">Daily budget</span>
      <span className="block text-sm text-gray-500 mt-1">{saved === undefined ? 'Set a spending plan for a day' : `${money(saved)} · ${format(parseISO(date), 'd MMM yyyy')}`}</span>
    </button>
    <C2Sheet open={open} onClose={() => setOpen(false)} aria-label="Daily budget">
      <C2SheetHeader title="Daily budget" subtitle="Plan an amount for a day." onClose={() => setOpen(false)} />
      <C2SheetBody className="py-4">
        <form id={formId} onSubmit={event => {
          event.preventDefault()
          if (!valid) return
          const budgets = { ...month.dailyBudgets }
          if (amount.trim() === '') delete budgets[date]
          else budgets[date] = parsed
          onSave(budgets); setOpen(false)
        }} className="space-y-4">
          <label className="block text-sm text-gray-600">For date
            <input aria-label="Budget date" type="date" min={`${month.key}-01`} max={lastDate} required value={date}
              onChange={event => { const next = event.target.value; setDate(next); setAmount(month.dailyBudgets?.[next] === undefined ? '' : String(month.dailyBudgets[next])) }}
              className="block w-full min-w-0 rounded-xl bg-white px-3 py-3 mt-1" />
          </label>
          <label className="block text-sm text-gray-600">Amount (€)
            <input aria-label="Daily budget amount" type="text" inputMode="decimal" enterKeyHint="done" value={amount}
              onChange={event => setAmount(event.target.value)} placeholder="e.g. 25.00"
              className="block w-full rounded-xl bg-white px-3 py-3 mt-1" />
          </label>
          <p className="text-xs text-gray-500">Leave the amount blank to remove this day’s plan.</p>
          {!valid && <p role="alert" className="text-sm text-rose-600">Choose a date in this month and a positive amount or zero, with up to two decimal places.</p>}
        </form>
      </C2SheetBody>
      <C2SheetFooter><button type="submit" form={formId} disabled={!valid} className="w-full rounded-2xl bg-teal-600 py-3 text-white font-semibold disabled:opacity-40">Save daily budget</button></C2SheetFooter>
    </C2Sheet>
  </>
}
