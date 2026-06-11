'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, ChevronUp, Calendar, Clock } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { WISHLIST_CATEGORY_CONFIG, cn, formatDate, formatTime } from '@/lib/utils'
import type { Goal, GoalCategory } from '@/types'

const GOAL_CATEGORY_CONFIG: Record<GoalCategory, { emoji: string; label: string }> = {
  travel:     { emoji: '✈️', label: 'Travel' },
  money:      { emoji: '💰', label: 'Money' },
  fitness:    { emoji: '💪', label: 'Fitness' },
  life:       { emoji: '🌱', label: 'Life' },
  learning:   { emoji: '📚', label: 'Learning' },
  hobbies:    { emoji: '🎨', label: 'Hobbies' },
  challenges: { emoji: '🏆', label: 'Challenges' },
}

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
      {/* Header */}
      <div className="px-5 mb-5">
        <h1 className="text-2xl font-bold text-gray-800">Plans</h1>
        <p className="text-sm text-gray-400">what's ahead for you two</p>
      </div>

      {/* Tab switcher */}
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

      {/* Tab content */}
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
  const [expanded, setExpanded] = useState<string | null>(null)

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
            className="flex items-center gap-3 p-4 cursor-pointer"
            onClick={() => setExpanded(expanded === todo.id ? null : todo.id)}
          >
            <button
              onClick={e => { e.stopPropagation(); toggleTodo(todo.id) }}
              className="w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
              style={{ borderColor: '#d1d5db' }}
            />
            <p className="flex-1 text-sm font-medium text-gray-700 min-w-0 truncate">{todo.title}</p>
            {(todo.items?.length || todo.notes) && (
              expanded === todo.id
                ? <ChevronUp size={14} className="text-gray-300 shrink-0" />
                : <ChevronDown size={14} className="text-gray-300 shrink-0" />
            )}
          </div>
          <AnimatePresence>
            {expanded === todo.id && (todo.items?.length || todo.notes || todo.date) && (
              <motion.div
                initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-2">
                  {todo.date && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar size={11} />
                      {formatDate(todo.date, 'MMM d, yyyy')}
                      {todo.startTime && (
                        <span className="flex items-center gap-1 ml-1">
                          <Clock size={10} /> {formatTime(todo.startTime)}
                        </span>
                      )}
                    </div>
                  )}
                  {todo.notes && (
                    <p className="text-xs text-gray-500 leading-relaxed">{todo.notes}</p>
                  )}
                  {todo.items?.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
              className="flex items-center gap-3 bg-white rounded-2xl shadow-card p-4 mb-2 opacity-50"
            >
              <button
                onClick={() => toggleTodo(todo.id)}
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
    </div>
  )
}

/* ── Goals / Dreams ─────────────────────────────────────────────────────────── */
function DreamsSection({ primary }: { primary: string }) {
  const goals             = useAppStore(s => s.goals)
  const incrementProgress = useAppStore(s => s.incrementGoalProgress)
  const updateGoal        = useAppStore(s => s.updateGoal)
  const [expanded, setExpanded] = useState<string | null>(null)

  const active    = goals.filter(g => !g.isCompleted)
  const completed = goals.filter(g => g.isCompleted)

  if (goals.length === 0) {
    return <EmptyState emoji="✨" text="No dreams yet" sub="tap + to add something to dream about" />
  }

  return (
    <div className="px-5 space-y-2">
      {active.map(goal => {
        const cat     = GOAL_CATEGORY_CONFIG[goal.categoryId]
        const hasBar  = goal.progressTarget > 0
        const pct     = hasBar ? Math.min((goal.progressCurrent / goal.progressTarget) * 100, 100) : 0
        const isOpen  = expanded === goal.id

        return (
          <motion.div
            key={goal.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-card overflow-hidden"
          >
            <div
              className="flex items-center gap-3 p-4 cursor-pointer"
              onClick={() => setExpanded(isOpen ? null : goal.id)}
            >
              <span className="text-xl shrink-0">{cat.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{goal.title}</p>
                {hasBar && (
                  <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: primary }}
                    />
                  </div>
                )}
              </div>
              {hasBar && (
                <span className="text-[10px] font-bold shrink-0" style={{ color: primary }}>
                  {goal.progressCurrent}/{goal.progressTarget}
                </span>
              )}
              {isOpen ? <ChevronUp size={14} className="text-gray-300 shrink-0" /> : <ChevronDown size={14} className="text-gray-300 shrink-0" />}
            </div>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3">
                    {goal.notes && (
                      <p className="text-xs text-gray-500 leading-relaxed">{goal.notes}</p>
                    )}
                    {goal.targetDate && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Calendar size={11} />
                        {formatDate(goal.targetDate, 'MMM d, yyyy')}
                      </div>
                    )}
                    <div className="flex gap-2">
                      {hasBar && (
                        <button
                          onClick={() => incrementProgress(goal.id)}
                          className="flex-1 py-2 rounded-xl text-xs font-semibold text-white"
                          style={{ background: primary }}
                        >
                          +1 Progress
                        </button>
                      )}
                      <button
                        onClick={() => updateGoal(goal.id, { isCompleted: true })}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-600"
                      >
                        Mark done ✓
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}

      {completed.length > 0 && (
        <div className="pt-4">
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2 px-1">
            Dreams achieved 🎉 ({completed.length})
          </p>
          {completed.map(goal => (
            <div key={goal.id} className="flex items-center gap-3 bg-white rounded-2xl shadow-card p-4 mb-2 opacity-50">
              <span className="text-lg">{GOAL_CATEGORY_CONFIG[goal.categoryId].emoji}</span>
              <p className="text-sm text-gray-400 line-through flex-1 min-w-0 truncate">{goal.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Wishlist ────────────────────────────────────────────────────────────────── */
function WishesSection({ primary }: { primary: string }) {
  const items  = useAppStore(s => s.wishlistItems)
  const toggle = useAppStore(s => s.toggleWishlistItem)

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
            className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-3"
          >
            <button
              onClick={() => toggle(item.id)}
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
          </motion.div>
        )
      })}

      {completed.length > 0 && (
        <div className="pt-4">
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-2 px-1">
            Made real ✨ ({completed.length})
          </p>
          {completed.map(item => (
            <div key={item.id} className="flex items-center gap-3 bg-white rounded-2xl shadow-card p-4 mb-2 opacity-50">
              <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ background: primary }}>
                <Check size={12} color="white" strokeWidth={3} />
              </div>
              <p className="text-sm text-gray-400 line-through flex-1 min-w-0 truncate">{item.title}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Shared empty state ──────────────────────────────────────────────────────── */
function EmptyState({ emoji, text, sub }: { emoji: string; text: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center pt-16 text-center px-8">
      <div className="text-5xl mb-4">{emoji}</div>
      <p className="font-semibold text-gray-600 mb-1">{text}</p>
      <p className="text-sm text-gray-400">{sub}</p>
    </div>
  )
}
