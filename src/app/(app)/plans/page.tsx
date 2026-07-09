'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Calendar, Clock, X, Trash2, ChevronDown, Plus, ShoppingBag, Camera, Image as ImageIcon } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { WISHLIST_CATEGORY_CONFIG, COLOR_HEX, cn, formatDate, formatTime } from '@/lib/utils'
import { COLOR_OPTIONS } from '@/components/calendar/EventModal'
import type { Goal, GoalCategory, SharedTodo, WishlistItem, WishlistCategory, EventColor, PageBackgrounds } from '@/types'
import { PhotoBackgroundSheet, type PhotoUseChoice } from '@/components/ui/PhotoBackgroundSheet'

const GOAL_CATEGORY_CONFIG: Record<GoalCategory, { emoji: string; label: string }> = {
  travel:     { emoji: '✈️', label: 'Travel' },
  money:      { emoji: '💰', label: 'Money' },
  fitness:    { emoji: '💪', label: 'Fitness' },
  life:       { emoji: '🌱', label: 'Life' },
  learning:   { emoji: '📚', label: 'Learning' },
  hobbies:    { emoji: '🎨', label: 'Hobbies' },
  challenges: { emoji: '🏆', label: 'Challenges' },
}

const GOAL_CATEGORIES = Object.entries(GOAL_CATEGORY_CONFIG) as [GoalCategory, { emoji: string; label: string }][]
const WISH_CATEGORIES = Object.entries(WISHLIST_CATEGORY_CONFIG) as [WishlistCategory, { emoji: string; label: string }][]

type PlanTab = 'plans' | 'dreams' | 'wishes' | 'shopping'

const TABS: { id: PlanTab; label: string; emoji: string; hex: string }[] = [
  { id: 'plans',    label: 'Plans',    emoji: '💚', hex: COLOR_HEX.green  },
  { id: 'dreams',   label: 'Dreams',   emoji: '💙', hex: COLOR_HEX.blue   },
  { id: 'wishes',   label: 'Wishes',   emoji: '💜', hex: COLOR_HEX.seval  },
  { id: 'shopping', label: 'Shopping', emoji: '🛒', hex: '#6b7280'        },
]

export default function PlansPage() {
  const currentUser    = useAppStore(s => s.currentUser)!
  const isSeval        = currentUser === 'seval'
  const primary        = isSeval ? '#8b5cf6' : '#14b8a6'
  const pageBg         = useAppStore(s => s.pageBackgrounds.plans)
  const uploadPageBg   = useAppStore(s => s.uploadPageBackground)
  const setPageBg      = useAppStore(s => s.setPageBackground)
  const bgInputRef     = useRef<HTMLInputElement>(null)

  const [activeTab, setActiveTab] = useState<PlanTab>('plans')

  async function handleBgPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await uploadPageBg('plans', file)
    e.target.value = ''
  }

  return (
    <div
      className="min-h-screen pt-14 pb-32 relative"
      style={pageBg ? { backgroundImage: `url(${pageBg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {pageBg && <div className="fixed inset-0 bg-white/85 backdrop-blur-sm z-0 pointer-events-none" />}
      <div className="relative z-10">
      <div className="px-5 mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Plans</h1>
          <p className="text-sm text-gray-400">what's ahead for you two</p>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgPick} />
          <button
            onClick={() => bgInputRef.current?.click()}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 shadow-card text-gray-400 active:bg-gray-100"
            title="Set page background"
          >
            <Camera size={14} />
          </button>
          {pageBg && (
            <button
              onClick={() => setPageBg('plans', null)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 shadow-card text-gray-400 active:bg-gray-100"
              title="Remove background"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 px-5 mb-6">
        {TABS.map(tab => (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all"
            style={activeTab === tab.id
              ? { background: tab.hex, color: 'white' }
              : { background: 'white', color: '#6b7280', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
            }
          >
            {tab.emoji} {tab.label}
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'plans'    && <TodosSection    primary={primary} />}
          {activeTab === 'dreams'   && <DreamsSection   primary={primary} />}
          {activeTab === 'wishes'   && <WishesSection   primary={primary} />}
          {activeTab === 'shopping' && <ShoppingSection primary={primary} />}
        </motion.div>
      </AnimatePresence>
      </div>{/* /relative z-10 */}
    </div>
  )
}

/* ── Todos ──────────────────────────────────────────────────────────────────── */
function TodosSection({ primary }: { primary: string }) {
  const todos      = useAppStore(s => s.todos)
  const toggleTodo = useAppStore(s => s.toggleTodo)
  const [editing, setEditing]   = useState<SharedTodo | null>(null)
  const [showDone, setShowDone] = useState(false)

  const pending   = todos.filter(t => !t.isCompleted)
  const completed = todos.filter(t => t.isCompleted)

  if (todos.length === 0) {
    return <EmptyState emoji="📋" text="No plans yet" sub="tap + to add something together" />
  }

  return (
    <div className="px-5 space-y-2">
      {pending.map(todo => (
        <motion.div
          key={todo.id}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-card overflow-hidden"
        >
          <div
            className="flex items-center gap-3 p-4 cursor-pointer active:bg-gray-50"
            onClick={() => setEditing(todo)}
          >
            <button
              onClick={e => { e.stopPropagation(); toggleTodo(todo.id) }}
              className="w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
              style={{ borderColor: '#d1d5db' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{todo.title}</p>
              {(todo.date || todo.notes) && (
                <div className="flex items-center gap-2 mt-0.5">
                  {todo.date && (
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Calendar size={10} />
                      {formatDate(todo.date, 'MMM d')}
                      {todo.startTime && <><Clock size={10} className="ml-1" />{formatTime(todo.startTime)}</>}
                    </span>
                  )}
                  {todo.notes && (
                    <span className="text-[11px] text-gray-300 truncate">· {todo.notes}</span>
                  )}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-300 shrink-0">›</span>
          </div>
        </motion.div>
      ))}

      {completed.length > 0 && (
        <div className="pt-4">
          <button
            onClick={() => setShowDone(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 mb-2"
          >
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Done ({completed.length})
            </span>
            <motion.div animate={{ rotate: showDone ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={15} className="text-gray-400" />
            </motion.div>
          </button>
          <AnimatePresence>
            {showDone && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-2"
              >
                {completed.map(todo => (
                  <motion.div
                    key={todo.id}
                    layout
                    className="flex items-center gap-3 bg-white rounded-2xl shadow-card p-4 opacity-50 cursor-pointer"
                    onClick={() => setEditing(todo)}
                  >
                    <button
                      onClick={e => { e.stopPropagation(); toggleTodo(todo.id) }}
                      className="w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center"
                      style={{ borderColor: primary, background: primary }}
                    >
                      <Check size={12} color="white" strokeWidth={3} />
                    </button>
                    <p className="text-sm text-gray-400 line-through flex-1 min-w-0 truncate">{todo.title}</p>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {editing && (
        <TodoEditSheet
          todo={editing}
          primary={primary}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

/* ── Goals / Dreams ─────────────────────────────────────────────────────────── */
function DreamsSection({ primary }: { primary: string }) {
  const goals  = useAppStore(s => s.goals)
  const [editing, setEditing]   = useState<Goal | null>(null)
  const [showDone, setShowDone] = useState(false)

  const active    = goals.filter(g => !g.isCompleted)
  const completed = goals.filter(g => g.isCompleted)

  if (goals.length === 0) {
    return <EmptyState emoji="💙" text="No dreams yet" sub="tap + to add something to dream about" />
  }

  return (
    <div className="px-5 space-y-2">
      {active.map(goal => {
        const cat    = GOAL_CATEGORY_CONFIG[goal.categoryId]
        const hasBar = goal.progressTarget > 0
        const pct    = hasBar ? Math.min((goal.progressCurrent / goal.progressTarget) * 100, 100) : 0

        return (
          <motion.div
            key={goal.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-card p-4 cursor-pointer active:bg-gray-50"
            onClick={() => setEditing(goal)}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl shrink-0">{cat.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{goal.title}</p>
                {goal.notes && (
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">{goal.notes}</p>
                )}
                {hasBar && (
                  <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: primary }} />
                  </div>
                )}
              </div>
              {hasBar && (
                <span className="text-[10px] font-bold shrink-0" style={{ color: primary }}>
                  {goal.progressCurrent}/{goal.progressTarget}
                </span>
              )}
              <span className="text-xs text-gray-300 shrink-0">›</span>
            </div>
          </motion.div>
        )
      })}

      {completed.length > 0 && (
        <div className="pt-4">
          <button
            onClick={() => setShowDone(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 mb-2"
          >
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Achieved ({completed.length})
            </span>
            <motion.div animate={{ rotate: showDone ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={15} className="text-gray-400" />
            </motion.div>
          </button>
          <AnimatePresence>
            {showDone && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-2"
              >
                {completed.map(goal => (
                  <div
                    key={goal.id}
                    className="flex items-center gap-3 bg-white rounded-2xl shadow-card p-4 opacity-50 cursor-pointer"
                    onClick={() => setEditing(goal)}
                  >
                    <span className="text-lg">{GOAL_CATEGORY_CONFIG[goal.categoryId].emoji}</span>
                    <p className="text-sm text-gray-400 line-through flex-1 min-w-0 truncate">{goal.title}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {editing && (
        <GoalEditSheet
          goal={editing}
          primary={primary}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

/* ── Wishlist ────────────────────────────────────────────────────────────────── */
function WishesSection({ primary }: { primary: string }) {
  const items  = useAppStore(s => s.wishlistItems)
  const toggle = useAppStore(s => s.toggleWishlistItem)
  const [editing, setEditing]   = useState<WishlistItem | null>(null)
  const [showDone, setShowDone] = useState(false)

  const pending   = items.filter(i => !i.isCompleted)
  const completed = items.filter(i => i.isCompleted)

  if (items.length === 0) {
    return <EmptyState emoji="💜" text="No wishes yet" sub="tap + to add something to wish for" />
  }

  return (
    <div className="px-5 space-y-2">
      {pending.map(item => {
        const cat = WISHLIST_CATEGORY_CONFIG[item.category]
        return (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-3 cursor-pointer active:bg-gray-50"
            onClick={() => setEditing(item)}
          >
            <button
              onClick={e => { e.stopPropagation(); toggle(item.id) }}
              className="w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
              style={{ borderColor: '#d1d5db' }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs">{cat.emoji}</span>
                <span className="text-[10px] text-gray-400 font-medium">{cat.label}</span>
              </div>
              <p className="text-sm font-medium text-gray-700 truncate">{item.title}</p>
              {item.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.notes}</p>}
            </div>
            <span className="text-xs text-gray-300 shrink-0">›</span>
          </motion.div>
        )
      })}

      {completed.length > 0 && (
        <div className="pt-4">
          <button
            onClick={() => setShowDone(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 mb-2"
          >
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Made real ({completed.length})
            </span>
            <motion.div animate={{ rotate: showDone ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={15} className="text-gray-400" />
            </motion.div>
          </button>
          <AnimatePresence>
            {showDone && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-2"
              >
                {completed.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 bg-white rounded-2xl shadow-card p-4 opacity-50 cursor-pointer"
                    onClick={() => setEditing(item)}
                  >
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: primary }}>
                      <Check size={12} color="white" strokeWidth={3} />
                    </div>
                    <p className="text-sm text-gray-400 line-through flex-1 min-w-0 truncate">{item.title}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {editing && (
        <WishEditSheet
          item={editing}
          primary={primary}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

/* ── Todo Edit Sheet ─────────────────────────────────────────────────────────── */
function TodoEditSheet({ todo, primary, onClose }: { todo: SharedTodo; primary: string; onClose: () => void }) {
  const updateTodo     = useAppStore(s => s.updateTodo)
  const deleteTodo     = useAppStore(s => s.deleteTodo)
  const toggleTodo     = useAppStore(s => s.toggleTodo)
  const uploadPhoto    = useAppStore(s => s.uploadPhoto)
  const uploadPageBg   = useAppStore(s => s.uploadPageBackground)
  const photoInputRef  = useRef<HTMLInputElement>(null)

  const [title, setTitle]   = useState(todo.title)
  const [notes, setNotes]   = useState(todo.notes ?? '')
  const [date, setDate]     = useState(todo.date ?? '')
  const [time, setTime]     = useState(todo.startTime ?? '')
  const [color, setColor]   = useState<EventColor>(todo.color ?? 'green')
  const [items, setItems]   = useState<string[]>(todo.items ?? [])
  const [newItem, setNewItem]     = useState('')
  const [uploading, setUploading] = useState(false)
  const [pendingFile, setPendingFile]     = useState<File | null>(null)
  const [bgSheetOpen, setBgSheetOpen]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function addItem() {
    if (!newItem.trim()) return
    setItems(prev => [...prev, newItem.trim()])
    setNewItem('')
  }

  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setBgSheetOpen(true)
    e.target.value = ''
  }

  async function handleBgChoice(choice: PhotoUseChoice) {
    setBgSheetOpen(false)
    if (!pendingFile) return
    if (choice === 'together' || choice === 'plans' || choice === 'us') {
      await uploadPageBg(choice, pendingFile)
    }
    // for attach or card (n/a here): do nothing extra
    setPendingFile(null)
  }

  async function save() {
    if (!title.trim()) return
    setUploading(true)
    updateTodo(todo.id, {
      title: title.trim(),
      notes: notes.trim() || undefined,
      date: date || undefined,
      startTime: time || undefined,
      color,
      items: items.length ? items : undefined,
    })
    setUploading(false)
    onClose()
  }

  return (
    <>
      <EditSheet title={todo.isCompleted ? 'Completed plan' : 'Edit plan'} onClose={onClose}>
        <TitleInput value={title} onChange={setTitle} placeholder="What's the plan?" />
        <NotesInput value={notes} onChange={setNotes} />
        <DateTimeRow date={date} time={time} onDate={setDate} onTime={setTime} />

        {/* Color picker */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Color</p>
          <div className="flex gap-2">
            {COLOR_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setColor(opt.value as EventColor)}
                className={cn(
                  'w-8 h-8 rounded-full border-2 transition-all',
                  color === opt.value ? 'border-gray-800 scale-110' : 'border-transparent'
                )}
                style={{ background: opt.hex }}
              />
            ))}
          </div>
        </div>

        {/* Checklist */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Checklist</p>
          <div className="space-y-1.5 mb-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <span className="flex-1 text-sm text-gray-700">{item}</span>
                <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-gray-500">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              placeholder="Add an item..."
              className="flex-1 text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 outline-none placeholder:text-gray-300"
            />
            <button onClick={addItem} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Photo upload */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Photo</p>
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoPick} />
          <button
            onClick={() => photoInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-50 text-gray-500 text-sm font-medium border border-dashed border-gray-200 active:bg-gray-100"
          >
            <Camera size={16} /> Add photo or set as background
          </button>
        </div>

        <button
          onClick={() => { toggleTodo(todo.id); onClose() }}
          className="w-full py-3 rounded-2xl text-sm font-medium bg-gray-50 text-gray-600 mb-2"
        >
          {todo.isCompleted ? 'Mark as pending' : 'Mark as done ✓'}
        </button>

        <button
          onClick={save}
          disabled={!title.trim() || uploading}
          className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold mb-3 disabled:opacity-40"
          style={{ background: primary }}
        >
          {uploading ? 'Saving...' : 'Save changes'}
        </button>

        <DeleteRow show={confirmDelete} onAsk={() => setConfirmDelete(true)} onCancel={() => setConfirmDelete(false)}
          onConfirm={() => { deleteTodo(todo.id); onClose() }} />
      </EditSheet>

      <PhotoBackgroundSheet open={bgSheetOpen} onChoose={handleBgChoice} />
    </>
  )
}

/* ── Goal Edit Sheet ─────────────────────────────────────────────────────────── */
function GoalEditSheet({ goal, primary, onClose }: { goal: Goal; primary: string; onClose: () => void }) {
  const updateGoal        = useAppStore(s => s.updateGoal)
  const deleteGoal        = useAppStore(s => s.deleteGoal)
  const incrementProgress = useAppStore(s => s.incrementGoalProgress)
  const uploadGoalPhoto   = useAppStore(s => s.uploadGoalPhoto)
  const uploadPageBg      = useAppStore(s => s.uploadPageBackground)
  const photoInputRef     = useRef<HTMLInputElement>(null)

  const [title, setTitle]       = useState(goal.title)
  const [notes, setNotes]       = useState(goal.notes ?? '')
  const [date, setDate]         = useState(goal.targetDate ?? '')
  const [time, setTime]         = useState(goal.startTime ?? '')
  const [category, setCategory] = useState<GoalCategory>(goal.categoryId)
  const [uploading, setUploading]     = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [bgSheetOpen, setBgSheetOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setBgSheetOpen(true)
    e.target.value = ''
  }

  async function handleBgChoice(choice: PhotoUseChoice) {
    setBgSheetOpen(false)
    if (!pendingFile) return
    setUploading(true)
    if (choice === 'together' || choice === 'plans' || choice === 'us') {
      await uploadPageBg(choice, pendingFile)
    } else {
      await uploadGoalPhoto(goal.id, pendingFile)
    }
    setUploading(false)
    setPendingFile(null)
  }

  const hasBar = goal.progressTarget > 0
  const pct    = hasBar ? Math.min((goal.progressCurrent / goal.progressTarget) * 100, 100) : 0

  function save() {
    if (!title.trim()) return
    updateGoal(goal.id, {
      title: title.trim(),
      notes: notes.trim() || undefined,
      targetDate: date || undefined,
      startTime: time || undefined,
      categoryId: category,
    })
    onClose()
  }

  return (
    <>
      <EditSheet title="Edit dream" onClose={onClose}>
        {/* Category picker */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {GOAL_CATEGORIES.map(([id, cfg]) => (
              <button
                key={id}
                onClick={() => setCategory(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  category === id ? 'text-white' : 'bg-gray-100 text-gray-500'
                )}
                style={category === id ? { background: primary } : {}}
              >
                {cfg.emoji} {cfg.label}
              </button>
            ))}
          </div>
        </div>

        <TitleInput value={title} onChange={setTitle} placeholder="What do you dream of?" />
        <NotesInput value={notes} onChange={setNotes} />
        <DateTimeRow date={date} time={time} onDate={setDate} onTime={setTime} label="Target date" />

        {hasBar && (
          <div className="mb-4 bg-gray-50 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500">Progress</p>
              <span className="text-xs font-bold" style={{ color: primary }}>
                {goal.progressCurrent}/{goal.progressTarget}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: primary }} />
            </div>
            <button
              onClick={() => { incrementProgress(goal.id); onClose() }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: primary }}
            >
              +1 Progress
            </button>
          </div>
        )}

        {/* Photos */}
        {goal.photos && goal.photos.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {goal.photos.map((url, i) => (
              <img key={i} src={url} alt="" className="w-20 h-20 rounded-2xl object-cover shrink-0" />
            ))}
          </div>
        )}
        <div className="mb-4">
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoPick} />
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-50 text-gray-500 text-sm font-medium border border-dashed border-gray-200 active:bg-gray-100 disabled:opacity-50"
          >
            <Camera size={16} /> {uploading ? 'Uploading...' : 'Add photo or set as background'}
          </button>
        </div>

        <button
          onClick={() => { updateGoal(goal.id, { isCompleted: !goal.isCompleted }); onClose() }}
          className="w-full py-3 rounded-2xl text-sm font-medium bg-gray-50 text-gray-600 mb-2"
        >
          {goal.isCompleted ? 'Reopen dream' : 'Mark as achieved 🎉'}
        </button>

        <button
          onClick={save}
          disabled={!title.trim()}
          className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold mb-3 disabled:opacity-40"
          style={{ background: primary }}
        >
          Save changes
        </button>

        <DeleteRow show={confirmDelete} onAsk={() => setConfirmDelete(true)} onCancel={() => setConfirmDelete(false)}
          onConfirm={() => { deleteGoal(goal.id); onClose() }} />
      </EditSheet>

      <PhotoBackgroundSheet open={bgSheetOpen} onChoose={handleBgChoice} />
    </>
  )
}

/* ── Wish Edit Sheet ─────────────────────────────────────────────────────────── */
function WishEditSheet({ item, primary, onClose }: { item: WishlistItem; primary: string; onClose: () => void }) {
  const updateWishlistItem  = useAppStore(s => s.updateWishlistItem)
  const deleteWishlistItem  = useAppStore(s => s.deleteWishlistItem)
  const toggleWishlistItem  = useAppStore(s => s.toggleWishlistItem)
  const uploadWishlistPhoto = useAppStore(s => s.uploadWishlistPhoto)
  const uploadPageBg        = useAppStore(s => s.uploadPageBackground)
  const photoInputRef       = useRef<HTMLInputElement>(null)

  const [title, setTitle]       = useState(item.title)
  const [notes, setNotes]       = useState(item.notes ?? '')
  const [category, setCategory] = useState<WishlistCategory>(item.category)
  const [date, setDate]         = useState(item.date ?? '')
  const [time, setTime]         = useState(item.startTime ?? '')
  const [uploading, setUploading]     = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [bgSheetOpen, setBgSheetOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setBgSheetOpen(true)
    e.target.value = ''
  }

  async function handleBgChoice(choice: PhotoUseChoice) {
    setBgSheetOpen(false)
    if (!pendingFile) return
    setUploading(true)
    if (choice === 'together' || choice === 'plans' || choice === 'us') {
      await uploadPageBg(choice, pendingFile)
    } else {
      await uploadWishlistPhoto(item.id, pendingFile)
    }
    setUploading(false)
    setPendingFile(null)
  }

  function save() {
    if (!title.trim()) return
    updateWishlistItem(item.id, {
      title: title.trim(),
      notes: notes.trim() || undefined,
      category,
      date: date || undefined,
      startTime: time || undefined,
    })
    onClose()
  }

  return (
    <>
      <EditSheet title="Edit wish" onClose={onClose}>
        {/* Category picker */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Category</p>
          <div className="flex flex-wrap gap-2">
            {WISH_CATEGORIES.map(([id, cfg]) => (
              <button
                key={id}
                onClick={() => setCategory(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  category === id ? 'text-white' : 'bg-gray-100 text-gray-500'
                )}
                style={category === id ? { background: primary } : {}}
              >
                {cfg.emoji} {cfg.label}
              </button>
            ))}
          </div>
        </div>

        <TitleInput value={title} onChange={setTitle} placeholder="What do you wish for?" />
        <NotesInput value={notes} onChange={setNotes} />
        <DateTimeRow date={date} time={time} onDate={setDate} onTime={setTime} label="Date & time (optional)" />

        {/* Photos */}
        {item.photos && item.photos.length > 0 && (
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {item.photos.map((url, i) => (
              <img key={i} src={url} alt="" className="w-20 h-20 rounded-2xl object-cover shrink-0" />
            ))}
          </div>
        )}
        <div className="mb-4">
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoPick} />
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-50 text-gray-500 text-sm font-medium border border-dashed border-gray-200 active:bg-gray-100 disabled:opacity-50"
          >
            <Camera size={16} /> {uploading ? 'Uploading...' : 'Add photo or set as background'}
          </button>
        </div>

        <button
          onClick={() => { toggleWishlistItem(item.id); onClose() }}
          className="w-full py-3 rounded-2xl text-sm font-medium bg-gray-50 text-gray-600 mb-2"
        >
          {item.isCompleted ? 'Mark as pending' : 'Mark as made real 💜'}
        </button>

        <button
          onClick={save}
          disabled={!title.trim()}
          className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold mb-3 disabled:opacity-40"
          style={{ background: primary }}
        >
          Save changes
        </button>

        <DeleteRow show={confirmDelete} onAsk={() => setConfirmDelete(true)} onCancel={() => setConfirmDelete(false)}
          onConfirm={() => { deleteWishlistItem(item.id); onClose() }} />
      </EditSheet>

      <PhotoBackgroundSheet open={bgSheetOpen} onChoose={handleBgChoice} />
    </>
  )
}

/* ── Shared edit sheet primitives ────────────────────────────────────────────── */
function EditSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      <>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        />
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 380 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-modal
                     max-w-lg mx-auto max-h-[90vh] overflow-y-auto"
        >
          <div className="px-5 pt-4 pb-10">
            <div className="drag-handle" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-gray-800">{title}</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
              >
                <X size={16} />
              </button>
            </div>
            {children}
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  )
}

function TitleInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="mb-4">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-base font-semibold text-gray-800 placeholder:text-gray-300
                   border-b-2 border-gray-100 focus:border-gray-200 pb-3 outline-none bg-transparent"
      />
    </div>
  )
}

function NotesInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes 📝</p>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Add context, ideas, or extra details..."
        rows={3}
        className="w-full text-sm text-gray-700 placeholder:text-gray-300 bg-gray-50
                   rounded-2xl px-4 py-3 outline-none resize-none leading-relaxed"
      />
    </div>
  )
}

function DateTimeRow({
  date, time, onDate, onTime, label = 'Date & time',
}: {
  date: string; time: string
  onDate: (v: string) => void; onTime: (v: string) => void
  label?: string
}) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={e => onDate(e.target.value)}
          className="flex-1 text-sm text-gray-600 bg-gray-50 rounded-2xl px-4 py-3 outline-none"
        />
        <input
          type="time"
          value={time}
          onChange={e => onTime(e.target.value)}
          className="w-28 text-sm text-gray-600 bg-gray-50 rounded-2xl px-3 py-3 outline-none"
        />
      </div>
    </div>
  )
}

function DeleteRow({
  show, onAsk, onCancel, onConfirm,
}: {
  show: boolean; onAsk: () => void; onCancel: () => void; onConfirm: () => void
}) {
  if (!show) {
    return (
      <button
        onClick={onAsk}
        className="w-full py-2 flex items-center justify-center gap-1.5 text-red-400 text-sm"
      >
        <Trash2 size={13} /> Delete
      </button>
    )
  }
  return (
    <div className="flex gap-2">
      <button
        onClick={onCancel}
        className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 text-sm font-medium"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium"
      >
        Delete
      </button>
    </div>
  )
}

/* ── Shopping Section ────────────────────────────────────────────────────────── */
function ShoppingSection({ primary }: { primary: string }) {
  const lists      = useAppStore(s => s.shoppingLists)
  const createList = useAppStore(s => s.createShoppingList)
  const deleteList = useAppStore(s => s.deleteShoppingList)
  const addItem    = useAppStore(s => s.addShoppingItem)
  const toggleItem = useAppStore(s => s.toggleShoppingItem)
  const deleteItem = useAppStore(s => s.deleteShoppingItem)

  const [newListName, setNewListName]       = useState('')
  const [editingListId, setEditingListId]   = useState<string | null>(null)
  const [newItemName, setNewItemName]       = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('1')
  const [showCreateList, setShowCreateList] = useState(false)

  function handleCreateList() {
    if (!newListName.trim()) return
    createList(newListName.trim())
    setNewListName('')
    setShowCreateList(false)
  }

  function handleAddItem(listId: string) {
    if (!newItemName.trim()) return
    addItem(listId, newItemName.trim(), parseInt(newItemQuantity) || 1)
    setNewItemName('')
    setNewItemQuantity('1')
  }

  const createModal = (
    <AnimatePresence>
      {showCreateList && (
        <>
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setShowCreateList(false)} />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
          >
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-modal">
              <h3 className="font-bold text-gray-800 mb-4">New Shopping List 🛒</h3>
              <input
                type="text"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
                placeholder="e.g., Weekly Groceries"
                className="w-full text-sm text-gray-700 bg-gray-50 rounded-2xl px-4 py-3 outline-none mb-4"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleCreateList()}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateList(false)}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateList}
                  disabled={!newListName.trim()}
                  className="flex-1 py-3 rounded-2xl text-white font-medium text-sm disabled:opacity-40"
                  style={{ background: primary }}
                >
                  Create
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  if (lists.length === 0) {
    return (
      <div className="px-5">
        <div className="flex flex-col items-center justify-center pt-16 text-center">
          <div className="text-5xl mb-4">🛒</div>
          <p className="font-semibold text-gray-600 mb-1">No shopping lists yet</p>
          <p className="text-sm text-gray-400 mb-4">Create one to track what you need</p>
          <button
            onClick={() => setShowCreateList(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-sm font-semibold"
            style={{ background: primary }}
          >
            <Plus size={16} /> Create Shopping List
          </button>
        </div>
        {createModal}
      </div>
    )
  }

  return (
    <div className="px-5 space-y-3">
      <button
        onClick={() => setShowCreateList(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-medium"
      >
        <Plus size={16} /> New Shopping List
      </button>

      {lists.map(list => {
        const completed = list.items.filter(i => i.isChecked).length
        const total     = list.items.length
        const allDone   = total > 0 && completed === total

        return (
          <motion.div
            key={list.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-card overflow-hidden"
          >
            <div
              className="px-4 py-3 flex items-center justify-between cursor-pointer"
              onClick={() => setEditingListId(editingListId === list.id ? null : list.id)}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag size={18} className="text-gray-400" />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{list.name}</p>
                  <p className="text-xs text-gray-400">
                    {completed}/{total} items{allDone && total > 0 && ' 🎉'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); deleteList(list.id) }}
                  className="text-gray-300 active:text-red-400 p-1"
                >
                  <Trash2 size={14} />
                </button>
                <motion.div animate={{ rotate: editingListId === list.id ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={16} className="text-gray-400" />
                </motion.div>
              </div>
            </div>

            <AnimatePresence>
              {editingListId === list.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2">
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-2">
                      <input
                        type="text"
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        placeholder="Add item..."
                        className="flex-1 text-sm text-gray-700 bg-transparent outline-none px-2"
                        onKeyDown={e => e.key === 'Enter' && handleAddItem(list.id)}
                      />
                      <input
                        type="number"
                        value={newItemQuantity}
                        onChange={e => setNewItemQuantity(e.target.value)}
                        className="w-12 text-sm text-gray-700 bg-white rounded-xl px-2 py-1 outline-none border border-gray-200 text-center"
                        min="1"
                      />
                      <button
                        onClick={() => handleAddItem(list.id)}
                        disabled={!newItemName.trim()}
                        className="p-2 rounded-xl text-white disabled:opacity-40 shrink-0"
                        style={{ background: primary }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    {list.items.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-4">No items yet</p>
                    ) : (
                      list.items.map(item => (
                        <motion.div
                          key={item.id}
                          layout
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-xl border transition-all',
                            item.isChecked ? 'opacity-50 bg-gray-50 border-gray-100' : 'bg-white border-gray-100'
                          )}
                        >
                          <button
                            onClick={() => toggleItem(list.id, item.id)}
                            className={cn(
                              'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                              item.isChecked ? 'border-emerald-400 bg-emerald-400' : 'border-gray-300'
                            )}
                          >
                            {item.isChecked && <Check size={10} color="white" strokeWidth={3} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-medium', item.isChecked ? 'line-through text-gray-400' : 'text-gray-800')}>
                              {item.name}
                            </p>
                            {item.quantity > 1 && (
                              <span className="text-[10px] font-semibold text-gray-400">×{item.quantity}</span>
                            )}
                          </div>
                          <button
                            onClick={() => deleteItem(list.id, item.id)}
                            className="text-gray-300 active:text-red-400 p-1"
                          >
                            <X size={14} />
                          </button>
                        </motion.div>
                      ))
                    )}

                    {allDone && total > 0 && (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center py-3 bg-emerald-50 rounded-xl border border-emerald-200"
                      >
                        <p className="text-sm font-bold text-emerald-600">🎉 Good job! You got everything!</p>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}

      {createModal}
    </div>
  )
}

/* ── Empty state ─────────────────────────────────────────────────────────────── */
function EmptyState({ emoji, text, sub }: { emoji: string; text: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center pt-16 text-center px-8">
      <div className="text-5xl mb-4">{emoji}</div>
      <p className="font-semibold text-gray-600 mb-1">{text}</p>
      <p className="text-sm text-gray-400">{sub}</p>
    </div>
  )
}
