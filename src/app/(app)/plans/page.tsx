'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, Camera, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Wallet, Trash2, Sparkles, Pencil,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn, generateId } from '@/lib/utils'
import type { BudgetItem, FinanceMonth, FinanceMonthReport, FinanceCategoryItem } from '@/types'
import { PhotoGallery } from '@/components/ui/PhotoGallery'

const CURRENCY = '€'

/* ── helpers ─────────────────────────────────────────────────────────────────── */
function fmt(n: number) {
  return `${CURRENCY}${Math.abs(n).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
function fmtSigned(n: number) {
  return `${n >= 0 ? '+' : '-'}${fmt(n)}`
}

function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function prevKey(key: string) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function nextKey(key: string) {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}
function shortMonthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}
function lastDayOf(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m, 0)
}
function canFinalize(key: string) {
  const now = new Date()
  const ck  = currentMonthKey()
  if (key < ck) return true
  if (key > ck) return false
  return now.getDate() >= lastDayOf(key).getDate() - 2
}
function pctColor(pct: number) {
  if (pct > 100) return '#ef4444'
  if (pct > 80)  return '#f59e0b'
  return '#10b981'
}
function buildReport(month: FinanceMonth, totalSaved: number): FinanceMonthReport {
  const totalExpenses = month.budgetItems.reduce((a, b) => a + b.actual, 0)
  const remaining     = month.income - totalExpenses
  const savingsRate   = month.income > 0 ? Math.round((totalSaved / month.income) * 1000) / 10 : 0
  const sorted        = [...month.budgetItems].sort((a, b) => b.actual - a.actual)
  const topItem       = sorted.find(b => b.actual > 0)
  const overBudget    = month.budgetItems.filter(b => b.planned > 0 && b.actual > b.planned)
  return {
    generatedAt: new Date().toISOString(),
    totalIncome: month.income,
    totalExpenses,
    totalSaved,
    remaining,
    savingsRate,
    topCategory: topItem ? `${topItem.emoji} ${topItem.category}` : undefined,
    overBudgetCategories: overBudget.map(b => `${b.emoji} ${b.category}`),
  }
}

async function scheduleMonthEndPush(monthKey: string) {
  try {
    const last = lastDayOf(monthKey)
    last.setHours(22, 0, 0, 0)
    await fetch('/api/push/finance-month-end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthKey, fireAt: last.toISOString() }),
    })
  } catch { /* non-fatal */ }
}

/* ── main page ───────────────────────────────────────────────────────────────── */
export default function FinancePage() {
  const currentUser        = useAppStore(s => s.currentUser)!
  const isSeval            = currentUser === 'seval'
  const primary            = isSeval ? '#8b5cf6' : '#14b8a6'
  const pageBg             = useAppStore(s => s.pageBackgrounds.plans)
  const uploadPageBg       = useAppStore(s => s.uploadPageBackground)
  const setPageBg          = useAppStore(s => s.setPageBackground)
  const bgInputRef         = useRef<HTMLInputElement>(null)

  const financeMonths      = useAppStore(s => s.financeMonths)
  const savingsTransactions = useAppStore(s => s.savingsTransactions)
  const shoppingLists      = useAppStore(s => s.shoppingLists)
  const createFinanceMonth = useAppStore(s => s.createFinanceMonth)
  const updateFinanceMonth = useAppStore(s => s.updateFinanceMonth)
  const deleteFinanceMonth = useAppStore(s => s.deleteFinanceMonth)
  const addSavingsTransaction    = useAppStore(s => s.addSavingsTransaction)
  const deleteSavingsTransaction = useAppStore(s => s.deleteSavingsTransaction)
  const migrateFinanceData = useAppStore(s => s.migrateFinanceData)
  const migrateCategories  = useAppStore(s => s.migrateCategories)

  const [monthKey, setMonthKey]           = useState(currentMonthKey)
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null)
  const [addBudgetOpen, setAddBudgetOpen] = useState(false)
  const [savingsOpen, setSavingsOpen]     = useState(false)
  const [incomeEditing, setIncomeEditing] = useState(false)
  const [incomeInput, setIncomeInput]     = useState('')
  const [confirmFinalize, setConfirmFinalize] = useState(false)
  const [deleteTxId, setDeleteTxId]       = useState<string | null>(null)

  // One-time migrations
  useEffect(() => { migrateFinanceData() }, [migrateFinanceData])
  useEffect(() => { migrateCategories() }, [migrateCategories])

  const currentMonth = useMemo(
    () => financeMonths.find(m => m.key === monthKey) ?? null,
    [financeMonths, monthKey],
  )

  const totalSavings = useMemo(
    () => savingsTransactions.reduce((a, t) => a + t.amount, 0),
    [savingsTransactions],
  )
  const thisMonthSavings = useMemo(
    () => savingsTransactions.filter(t => t.monthKey === monthKey).reduce((a, t) => a + t.amount, 0),
    [savingsTransactions, monthKey],
  )
  const thisMonthTx = useMemo(
    () => [...savingsTransactions.filter(t => t.monthKey === monthKey)].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [savingsTransactions, monthKey],
  )

  // Shopping lists completed in this month
  const monthShoppingLists = useMemo(
    () => shoppingLists.filter(l => l.isCompleted && l.completedAt?.startsWith(monthKey)),
    [shoppingLists, monthKey],
  )
  const monthShoppingTotal = useMemo(
    () => monthShoppingLists.reduce((s, l) => s + l.items.reduce((a, i) => a + (i.price ?? 0) * i.quantity, 0), 0),
    [monthShoppingLists],
  )

  const prevMonthKey = prevKey(monthKey)
  const prevMonth    = financeMonths.find(m => m.key === prevMonthKey) ?? null

  async function handleBgPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await uploadPageBg('plans', file)
    e.target.value = ''
  }

  function handleStartBlank() {
    createFinanceMonth(monthKey)
    scheduleMonthEndPush(monthKey)
  }
  function handleCopyPrev() {
    createFinanceMonth(monthKey, prevMonthKey)
    scheduleMonthEndPush(monthKey)
  }

  function saveIncome() {
    if (!currentMonth) return
    const v = parseFloat(incomeInput.replace(',', '.'))
    if (!isNaN(v) && v >= 0) updateFinanceMonth(monthKey, { income: v })
    setIncomeEditing(false)
  }

  function handleFinalize() {
    if (!currentMonth) return
    const report = buildReport(currentMonth, thisMonthSavings)
    updateFinanceMonth(monthKey, { isFinalized: true, report })
    setConfirmFinalize(false)
  }

  const totalExpenses = currentMonth?.budgetItems.reduce((a, b) => a + b.actual, 0) ?? 0
  const remaining     = (currentMonth?.income ?? 0) - totalExpenses

  return (
    <div
      className="min-h-screen pb-32 relative"
      style={pageBg ? { backgroundImage: `url(${pageBg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {pageBg && <div className="fixed inset-0 bg-white/88 backdrop-blur-sm z-0 pointer-events-none" />}
      <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgPick} />

      <div className="relative z-10">

        {/* ── Hero ── */}
        <div
          className="px-5 pt-14 pb-5"
          style={{ background: pageBg ? 'transparent' : 'linear-gradient(135deg, #fef9ee 0%, #f0fdf4 60%, #fafafa 100%)' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base" style={{ background: '#10b98120' }}>
                  💰
                </div>
                <h1 className="text-2xl font-bold text-gray-800">Our Finance</h1>
              </div>
              <p className="text-sm text-gray-400 ml-10">Planning our future together.</p>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <button
                onClick={() => bgInputRef.current?.click()}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 shadow-card text-gray-400 active:bg-gray-100"
              >
                <Camera size={13} />
              </button>
              {pageBg && (
                <button
                  onClick={() => setPageBg('plans', null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 shadow-card text-gray-400 active:bg-gray-100"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Month Selector ── */}
        <div className="mx-4 mb-4 bg-white rounded-2xl shadow-card px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setMonthKey(prevKey(monthKey))}
            className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-gray-100"
          >
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <div className="text-center">
            <p className="font-bold text-gray-800 text-base">{monthLabel(monthKey)}</p>
            {currentMonth && (
              <span
                className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block',
                  currentMonth.isFinalized
                    ? 'bg-purple-100 text-purple-600'
                    : monthKey === currentMonthKey()
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-500'
                )}
              >
                {currentMonth.isFinalized ? 'Finalized' : monthKey === currentMonthKey() ? 'Active' : 'Past'}
              </span>
            )}
          </div>
          <button
            onClick={() => setMonthKey(nextKey(monthKey))}
            className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-gray-100"
          >
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>

        {/* ── Total Savings Banner ── */}
        <div className="mx-4 mb-4 rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
          <span className="text-2xl">🏦</span>
          <div>
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Total Savings Balance</p>
            <p className="text-xl font-bold text-amber-800">{fmt(totalSavings)}</p>
          </div>
          {thisMonthSavings !== 0 && (
            <div className="ml-auto text-right">
              <p className="text-[10px] text-amber-600">This month</p>
              <p className={cn('text-sm font-bold', thisMonthSavings > 0 ? 'text-green-600' : 'text-red-500')}>
                {fmtSigned(thisMonthSavings)}
              </p>
            </div>
          )}
        </div>

        {/* ── Content ── */}
        {!currentMonth ? (
          <EmptyMonthState
            monthKey={monthKey}
            prevMonth={prevMonth}
            prevMonthKey={prevMonthKey}
            onStartBlank={handleStartBlank}
            onCopyPrev={handleCopyPrev}
          />
        ) : (
          <>
            {/* Month-end report (if finalized) */}
            {currentMonth.isFinalized && currentMonth.report && (
              <ReportCard report={currentMonth.report} />
            )}

            {/* Summary cards */}
            <div className="px-4 mb-4 grid grid-cols-2 gap-2.5">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => { setIncomeInput(String(currentMonth.income)); setIncomeEditing(true) }}
                className="bg-white rounded-2xl shadow-card p-4 text-left relative overflow-hidden"
              >
                <div className="absolute inset-0 opacity-5" style={{ background: '#10b981' }} />
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: '#10b98120' }}>
                    <TrendingUp size={14} color="#10b981" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Income</span>
                </div>
                <p className="text-xl font-bold" style={{ color: '#10b981' }}>{fmt(currentMonth.income)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">tap to edit</p>
              </motion.button>

              <div className="bg-white rounded-2xl shadow-card p-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-5" style={{ background: '#ef4444' }} />
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: '#ef444420' }}>
                    <TrendingDown size={14} color="#ef4444" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expenses</span>
                </div>
                <p className="text-xl font-bold text-red-400">{fmt(totalExpenses)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">of {fmt(currentMonth.budgetItems.reduce((a, b) => a + b.planned, 0))} planned</p>
              </div>

              <div className="bg-white rounded-2xl shadow-card p-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-5" style={{ background: remaining >= 0 ? '#60a5fa' : '#ef4444' }} />
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: '#60a5fa20' }}>
                    <Wallet size={14} color="#60a5fa" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Remaining</span>
                </div>
                <p className="text-xl font-bold" style={{ color: remaining >= 0 ? '#60a5fa' : '#ef4444' }}>
                  {remaining < 0 ? '-' : ''}{fmt(remaining)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{remaining >= 0 ? 'still available' : 'over budget'}</p>
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setSavingsOpen(true)}
                className="bg-white rounded-2xl shadow-card p-4 text-left relative overflow-hidden"
              >
                <div className="absolute inset-0 opacity-5" style={{ background: '#f59e0b' }} />
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: '#f59e0b20' }}>
                    <span className="text-xs">🏦</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Saved</span>
                </div>
                <p className="text-xl font-bold" style={{ color: '#f59e0b' }}>
                  {thisMonthSavings >= 0 ? '' : '-'}{fmt(thisMonthSavings)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">this month · tap to add</p>
              </motion.button>
            </div>

            {/* Budget categories */}
            <div className="px-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-700">Budget Categories</h2>
                <button
                  onClick={() => setAddBudgetOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: '#10b98115', color: '#10b981' }}
                >
                  <Plus size={11} /> Category
                </button>
              </div>
              <div className="space-y-2">
                {currentMonth.budgetItems.map((item, idx) => {
                  const pct   = item.planned > 0 ? Math.min((item.actual / item.planned) * 100, 100) : 0
                  const color = pctColor(item.planned > 0 ? (item.actual / item.planned) * 100 : 0)
                  const over  = item.planned > 0 && item.actual > item.planned
                  return (
                    <motion.button
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setEditingBudget(item)}
                      className="w-full bg-white rounded-2xl shadow-card p-3.5 text-left active:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl shrink-0">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-sm font-medium text-gray-700 truncate">{item.category}</p>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <span className="text-[11px] font-semibold" style={{ color }}>{fmt(item.actual)}</span>
                              <span className="text-[10px] text-gray-300">/</span>
                              <span className="text-[10px] text-gray-400">{fmt(item.planned)}</span>
                              {over && <span className="text-[9px] font-bold text-red-400 bg-red-50 px-1 rounded">OVER</span>}
                            </div>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ type: 'spring', stiffness: 100, damping: 20, delay: idx * 0.02 }}
                            />
                          </div>
                          {item.note && <p className="text-[10px] text-gray-400 mt-1 truncate">{item.note}</p>}
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Savings transactions this month */}
            {thisMonthTx.length > 0 && (
              <div className="px-4 mb-5">
                <h2 className="text-sm font-bold text-gray-700 mb-3">Savings This Month</h2>
                <div className="space-y-2">
                  {thisMonthTx.map(t => (
                    <motion.div
                      key={t.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl shadow-card px-4 py-3 flex items-center gap-3"
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0',
                        t.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                      )}>
                        {t.amount > 0 ? '💸' : '📤'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate">
                          {t.note || (t.amount > 0 ? 'Contribution' : 'Withdrawal')}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          {' · '}{t.createdBy}
                        </p>
                      </div>
                      <p className={cn('text-sm font-bold shrink-0 mr-1', t.amount > 0 ? 'text-green-500' : 'text-red-400')}>
                        {t.amount > 0 ? '+' : ''}{fmt(t.amount)}
                      </p>
                      <button
                        onClick={() => setDeleteTxId(t.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-full text-gray-300 active:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Shopping completed this month */}
            {monthShoppingLists.length > 0 && (
              <div className="px-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-700">Shopping This Month 🛍️</h2>
                  {monthShoppingTotal > 0 && (
                    <span className="text-[11px] font-bold text-red-400">{fmt(monthShoppingTotal)} total</span>
                  )}
                </div>
                <div className="space-y-2">
                  {monthShoppingLists.map((list, idx) => {
                    const cost = list.items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0)
                    return (
                      <motion.div
                        key={list.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className="bg-white rounded-2xl shadow-card px-4 py-3 flex items-center gap-3"
                      >
                        {list.coverPhoto ? (
                          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                            <img src={list.coverPhoto} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl shrink-0">🛒</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-700 truncate">{list.name}</p>
                          <p className="text-[10px] text-gray-400">
                            {list.storeName ? `📍 ${list.storeName} · ` : ''}
                            {list.items.length} item{list.items.length !== 1 ? 's' : ''}
                            {list.completedAt ? ` · ${new Date(list.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                          </p>
                        </div>
                        {cost > 0 && <p className="text-sm font-bold text-gray-700 shrink-0">{fmt(cost)}</p>}
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Finalize button */}
            {!currentMonth.isFinalized && canFinalize(monthKey) && (
              <div className="px-4 mb-5">
                <button
                  onClick={() => setConfirmFinalize(true)}
                  className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
                >
                  <Sparkles size={16} />
                  Generate Month-End Report
                </button>
              </div>
            )}

            {/* Delete month */}
            <div className="px-4 mb-5">
              <button
                onClick={() => { if (confirm(`Delete ${monthLabel(monthKey)}?`)) deleteFinanceMonth(monthKey) }}
                className="w-full py-2.5 rounded-2xl text-red-400 text-sm flex items-center justify-center gap-1.5 bg-white shadow-card"
              >
                <Trash2 size={13} /> Delete This Month
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Income edit modal ── */}
      <AnimatePresence>
        {incomeEditing && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIncomeEditing(false)}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
            >
              <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-modal">
                <h3 className="font-bold text-gray-800 mb-1">Monthly Income 💶</h3>
                <p className="text-xs text-gray-400 mb-4">Combined household income for {shortMonthLabel(monthKey)}</p>
                <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 mb-4">
                  <span className="text-gray-400 font-semibold">{CURRENCY}</span>
                  <input
                    type="number"
                    value={incomeInput}
                    onChange={e => setIncomeInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && saveIncome()}
                    autoFocus
                    className="flex-1 text-lg font-bold text-gray-800 bg-transparent outline-none"
                    placeholder="0"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setIncomeEditing(false)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-medium text-sm">Cancel</button>
                  <button onClick={saveIncome} className="flex-1 py-3 rounded-2xl text-white font-medium text-sm" style={{ background: '#10b981' }}>Save</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Budget edit sheet ── */}
      <AnimatePresence>
        {editingBudget && currentMonth && (
          <FinanceCategoryEditorSheet
            item={editingBudget}
            onSave={updates => {
              updateFinanceMonth(monthKey, {
                budgetItems: currentMonth.budgetItems.map(b =>
                  b.id === editingBudget.id ? { ...b, ...updates } : b
                ),
              })
              setEditingBudget(null)
            }}
            onDelete={() => {
              updateFinanceMonth(monthKey, {
                budgetItems: currentMonth.budgetItems.filter(b => b.id !== editingBudget.id),
              })
              setEditingBudget(null)
            }}
            onClose={() => setEditingBudget(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Add budget category sheet ── */}

      <AnimatePresence>
        {addBudgetOpen && currentMonth && (
          <AddBudgetSheet
            onSave={item => {
              updateFinanceMonth(monthKey, {
                budgetItems: [...currentMonth.budgetItems, { ...item, id: Math.random().toString(36).slice(2) }],
              })
              setAddBudgetOpen(false)
            }}
            onClose={() => setAddBudgetOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Savings sheet ── */}
      <AnimatePresence>
        {savingsOpen && (
          <SavingsSheet
            monthKey={monthKey}
            monthLabel={shortMonthLabel(monthKey)}
            onSave={(amount, note) => { addSavingsTransaction(monthKey, amount, note); setSavingsOpen(false) }}
            onClose={() => setSavingsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Finalize confirm ── */}
      <AnimatePresence>
        {confirmFinalize && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setConfirmFinalize(false)}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
            >
              <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-modal">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">📊</div>
                  <h3 className="font-bold text-gray-800">Generate Report?</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    This will finalize {shortMonthLabel(monthKey)} and generate your month-end report. You can still edit entries after.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmFinalize(false)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-medium text-sm">Cancel</button>
                  <button onClick={handleFinalize} className="flex-1 py-3 rounded-2xl text-white font-medium text-sm" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                    Generate
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete savings transaction confirm ── */}
      <AnimatePresence>
        {deleteTxId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDeleteTxId(null)}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
            >
              <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-modal">
                <h3 className="font-bold text-gray-800 mb-3 text-center">Remove transaction?</h3>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteTxId(null)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-medium text-sm">Cancel</button>
                  <button onClick={() => { deleteSavingsTransaction(deleteTxId!); setDeleteTxId(null) }}
                    className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-medium text-sm">Delete</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Empty Month State ────────────────────────────────────────────────────────── */
function EmptyMonthState({
  monthKey, prevMonth, prevMonthKey, onStartBlank, onCopyPrev,
}: {
  monthKey: string
  prevMonth: FinanceMonth | null
  prevMonthKey: string
  onStartBlank: () => void
  onCopyPrev: () => void
}) {
  return (
    <div className="px-4">
      <div className="bg-white rounded-3xl shadow-card p-6 text-center">
        <div className="text-5xl mb-3">📋</div>
        <h3 className="font-bold text-gray-800 text-base mb-1">No budget for {monthLabel(monthKey)}</h3>
        <p className="text-xs text-gray-400 mb-5">Start tracking your finances for this month.</p>
        <div className="space-y-2">
          <button
            onClick={onStartBlank}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold"
            style={{ background: '#10b981' }}
          >
            Start blank
          </button>
          {prevMonth && (
            <button
              onClick={onCopyPrev}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold bg-gray-50 text-gray-700"
            >
              Copy from {shortMonthLabel(prevMonthKey)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Report Card ─────────────────────────────────────────────────────────────── */
function ReportCard({ report }: { report: FinanceMonthReport }) {
  const fmt2 = (n: number) => `€${Math.abs(n).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  return (
    <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #f5f3ff, #eef2ff)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📊</span>
        <h3 className="font-bold text-gray-800 text-sm">Month-End Report</h3>
        <span className="ml-auto text-[10px] text-gray-400">
          {new Date(report.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { label: 'Income',    value: fmt2(report.totalIncome),    color: '#10b981' },
          { label: 'Expenses',  value: fmt2(report.totalExpenses),  color: '#ef4444' },
          { label: 'Saved',     value: fmt2(report.totalSaved),     color: '#f59e0b' },
          { label: 'Remaining', value: `${report.remaining < 0 ? '-' : ''}${fmt2(report.remaining)}`, color: report.remaining >= 0 ? '#60a5fa' : '#ef4444' },
        ].map(row => (
          <div key={row.label} className="bg-white/70 rounded-xl px-3 py-2">
            <p className="text-[10px] text-gray-400 mb-0.5">{row.label}</p>
            <p className="text-sm font-bold" style={{ color: row.color }}>{row.value}</p>
          </div>
        ))}
      </div>
      <div className="bg-white/70 rounded-xl px-3 py-2 mb-2">
        <p className="text-[10px] text-gray-400 mb-0.5">Savings Rate</p>
        <p className="text-sm font-bold text-purple-600">{report.savingsRate.toFixed(1)}%</p>
      </div>
      {report.topCategory && (
        <p className="text-xs text-gray-500">Top category: <span className="font-semibold">{report.topCategory}</span></p>
      )}
      {report.overBudgetCategories.length > 0 && (
        <p className="text-xs text-red-400 mt-1">Over budget: {report.overBudgetCategories.join(', ')}</p>
      )}
    </div>
  )
}

/* ── Finance Category Editor Sheet ──────────────────────────────────────────── */
function FinanceCategoryEditorSheet({
  item, onSave, onDelete, onClose,
}: {
  item: BudgetItem
  onSave: (updates: Partial<Omit<BudgetItem, 'id'>>) => void
  onDelete: () => void
  onClose: () => void
}) {
  const uploadPhoto = useAppStore(s => s.uploadPhoto)

  // Determine initial mode: preserve stored mode, fall back to 'manual' when there's
  // existing actual data but no items (so we don't silently reset it to €0).
  const initMode: 'items' | 'manual' =
    item.actualSpendingMode ??
    ((item.items && item.items.length > 0) ? 'items' : item.actual > 0 ? 'manual' : 'items')

  const [planned,     setPlanned]     = useState(String(item.planned))
  const [note,        setNote]        = useState(item.note ?? '')
  const [photos,      setPhotos]      = useState<string[]>(item.photos ?? [])
  const [catItems,    setCatItems]    = useState<FinanceCategoryItem[]>(item.items ?? [])
  const [actualMode,  setActualMode]  = useState<'items' | 'manual'>(initMode)
  const [manualInput, setManualInput] = useState<string>(
    item.actualSpendingMode === 'manual' && item.manualActualSpending != null
      ? String(item.manualActualSpending)
      : item.actual > 0 ? String(item.actual) : ''
  )
  const [uploading,   setUploading]   = useState(false)
  const [addingItem,  setAddingItem]  = useState(false)
  const [editingItem, setEditingItem] = useState<FinanceCategoryItem | null>(null)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const itemTotal = useMemo(
    () => catItems.reduce((a, i) => a + i.quantity * i.unitPrice, 0),
    [catItems],
  )
  const manualVal      = parseFloat(manualInput.replace(',', '.')) || 0
  const effectiveActual = actualMode === 'items' ? itemTotal : manualVal
  const diff            = actualMode === 'manual' ? manualVal - itemTotal : 0

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    const url = await uploadPhoto(`finance-categories/${item.id}`, file)
    if (url) setPhotos(p => [...p, url])
    setUploading(false)
  }

  function switchToManual() {
    setActualMode('manual')
    if (!manualInput || manualInput === '0') setManualInput(String(itemTotal))
  }

  function addCatItem(data: Omit<FinanceCategoryItem, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString()
    setCatItems(p => [...p, { ...data, id: generateId(), createdAt: now, updatedAt: now }])
    setAddingItem(false)
  }

  function updateCatItem(id: string, data: Partial<FinanceCategoryItem>) {
    const now = new Date().toISOString()
    setCatItems(p => p.map(i => i.id === id ? { ...i, ...data, updatedAt: now } : i))
    setEditingItem(null)
  }

  function deleteCatItem(id: string) {
    setCatItems(p => p.filter(i => i.id !== id))
    setEditingItem(null)
  }

  function save() {
    onSave({
      planned:              parseFloat(planned.replace(',', '.')) || 0,
      actual:               effectiveActual,
      note:                 note.trim() || undefined,
      photos:               photos.length > 0 ? photos : undefined,
      items:                catItems.length > 0 ? catItems : undefined,
      actualSpendingMode:   actualMode,
      manualActualSpending: actualMode === 'manual' ? manualVal : undefined,
    })
  }

  const showItemForm = addingItem || editingItem !== null

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 380 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-modal max-w-lg mx-auto"
        style={{ maxHeight: '90vh' }}
      >
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        <div className="flex flex-col" style={{ maxHeight: '90vh' }}>

          {/* Fixed header */}
          <div className="px-5 pt-4 pb-3 shrink-0">
            <div className="drag-handle mb-4" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{item.emoji}</span>
                <div>
                  <h3 className="text-base font-bold text-gray-800">{item.category}</h3>
                  <span className="text-[9px] font-bold text-blue-400 bg-blue-50 px-1.5 py-0.5 rounded-full">Photos &amp; Items</span>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-3">

            {/* Planned Budget */}
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Planned Budget</p>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 font-semibold">{CURRENCY}</span>
                <input type="number" value={planned} onChange={e => setPlanned(e.target.value)}
                  className="flex-1 text-base font-semibold text-gray-800 bg-transparent outline-none" />
              </div>
            </div>

            {/* Actual Spending */}
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actual Spending</p>
                <div className="flex bg-white rounded-xl p-0.5 shadow-sm border border-gray-100">
                  <button
                    onClick={() => setActualMode('items')}
                    className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all',
                      actualMode === 'items' ? 'bg-blue-500 text-white' : 'text-gray-400')}
                  >
                    Auto
                  </button>
                  <button
                    onClick={switchToManual}
                    className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all',
                      actualMode === 'manual' ? 'bg-orange-500 text-white' : 'text-gray-400')}
                  >
                    Manual
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mb-2">
                Calculated from items: <span className="font-semibold text-gray-700">{fmt(itemTotal)}</span>
              </p>
              {actualMode === 'items' ? (
                <p className="text-lg font-bold text-gray-800">{fmt(itemTotal)}</p>
              ) : (
                <>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-gray-400 font-semibold">{CURRENCY}</span>
                    <input
                      type="number"
                      value={manualInput}
                      onChange={e => setManualInput(e.target.value)}
                      placeholder="0"
                      className="flex-1 text-base font-semibold text-orange-600 bg-transparent outline-none"
                    />
                  </div>
                  {diff !== 0 && (
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[10px] text-orange-400">
                        {diff > 0 ? 'Exceeds' : 'Below'} item total by {fmt(Math.abs(diff))}
                      </p>
                      <button
                        onClick={() => setManualInput(String(itemTotal))}
                        className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full"
                      >
                        Reset to item total
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Note */}
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Note (optional)</p>
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                placeholder="e.g. includes electricity and water"
                className="w-full text-sm text-gray-700 bg-transparent outline-none" />
            </div>

            {/* Photos */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Photos</p>
              <PhotoGallery
                photos={photos}
                size="sm"
                onRemove={idx => setPhotos(p => p.filter((_, i) => i !== idx))}
                onAddClick={() => photoInputRef.current?.click()}
                uploading={uploading}
              />
            </div>

            {/* Expense Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Expense Items{catItems.length > 0 ? ` (${catItems.length})` : ''}
                </p>
                {!showItemForm && (
                  <button
                    onClick={() => { setAddingItem(true); setEditingItem(null) }}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full"
                  >
                    <Plus size={10} /> Add item
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {catItems.map(ci => (
                  editingItem?.id === ci.id ? (
                    <ItemForm
                      key={ci.id}
                      item={ci}
                      onSave={data => updateCatItem(ci.id, data)}
                      onCancel={() => setEditingItem(null)}
                      onDelete={() => deleteCatItem(ci.id)}
                    />
                  ) : (
                    <ItemRow
                      key={ci.id}
                      item={ci}
                      onEdit={() => { setEditingItem(ci); setAddingItem(false) }}
                    />
                  )
                ))}
                {addingItem && (
                  <ItemForm onSave={addCatItem} onCancel={() => setAddingItem(false)} />
                )}
              </div>
              {catItems.length > 1 && (
                <div className="mt-2 flex justify-end">
                  <p className="text-xs text-gray-400">
                    Items total: <span className="font-bold text-gray-700">{fmt(itemTotal)}</span>
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Fixed footer */}
          <div className="px-5 pt-3 pb-10 border-t border-gray-100 shrink-0">
            <button
              onClick={save}
              className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold mb-3"
              style={{ background: '#10b981' }}
            >
              Save · {fmt(effectiveActual)} actual
            </button>
            {!confirmDel ? (
              <button onClick={() => setConfirmDel(true)}
                className="w-full py-2 flex items-center justify-center gap-1.5 text-red-400 text-sm">
                <Trash2 size={13} /> Remove Category
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setConfirmDel(false)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 text-sm font-medium">Cancel</button>
                <button onClick={onDelete} className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium">Delete</button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

    </>
  )
}

/* ── Item Row ─────────────────────────────────────────────────────────────────── */
function ItemRow({ item, onEdit }: { item: FinanceCategoryItem; onEdit: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl px-3 py-2.5 flex items-center gap-3 border border-gray-100"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {item.isPaid && (
            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 rounded-full">PAID</span>
          )}
          <p className="text-sm font-medium text-gray-700 truncate">{item.name}</p>
        </div>
        <p className="text-[10px] text-gray-400">
          {item.quantity} × {fmt(item.unitPrice)}
          {item.note ? ` · ${item.note}` : ''}
        </p>
      </div>
      <p className="text-sm font-bold text-gray-700 shrink-0">{fmt(item.quantity * item.unitPrice)}</p>
      <button
        onClick={onEdit}
        className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 active:bg-gray-100 shrink-0"
      >
        <Pencil size={12} />
      </button>
    </motion.div>
  )
}

/* ── Item Form ────────────────────────────────────────────────────────────────── */
function ItemForm({
  item, onSave, onCancel, onDelete,
}: {
  item?: FinanceCategoryItem
  onSave: (data: Omit<FinanceCategoryItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [name,      setName]      = useState(item?.name ?? '')
  const [quantity,  setQuantity]  = useState(String(item?.quantity ?? 1))
  const [unitPrice, setUnitPrice] = useState(item?.unitPrice != null ? String(item.unitPrice) : '')
  const [note,      setNote]      = useState(item?.note ?? '')
  const [isPaid,    setIsPaid]    = useState(item?.isPaid ?? false)

  const lineTotal = (parseFloat(quantity) || 0) * (parseFloat(unitPrice.replace(',', '.')) || 0)
  const canSave   = name.trim().length > 0

  function save() {
    if (!canSave) return
    onSave({
      name:      name.trim(),
      quantity:  parseFloat(quantity) || 1,
      unitPrice: parseFloat(unitPrice.replace(',', '.')) || 0,
      note:      note.trim() || undefined,
      isPaid,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-blue-50 rounded-2xl p-3 space-y-2"
    >
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Item name"
        autoFocus
        onKeyDown={e => e.key === 'Enter' && save()}
        className="w-full text-sm font-semibold text-gray-800 bg-white/80 rounded-xl px-3 py-2 outline-none"
      />
      <div className="flex gap-2">
        <div className="bg-white/80 rounded-xl px-3 py-2 w-24 flex items-center gap-1">
          <span className="text-[10px] text-gray-400 shrink-0">Qty</span>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            min="0"
            className="w-0 flex-1 text-sm font-semibold text-gray-800 bg-transparent outline-none"
          />
        </div>
        <div className="flex-1 bg-white/80 rounded-xl px-3 py-2 flex items-center gap-1">
          <span className="text-gray-400 text-sm shrink-0">{CURRENCY}</span>
          <input
            type="number"
            value={unitPrice}
            onChange={e => setUnitPrice(e.target.value)}
            placeholder="Unit price"
            className="flex-1 text-sm font-semibold text-gray-800 bg-transparent outline-none"
          />
        </div>
        {lineTotal > 0 && (
          <div className="bg-white/80 rounded-xl px-3 py-2 flex items-center shrink-0">
            <span className="text-sm font-bold text-blue-600">{fmt(lineTotal)}</span>
          </div>
        )}
      </div>
      <input
        type="text"
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="w-full text-xs text-gray-600 bg-white/80 rounded-xl px-3 py-2 outline-none"
      />
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setIsPaid(p => !p)}
          className={cn(
            'text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all',
            isPaid ? 'bg-green-100 text-green-700' : 'bg-white/80 text-gray-500',
          )}
        >
          {isPaid ? '✓ Paid' : 'Mark as paid'}
        </button>
        <div className="flex gap-1.5">
          <button onClick={onCancel}
            className="px-3 py-1.5 rounded-xl bg-white/80 text-gray-600 text-[11px] font-medium">
            Cancel
          </button>
          {onDelete && (
            <button onClick={onDelete}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/80 text-red-400">
              <Trash2 size={13} />
            </button>
          )}
          <button
            onClick={save}
            disabled={!canSave}
            className="px-3 py-1.5 rounded-xl bg-blue-500 text-white text-[11px] font-semibold disabled:opacity-40"
          >
            {item ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Add Budget Category Sheet ───────────────────────────────────────────────── */
function AddBudgetSheet({
  onSave, onClose,
}: {
  onSave: (item: Omit<BudgetItem, 'id'>) => void
  onClose: () => void
}) {
  const [emoji,    setEmoji]    = useState('📌')
  const [category, setCategory] = useState('')
  const [planned,  setPlanned]  = useState('')

  function save() {
    if (!category.trim()) return
    onSave({ emoji, category: category.trim(), planned: parseFloat(planned) || 0, actual: 0 })
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 380 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-modal max-w-lg mx-auto"
      >
        <div className="px-5 pt-4 pb-10">
          <div className="drag-handle mb-5" />
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-800">New Budget Category</h3>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-3 mb-5">
            <div className="flex gap-2">
              <div className="bg-gray-50 rounded-2xl px-3 py-3 w-16 text-center">
                <input type="text" value={emoji} onChange={e => setEmoji(e.target.value)}
                  className="w-full text-xl text-center bg-transparent outline-none" maxLength={2} />
              </div>
              <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Category Name</p>
                <input type="text" value={category} onChange={e => setCategory(e.target.value)} autoFocus
                  placeholder="e.g. Dining Out"
                  className="w-full text-sm font-semibold text-gray-800 bg-transparent outline-none" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Planned Budget</p>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 font-semibold">{CURRENCY}</span>
                <input type="number" value={planned} onChange={e => setPlanned(e.target.value)}
                  placeholder="0"
                  className="flex-1 text-base font-semibold text-gray-800 bg-transparent outline-none" />
              </div>
            </div>
          </div>
          <button onClick={save} disabled={!category.trim()}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold disabled:opacity-40"
            style={{ background: '#10b981' }}
          >
            Add Category
          </button>
        </div>
      </motion.div>
    </>
  )
}

/* ── Savings Sheet ────────────────────────────────────────────────────────────── */
function SavingsSheet({
  monthKey: _monthKey, monthLabel: label, onSave, onClose,
}: {
  monthKey: string
  monthLabel: string
  onSave: (amount: number, note?: string) => void
  onClose: () => void
}) {
  const [type,   setType]   = useState<'add' | 'withdraw'>('add')
  const [amount, setAmount] = useState('')
  const [note,   setNote]   = useState('')

  function save() {
    const v = parseFloat(amount.replace(',', '.'))
    if (isNaN(v) || v <= 0) return
    onSave(type === 'add' ? v : -v, note.trim() || undefined)
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 380 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-modal max-w-lg mx-auto"
      >
        <div className="px-5 pt-4 pb-10">
          <div className="drag-handle mb-5" />
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-gray-800">Savings Entry</h3>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <X size={16} />
            </button>
          </div>

          {/* Type toggle */}
          <div className="flex gap-2 mb-4 bg-gray-100 rounded-2xl p-1">
            <button
              onClick={() => setType('add')}
              className={cn('flex-1 py-2 rounded-xl text-sm font-semibold transition-all', type === 'add' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500')}
            >
              + Contribute
            </button>
            <button
              onClick={() => setType('withdraw')}
              className={cn('flex-1 py-2 rounded-xl text-sm font-semibold transition-all', type === 'withdraw' ? 'bg-white text-red-500 shadow-sm' : 'text-gray-500')}
            >
              - Withdraw
            </button>
          </div>

          <div className="space-y-3 mb-5">
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Amount</p>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 font-semibold">{CURRENCY}</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && save()}
                  autoFocus
                  placeholder="0"
                  className="flex-1 text-base font-semibold text-gray-800 bg-transparent outline-none"
                />
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Note (optional)</p>
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                placeholder="e.g. Monthly transfer"
                className="w-full text-sm text-gray-700 bg-transparent outline-none" />
            </div>
          </div>

          <button
            onClick={save}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold disabled:opacity-40"
            style={{ background: type === 'add' ? '#10b981' : '#ef4444' }}
          >
            {type === 'add' ? 'Add Contribution' : 'Record Withdrawal'}
          </button>
        </div>
      </motion.div>
    </>
  )
}
