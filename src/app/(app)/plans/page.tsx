'use client'

import { useState, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, X, Camera, Wallet,
  TrendingUp, TrendingDown, Target, Trash2,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'
import type { BudgetItem } from '@/types'

const CURRENCY = '€'

/* ── helpers ─────────────────────────────────────────────────────────────────── */
function fmt(n: number) {
  return `${CURRENCY}${n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function pctColor(pct: number) {
  if (pct > 100) return '#ef4444'
  if (pct > 80)  return '#f59e0b'
  return '#10b981'
}

const MOTIVATIONAL = [
  'Every little step builds our future. 💕',
  'Together we\'re stronger. Keep going!',
  'Small savings, big dreams. You\'ve got this.',
  'Your future self will thank you. ❤️',
]

/* ── main page ───────────────────────────────────────────────────────────────── */
export default function FinancePage() {
  const currentUser      = useAppStore(s => s.currentUser)!
  const isSeval          = currentUser === 'seval'
  const primary          = isSeval ? '#8b5cf6' : '#14b8a6'
  const pageBg           = useAppStore(s => s.pageBackgrounds.plans)
  const uploadPageBg     = useAppStore(s => s.uploadPageBackground)
  const setPageBg        = useAppStore(s => s.setPageBackground)
  const bgInputRef       = useRef<HTMLInputElement>(null)

  const monthlyIncome    = useAppStore(s => s.monthlyIncome)
  const budgetItems      = useAppStore(s => s.budgetItems)
  const savingsGoals     = useAppStore(s => s.savingsGoals)
  const setMonthlyIncome = useAppStore(s => s.setMonthlyIncome)
  const updateBudgetItem = useAppStore(s => s.updateBudgetItem)
  const addBudgetItem    = useAppStore(s => s.addBudgetItem)
  const deleteBudgetItem = useAppStore(s => s.deleteBudgetItem)
  const shoppingLists    = useAppStore(s => s.shoppingLists)

  const [editingBudget, setEditingBudget]   = useState<BudgetItem | null>(null)
  const [addBudgetOpen, setAddBudgetOpen]   = useState(false)
  const [incomeEditing, setIncomeEditing]   = useState(false)
  const [incomeInput, setIncomeInput]       = useState(String(monthlyIncome))
  const [quote]                             = useState(() => MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)])

  const totalExpenses = useMemo(() => budgetItems.reduce((a, b) => a + b.actual, 0), [budgetItems])
  const totalPlanned  = useMemo(() => budgetItems.reduce((a, b) => a + b.planned, 0), [budgetItems])
  const remaining     = monthlyIncome - totalExpenses
  const totalSaved         = useMemo(() => savingsGoals.reduce((a, g) => a + g.savedAmount, 0), [savingsGoals])
  const completedLists     = useMemo(() => shoppingLists.filter(l => l.isCompleted), [shoppingLists])
  const totalShoppingSpent = useMemo(
    () => completedLists.reduce((s, l) => s + l.items.reduce((a, i) => a + (i.price ?? 0) * i.quantity, 0), 0),
    [completedLists],
  )

  async function handleBgPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await uploadPageBg('plans', file)
    e.target.value = ''
  }

  function saveIncome() {
    const v = parseFloat(incomeInput.replace(',', '.'))
    if (!isNaN(v) && v >= 0) setMonthlyIncome(v)
    setIncomeEditing(false)
  }

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
          className="px-5 pt-14 pb-6"
          style={{
            background: pageBg ? 'transparent' : 'linear-gradient(135deg, #fef9ee 0%, #f0fdf4 60%, #fafafa 100%)',
          }}
        >
          <div className="flex items-start justify-between mb-1">
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

        {/* ── Summary Cards ── */}
        <div className="px-4 -mt-2 mb-4 grid grid-cols-2 gap-2.5">
          {/* Income */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setIncomeInput(String(monthlyIncome)); setIncomeEditing(true) }}
            className="bg-white rounded-2xl shadow-card p-4 text-left relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-5" style={{ background: '#10b981' }} />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: '#10b98120' }}>
                <TrendingUp size={14} color="#10b981" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Income</span>
            </div>
            <p className="text-xl font-bold" style={{ color: '#10b981' }}>{fmt(monthlyIncome)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">per month</p>
          </motion.button>

          {/* Expenses */}
          <div className="bg-white rounded-2xl shadow-card p-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{ background: '#ef4444' }} />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: '#ef444420' }}>
                <TrendingDown size={14} color="#ef4444" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expenses</span>
            </div>
            <p className="text-xl font-bold text-red-400">{fmt(totalExpenses)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">of {fmt(totalPlanned)} planned</p>
          </div>

          {/* Left */}
          <div className="bg-white rounded-2xl shadow-card p-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{ background: remaining >= 0 ? '#60a5fa' : '#ef4444' }} />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: '#60a5fa20' }}>
                <Wallet size={14} color="#60a5fa" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Remaining</span>
            </div>
            <p className="text-xl font-bold" style={{ color: remaining >= 0 ? '#60a5fa' : '#ef4444' }}>
              {remaining < 0 ? '-' : ''}{fmt(Math.abs(remaining))}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{remaining >= 0 ? 'still available' : 'over budget'}</p>
          </div>

          {/* Goals saved */}
          <div className="bg-white rounded-2xl shadow-card p-4 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{ background: '#f59e0b' }} />
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: '#f59e0b20' }}>
                <Target size={14} color="#f59e0b" />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Savings</span>
            </div>
            <p className="text-xl font-bold" style={{ color: '#f59e0b' }}>{fmt(totalSaved)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{savingsGoals.length} goal{savingsGoals.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* ── Motivational quote ── */}
        <div className="mx-4 mb-4 px-4 py-3 rounded-2xl" style={{ background: 'linear-gradient(135deg, #fef3c710, #d1fae510)' }}>
          <p className="text-xs text-gray-500 text-center italic">{quote}</p>
        </div>

        {/* ── Monthly Budget ── */}
        <div className="px-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700">Monthly Budget</h2>
            <button
              onClick={() => setAddBudgetOpen(true)}
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: '#10b98115', color: '#10b981' }}
            >
              <Plus size={11} /> Category
            </button>
          </div>

          <div className="space-y-2">
            {budgetItems.map((item, idx) => {
              const pct    = item.planned > 0 ? Math.min((item.actual / item.planned) * 100, 100) : 0
              const color  = pctColor(item.planned > 0 ? (item.actual / item.planned) * 100 : 0)
              const over   = item.planned > 0 && item.actual > item.planned
              return (
                <motion.button
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
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
                          <span className="text-[11px] font-semibold" style={{ color }}>
                            {fmt(item.actual)}
                          </span>
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
                          transition={{ type: 'spring', stiffness: 100, damping: 20, delay: idx * 0.03 }}
                        />
                      </div>
                      {item.note && (
                        <p className="text-[10px] text-gray-400 mt-1 truncate">{item.note}</p>
                      )}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* ── Shopping History ── */}
        {completedLists.length > 0 && (
          <div className="px-4 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-700">Shopping History 🛍️</h2>
              {totalShoppingSpent > 0 && (
                <span className="text-[11px] font-bold" style={{ color: '#ef4444' }}>{fmt(totalShoppingSpent)} total</span>
              )}
            </div>
            <div className="space-y-2">
              {completedLists.map((list, idx) => {
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
                <p className="text-xs text-gray-400 mb-4">Combined household income</p>
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

      {/* ── Budget item edit sheet ── */}
      <AnimatePresence>
        {editingBudget && (
          <BudgetEditSheet
            item={editingBudget}
            onSave={(updates) => { updateBudgetItem(editingBudget.id, updates); setEditingBudget(null) }}
            onDelete={() => { deleteBudgetItem(editingBudget.id); setEditingBudget(null) }}
            onClose={() => setEditingBudget(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Add budget category sheet ── */}
      <AnimatePresence>
        {addBudgetOpen && (
          <AddBudgetSheet
            onSave={(item) => { addBudgetItem(item); setAddBudgetOpen(false) }}
            onClose={() => setAddBudgetOpen(false)}
          />
        )}
      </AnimatePresence>

    </div>
  )
}

/* ── Budget Edit Sheet ───────────────────────────────────────────────────────── */
function BudgetEditSheet({
  item, onSave, onDelete, onClose,
}: {
  item: BudgetItem
  onSave: (updates: Partial<Omit<BudgetItem, 'id'>>) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [planned, setPlanned] = useState(String(item.planned))
  const [actual,  setActual]  = useState(String(item.actual))
  const [note,    setNote]    = useState(item.note ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function save() {
    onSave({
      planned: parseFloat(planned) || 0,
      actual:  parseFloat(actual)  || 0,
      note:    note.trim() || undefined,
    })
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
            <div className="flex items-center gap-2">
              <span className="text-2xl">{item.emoji}</span>
              <h3 className="text-base font-bold text-gray-800">{item.category}</h3>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3 mb-5">
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Planned Budget</p>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 font-semibold">{CURRENCY}</span>
                <input type="number" value={planned} onChange={e => setPlanned(e.target.value)}
                  className="flex-1 text-base font-semibold text-gray-800 bg-transparent outline-none" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Actual Spending</p>
              <div className="flex items-center gap-1">
                <span className="text-gray-400 font-semibold">{CURRENCY}</span>
                <input type="number" value={actual} onChange={e => setActual(e.target.value)}
                  className="flex-1 text-base font-semibold text-gray-800 bg-transparent outline-none" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Note (optional)</p>
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                placeholder="e.g. includes electricity and water"
                className="w-full text-sm text-gray-700 bg-transparent outline-none" />
            </div>
          </div>

          <button onClick={save}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold mb-3"
            style={{ background: '#10b981' }}
          >
            Save Changes
          </button>

          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="w-full py-2 flex items-center justify-center gap-1.5 text-red-400 text-sm">
              <Trash2 size={13} /> Remove Category
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 text-sm font-medium">Cancel</button>
              <button onClick={onDelete} className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium">Delete</button>
            </div>
          )}
        </div>
      </motion.div>
    </>
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

