'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Check, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { type WishlistCategory } from '@/types'
import { WISHLIST_CATEGORY_CONFIG, cn } from '@/lib/utils'

const CATEGORIES = Object.entries(WISHLIST_CATEGORY_CONFIG) as [
  WishlistCategory,
  { emoji: string; label: string }
][]

export default function WishlistPage() {
  const currentUser       = useAppStore(s => s.currentUser)!
  const wishlistItems     = useAppStore(s => s.wishlistItems)
  const addWishlistItem   = useAppStore(s => s.addWishlistItem)
  const toggleWishlistItem = useAppStore(s => s.toggleWishlistItem)
  const deleteWishlistItem = useAppStore(s => s.deleteWishlistItem)

  const [showForm, setShowForm]         = useState(false)
  const [newTitle, setNewTitle]         = useState('')
  const [newCategory, setNewCategory]   = useState<WishlistCategory>('date')
  const [newNotes, setNewNotes]         = useState('')
  const [activeFilter, setActiveFilter] = useState<WishlistCategory | 'all'>('all')

  const isSeval      = currentUser === 'seval'
  const primaryColor = isSeval ? '#8b5cf6' : '#14b8a6'
  const lightBg      = isSeval ? 'bg-seval-50' : 'bg-mateo-50'

  function handleAdd() {
    if (!newTitle.trim()) return
    addWishlistItem(newTitle.trim(), newCategory, newNotes.trim() || undefined)
    setNewTitle('')
    setNewNotes('')
    setShowForm(false)
  }

  const filtered = wishlistItems.filter(
    i => activeFilter === 'all' || i.category === activeFilter
  )
  const pending   = filtered.filter(i => !i.isCompleted)
  const completed = filtered.filter(i => i.isCompleted)

  return (
    <div className="min-h-screen px-4 pt-14">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Wishlist</h1>
          <p className="text-sm text-gray-400 mt-0.5">things to do together</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-soft
                     active:scale-90 transition-transform"
          style={{ background: primaryColor }}
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <div className={cn('rounded-3xl p-4', lightBg)}>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="What do you want to do?"
                autoFocus
                className="w-full text-sm text-gray-700 placeholder:text-gray-400 bg-transparent
                           outline-none border-b border-gray-200 pb-2 mb-3"
              />

              {/* Category selector */}
              <div className="flex gap-2 flex-wrap mb-3">
                {CATEGORIES.map(([cat, cfg]) => (
                  <button
                    key={cat}
                    onClick={() => setNewCategory(cat)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                      newCategory === cat
                        ? 'text-white shadow-sm'
                        : 'bg-white text-gray-500'
                    )}
                    style={newCategory === cat ? { background: primaryColor } : {}}
                  >
                    <span>{cfg.emoji}</span>
                    {cfg.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full text-xs text-gray-500 placeholder:text-gray-300 bg-transparent
                           outline-none mb-3"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => { setShowForm(false); setNewTitle(''); setNewNotes('') }}
                  className="flex-1 py-2.5 rounded-2xl bg-white text-gray-500 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newTitle.trim()}
                  className="flex-1 py-2.5 rounded-2xl text-white text-sm font-semibold
                             disabled:opacity-40"
                  style={{ background: primaryColor }}
                >
                  Add
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          onClick={() => setActiveFilter('all')}
          className={cn(
            'shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
            activeFilter === 'all' ? 'text-white' : 'bg-white text-gray-500 shadow-card'
          )}
          style={activeFilter === 'all' ? { background: primaryColor } : {}}
        >
          All
        </button>
        {CATEGORIES.map(([cat, cfg]) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={cn(
              'shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
              activeFilter === cat ? 'text-white' : 'bg-white text-gray-500 shadow-card'
            )}
            style={activeFilter === cat ? { background: primaryColor } : {}}
          >
            <span>{cfg.emoji}</span>
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Items */}
      {wishlistItems.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center pt-16 text-center"
        >
          <div className="text-5xl mb-4">✨</div>
          <p className="font-semibold text-gray-600 mb-1">Your wishlist is empty</p>
          <p className="text-sm text-gray-400">Add restaurants, movies, date ideas...</p>
        </motion.div>
      ) : (
        <>
          <AnimatePresence mode="popLayout">
            {pending.map(item => (
              <WishlistItemCard
                key={item.id}
                item={item}
                onToggle={() => toggleWishlistItem(item.id)}
                onDelete={() => deleteWishlistItem(item.id)}
                primaryColor={primaryColor}
              />
            ))}
          </AnimatePresence>

          {completed.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">
                Done ({completed.length})
              </p>
              <AnimatePresence mode="popLayout">
                {completed.map(item => (
                  <WishlistItemCard
                    key={item.id}
                    item={item}
                    onToggle={() => toggleWishlistItem(item.id)}
                    onDelete={() => deleteWishlistItem(item.id)}
                    primaryColor={primaryColor}
                    isDone
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function WishlistItemCard({
  item, onToggle, onDelete, primaryColor, isDone,
}: {
  item: ReturnType<typeof useAppStore.getState>['wishlistItems'][number]
  onToggle: () => void
  onDelete: () => void
  primaryColor: string
  isDone?: boolean
}) {
  const cat = WISHLIST_CATEGORY_CONFIG[item.category]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex items-start gap-3 bg-white rounded-2xl p-4 mb-2 shadow-card group"
    >
      <button
        onClick={onToggle}
        className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                   transition-all active:scale-90"
        style={{
          borderColor: isDone ? primaryColor : '#d1d5db',
          background: isDone ? primaryColor : 'transparent',
        }}
      >
        {isDone && <Check size={13} color="white" strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs">{cat.emoji}</span>
          <span className="text-[10px] text-gray-400 font-medium">{cat.label}</span>
        </div>
        <p className={cn('text-sm font-medium', isDone ? 'line-through text-gray-300' : 'text-gray-700')}>
          {item.title}
        </p>
        {item.notes && (
          <p className="text-xs text-gray-400 mt-0.5">{item.notes}</p>
        )}
      </div>

      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-gray-300 active:text-red-400
                   transition-all shrink-0 mt-0.5"
      >
        <Trash2 size={15} />
      </button>
    </motion.div>
  )
}
