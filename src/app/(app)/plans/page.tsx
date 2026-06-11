'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Calendar, Clock, X, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { WISHLIST_CATEGORY_CONFIG, cn, formatDate, formatTime } from '@/lib/utils'
import type { Goal, GoalCategory, SharedTodo, WishlistItem, WishlistCategory } from '@/types'

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

type PlanTab = 'plans' | 'dreams' | 'wishes'

const TABS: { id: PlanTab; label: string; emoji: string }[] = [
  { id: 'plans',  label: 'Plans',  emoji: '✅' },
  { id: 'dreams', label: 'Dreams', emoji: '✨' },
  { id: 'wishes', label: 'Wishes', emoji: '💫' },
]

export default function PlansPage() {
  const currentUser = useAppStore(s => s.currentUser)!
  const isSeval     = currentUser === 'seval'
  const primary     = isSeval ? '#8b5cf6' : '#14b8a6'

  const [activeTab, setActiveTab] = useState<PlanTab>('plans')

  return (
    <div className="min-h-screen pt-14 pb-32">
      <div className="px-5 mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Plans</h1>
        <p className="text-sm text-gray-400">what's ahead for you two</p>
      </div>

      <div className="flex gap-2 px-5 mb-6">
        {TABS.map(tab => (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all"
            style={activeTab === tab.id
              ? { background: primary, color: 'white' }
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
          {activeTab === 'plans'  && <TodosSection  primary={primary} />}
          {activeTab === 'dreams' && <DreamsSection primary={primary} />}
          {activeTab === 'wishes' && <WishesSection primary={primary} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ── Todos ──────────────────────────────────────────────────────────────────── */
function TodosSection({ primary }: { primary: string }) {
  const todos      = useAppStore(s => s.todos)
  const toggleTodo = useAppStore(s => s.toggleTodo)
  const [editing, setEditing] = useState<SharedTodo | null>(null)

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
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2 px-1">
            Shared 💞 ({completed.length})
          </p>
          {completed.map(todo => (
            <motion.div
              key={todo.id}
              layout
              className="flex items-center gap-3 bg-white rounded-2xl shadow-card p-4 mb-2 opacity-50 cursor-pointer"
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
  const [editing, setEditing] = useState<Goal | null>(null)

  const active    = goals.filter(g => !g.isCompleted)
  const completed = goals.filter(g => g.isCompleted)

  if (goals.length === 0) {
    return <EmptyState emoji="✨" text="No dreams yet" sub="tap + to add something to dream about" />
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
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2 px-1">
            Dreams achieved 🎉 ({completed.length})
          </p>
          {completed.map(goal => (
            <div
              key={goal.id}
              className="flex items-center gap-3 bg-white rounded-2xl shadow-card p-4 mb-2 opacity-50 cursor-pointer"
              onClick={() => setEditing(goal)}
            >
              <span className="text-lg">{GOAL_CATEGORY_CONFIG[goal.categoryId].emoji}</span>
              <p className="text-sm text-gray-400 line-through flex-1 min-w-0 truncate">{goal.title}</p>
            </div>
          ))}
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
  const [editing, setEditing] = useState<WishlistItem | null>(null)

  const pending   = items.filter(i => !i.isCompleted)
  const completed = items.filter(i => i.isCompleted)

  if (items.length === 0) {
    return <EmptyState emoji="💫" text="No wishes yet" sub="tap + to add something to dream about" />
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
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2 px-1">
            Made real ✨ ({completed.length})
          </p>
          {completed.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-white rounded-2xl shadow-card p-4 mb-2 opacity-50 cursor-pointer"
              onClick={() => setEditing(item)}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: primary }}>
                <Check size={12} color="white" strokeWidth={3} />
              </div>
              <p className="text-sm text-gray-400 line-through flex-1 min-w-0 truncate">{item.title}</p>
            </div>
          ))}
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
  const updateTodo = useAppStore(s => s.updateTodo)
  const deleteTodo = useAppStore(s => s.deleteTodo)
  const toggleTodo = useAppStore(s => s.toggleTodo)

  const [title, setTitle] = useState(todo.title)
  const [notes, setNotes] = useState(todo.notes ?? '')
  const [date, setDate]   = useState(todo.date ?? '')
  const [time, setTime]   = useState(todo.startTime ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function save() {
    if (!title.trim()) return
    updateTodo(todo.id, {
      title: title.trim(),
      notes: notes.trim() || undefined,
      date: date || undefined,
      startTime: time || undefined,
    })
    onClose()
  }

  return (
    <EditSheet title={todo.isCompleted ? 'Completed plan' : 'Edit plan'} onClose={onClose}>
      <TitleInput value={title} onChange={setTitle} placeholder="What's the plan?" />
      <NotesInput value={notes} onChange={setNotes} />
      <DateTimeRow date={date} time={time} onDate={setDate} onTime={setTime} />

      <button
        onClick={() => { toggleTodo(todo.id); onClose() }}
        className="w-full py-3 rounded-2xl text-sm font-medium bg-gray-50 text-gray-600 mb-2"
      >
        {todo.isCompleted ? 'Mark as pending' : 'Mark as done ✓'}
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
        onConfirm={() => { deleteTodo(todo.id); onClose() }} />
    </EditSheet>
  )
}

/* ── Goal Edit Sheet ─────────────────────────────────────────────────────────── */
function GoalEditSheet({ goal, primary, onClose }: { goal: Goal; primary: string; onClose: () => void }) {
  const updateGoal        = useAppStore(s => s.updateGoal)
  const deleteGoal        = useAppStore(s => s.deleteGoal)
  const incrementProgress = useAppStore(s => s.incrementGoalProgress)

  const [title, setTitle]       = useState(goal.title)
  const [notes, setNotes]       = useState(goal.notes ?? '')
  const [date, setDate]         = useState(goal.targetDate ?? '')
  const [time, setTime]         = useState(goal.startTime ?? '')
  const [category, setCategory] = useState<GoalCategory>(goal.categoryId)
  const [confirmDelete, setConfirmDelete] = useState(false)

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
  )
}

/* ── Wish Edit Sheet ─────────────────────────────────────────────────────────── */
function WishEditSheet({ item, primary, onClose }: { item: WishlistItem; primary: string; onClose: () => void }) {
  const updateWishlistItem = useAppStore(s => s.updateWishlistItem)
  const deleteWishlistItem = useAppStore(s => s.deleteWishlistItem)
  const toggleWishlistItem = useAppStore(s => s.toggleWishlistItem)

  const [title, setTitle]       = useState(item.title)
  const [notes, setNotes]       = useState(item.notes ?? '')
  const [category, setCategory] = useState<WishlistCategory>(item.category)
  const [date, setDate]         = useState(item.date ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function save() {
    if (!title.trim()) return
    updateWishlistItem(item.id, {
      title: title.trim(),
      notes: notes.trim() || undefined,
      category,
      date: date || undefined,
    })
    onClose()
  }

  return (
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

      {/* Optional date */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Date (optional)</p>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full text-sm text-gray-600 bg-gray-50 rounded-2xl px-4 py-3 outline-none"
        />
      </div>

      <button
        onClick={() => { toggleWishlistItem(item.id); onClose() }}
        className="w-full py-3 rounded-2xl text-sm font-medium bg-gray-50 text-gray-600 mb-2"
      >
        {item.isCompleted ? 'Mark as pending' : 'Mark as made real ✨'}
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
