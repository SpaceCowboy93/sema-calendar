'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Camera, Check, Trash2, Pencil, ScanLine } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useLightboxStore } from '@/store/useLightboxStore'
import { ShoppingListEditorSheet, effectivePhotos } from '@/components/ui/ShoppingListEditorSheet'
import DeleteConfirmSheet from '@/components/ui/DeleteConfirmSheet'
import { ReceiptScannerSheet } from '@/components/ui/ReceiptScannerSheet'
import { ReceiptReviewSheet } from '@/components/ui/ReceiptReviewSheet'
import { FullCreateSheet } from '@/components/ui/FullCreateSheet'
import {
  WISHLIST_CATEGORY_CONFIG, cn, formatTime, getTodayString,
} from '@/lib/utils'
import {
  USERS,
  type UserName, type WishlistCategory, type GoalCategory,
  type EventColor, type CalendarEvent, type ShoppingList, type ShoppingItem,
  type ReceiptResult, type ShoppingListReceipt,
} from '@/types'

/* ── Constants ─────────────────────────────────────────────────────────────── */
export const GOAL_CATEGORIES: [GoalCategory, { emoji: string; label: string }][] = [
  ['travel',     { emoji: '✈️', label: 'Travel'     }],
  ['money',      { emoji: '💰', label: 'Money'      }],
  ['fitness',    { emoji: '💪', label: 'Fitness'    }],
  ['life',       { emoji: '🌱', label: 'Life'       }],
  ['learning',   { emoji: '📚', label: 'Learning'   }],
  ['hobbies',    { emoji: '🎨', label: 'Hobbies'    }],
  ['challenges', { emoji: '🏆', label: 'Challenges' }],
]

export type CategoryType = 'wishes' | 'shopping' | 'dreams' | 'moments' | 'plans'

export const CATEGORY_DEFS: { id: CategoryType; emoji: string; label: string; hex: string; color?: EventColor }[] = [
  { id: 'plans',    emoji: '💚', label: 'Plans',    hex: '#34d399', color: 'green'  },
  { id: 'dreams',   emoji: '💙', label: 'Dreams',   hex: '#60a5fa', color: 'blue'   },
  { id: 'wishes',   emoji: '💜', label: 'Wishes',   hex: '#a78bfa', color: 'seval'  },
  { id: 'shopping', emoji: '❤️', label: 'Shopping', hex: '#ef4444'                  },
  { id: 'moments',  emoji: '💛', label: 'Moments',  hex: '#fbbf24', color: 'yellow' },
]

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function listTotal(list: ShoppingList) {
  return list.items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0)
}

function resizeImage(file: File, maxPx = 800): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.src = url
  })
}

/* ── CategoryHubSheet ───────────────────────────────────────────────────────── */
export function CategoryHubSheet({
  type, primary, currentUser, onClose, onEditMoment,
}: {
  type: 'wishes' | 'dreams' | 'moments' | 'plans'
  primary: string
  currentUser: UserName
  onClose: () => void
  onEditMoment: (ev: CalendarEvent) => void
}) {
  const goals          = useAppStore(s => s.goals)
  const wishlist       = useAppStore(s => s.wishlistItems)
  const events         = useAppStore(s => s.events)
  const todos          = useAppStore(s => s.todos)
  const toggleWishlist = useAppStore(s => s.toggleWishlistItem)
  const updateGoal     = useAppStore(s => s.updateGoal)
  const updateWishlist = useAppStore(s => s.updateWishlistItem)
  const deleteGoal     = useAppStore(s => s.deleteGoal)
  const deleteWishlist = useAppStore(s => s.deleteWishlistItem)
  const toggleTodoDo   = useAppStore(s => s.toggleTodo)
  const updateTodoDo   = useAppStore(s => s.updateTodo)
  const deleteTodoDo   = useAppStore(s => s.deleteTodo)
  const sendNote       = useAppStore(s => s.sendPartnerNote)

  const def    = CATEGORY_DEFS.find(d => d.id === type)!
  const catHex = def.hex

  // Add-form state
  const [addOpen, setAddOpen] = useState(false)

  const addLabel = type === 'dreams' ? 'Dream' : type === 'wishes' ? 'Wish' : type === 'plans' ? 'Plan' : 'Moment'
  const createTypeMap = { plans: 'plan', dreams: 'dream', wishes: 'wish', moments: 'moment' } as const

  type ListItem = { id: string; title: string; sub?: string; done: boolean }

  const items: ListItem[] = useMemo(() => {
    switch (type) {
      case 'wishes':
        return wishlist.map(i => ({
          id: i.id, title: i.title,
          sub: i.notes || WISHLIST_CATEGORY_CONFIG[i.category].label,
          done: i.isCompleted,
        }))
      case 'dreams':
        return goals.map(g => ({
          id: g.id, title: g.title,
          sub: g.notes || g.targetDate,
          done: g.isCompleted,
        }))
      case 'plans':
        return todos.map(t => ({
          id: t.id, title: t.title,
          sub: t.notes || t.date,
          done: t.isCompleted,
        }))
      case 'moments':
        return [...events].sort((a, b) => a.date.localeCompare(b.date)).map(e => ({
          id: e.id, title: e.title,
          sub: e.date + (e.startTime ? ` · ${formatTime(e.startTime)}` : ''),
          done: false,
        }))
    }
  }, [type, goals, wishlist, todos, events])

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editDate,  setEditDate]  = useState('')
  const [editTime,  setEditTime]  = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  function openEdit(id: string) {
    if (type === 'moments') {
      const ev = events.find(e => e.id === id)
      if (ev) { onClose(); onEditMoment(ev) }
      return
    }
    let src: { title: string; notes?: string; date?: string; startTime?: string; targetDate?: string } | undefined
    if (type === 'wishes') src = wishlist.find(i => i.id === id)
    if (type === 'dreams') src = goals.find(g => g.id === id)
    if (type === 'plans')  src = todos.find(t => t.id === id)
    if (!src) return
    setEditTitle(src.title)
    setEditNotes(src.notes ?? '')
    setEditDate(src.date ?? src.targetDate ?? '')
    setEditTime(src.startTime ?? '')
    setEditingId(id)
  }

  function saveEdit() {
    if (!editingId || !editTitle.trim()) return
    const base = { title: editTitle.trim(), notes: editNotes.trim() || undefined, startTime: editTime || undefined }
    if (type === 'dreams') updateGoal(editingId,     { ...base, targetDate: editDate || undefined })
    if (type === 'wishes') updateWishlist(editingId, { ...base, date:       editDate || undefined })
    if (type === 'plans')  updateTodoDo(editingId,   { ...base, date:       editDate || undefined })
    setEditingId(null)
  }

  function handleDelete() {
    if (!editingId) return
    if (type === 'dreams') deleteGoal(editingId)
    if (type === 'wishes') deleteWishlist(editingId)
    if (type === 'plans')  deleteTodoDo(editingId)
    setEditingId(null)
  }

  function handleToggle(id: string, title: string, done: boolean) {
    if (type === 'wishes') toggleWishlist(id)
    if (type === 'dreams') updateGoal(id, { isCompleted: !done })
    if (type === 'plans')  toggleTodoDo(id)
    if (!done) sendNote(`${USERS[currentUser].emoji} just confirmed "${title}" ✅`)
  }

  const pending   = items.filter(i => !i.done)
  const completed = items.filter(i => i.done)

  return (
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
                   max-w-lg mx-auto flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 48px)' }}
      >
        <div className="px-5 pt-4 pb-3 shrink-0">
          <div className="drag-handle mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{def.emoji}</span>
              <div>
                <h2 className="text-base font-bold text-gray-800">{def.label}</h2>
                <p className="text-xs text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="h-px bg-gray-100 mx-5 shrink-0" />

        <div className="px-4 py-2.5 shrink-0">
          <button
            onClick={() => setAddOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-sm font-semibold"
            style={{ background: `${catHex}20`, color: catHex }}
          >
            <Plus size={15} strokeWidth={2.5} /> Add New {addLabel}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-5xl mb-3 opacity-30">{def.emoji}</span>
              <p className="text-sm text-gray-400">Nothing here yet</p>
            </div>
          ) : (
            <>
              {pending.map(item => (
                <div key={item.id} className="bg-gray-50 rounded-2xl p-3.5 flex items-center gap-3">
                  {type !== 'moments' && (
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handleToggle(item.id, item.title, item.done)}
                      className="w-6 h-6 rounded-full border-2 shrink-0 transition-all"
                      style={{ borderColor: catHex }}
                    />
                  )}
                  <button onClick={() => openEdit(item.id)} className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                    {item.sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{item.sub}</p>}
                  </button>
                  <span className="text-gray-300 text-lg shrink-0">›</span>
                </div>
              ))}
              {completed.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider pt-2 px-1">
                    Completed ({completed.length})
                  </p>
                  {completed.map(item => (
                    <div key={item.id} className="bg-gray-50 rounded-2xl p-3.5 flex items-center gap-3 opacity-50">
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => handleToggle(item.id, item.title, item.done)}
                        className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: catHex }}
                      >
                        ✓
                      </motion.button>
                      <button onClick={() => openEdit(item.id)} className="flex-1 text-left min-w-0">
                        <p className="text-sm text-gray-400 line-through truncate">{item.title}</p>
                      </button>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </motion.div>

      <DeleteConfirmSheet
        open={showDeleteConfirm}
        title={`Delete this ${addLabel.toLowerCase()}?`}
        message="This item will be permanently removed."
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => { handleDelete(); setShowDeleteConfirm(false) }}
      />

      {/* Add — full creation sheet */}
      <FullCreateSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        primary={catHex}
        initialType={createTypeMap[type]}
      />

      {/* Edit sub-sheet */}
      <AnimatePresence>
        {editingId && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditingId(null)}
              className="fixed inset-0 z-[60] bg-black/20"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 380 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[2rem] shadow-modal max-w-lg mx-auto flex flex-col"
              style={{ maxHeight: 'calc(100dvh - 48px)' }}
            >
              <div className="px-5 pt-4 pb-3 shrink-0">
                <div className="drag-handle mb-4" />
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-800">Edit {def.label.slice(0, -1)}</h3>
                  <button onClick={() => setEditingId(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pb-4">
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-2xl px-4 py-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Title</p>
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      className="w-full text-sm text-gray-800 bg-transparent outline-none" placeholder="Title..." />
                  </div>
                  <div className="bg-gray-50 rounded-2xl px-4 py-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                    <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3}
                      className="w-full text-sm text-gray-700 bg-transparent outline-none resize-none placeholder:text-gray-300"
                      placeholder="Add notes..." />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date</p>
                      <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                        className="w-full text-sm text-gray-700 bg-transparent outline-none" />
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Time</p>
                      <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)}
                        className="w-full text-sm text-gray-700 bg-transparent outline-none" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="shrink-0 px-5 pt-3 border-t border-gray-50 pb-sheet-footer">
                <div className="flex gap-2">
                  <button onClick={() => setShowDeleteConfirm(true)}
                    className="flex-1 py-3.5 rounded-2xl text-red-400 text-sm font-semibold bg-red-50 active:opacity-80">
                    Delete
                  </button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={saveEdit} disabled={!editTitle.trim()}
                    className="flex-1 py-3.5 rounded-2xl text-white text-sm font-semibold disabled:opacity-40"
                    style={{ background: catHex }}>
                    Save
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

/* ── ShoppingHubSheet ───────────────────────────────────────────────────────── */
const RED = '#ef4444'

export function ShoppingHubSheet({
  primary, currentUser, onClose,
}: {
  primary: string
  currentUser: UserName
  onClose: () => void
}) {
  const lists      = useAppStore(s => s.shoppingLists)
  const createList = useAppStore(s => s.createShoppingList)
  const updateList = useAppStore(s => s.updateShoppingList)
  const deleteList = useAppStore(s => s.deleteShoppingList)
  const addItem    = useAppStore(s => s.addShoppingItem)
  const toggleItem = useAppStore(s => s.toggleShoppingItem)
  const deleteItem = useAppStore(s => s.deleteShoppingItem)
  const updateItem = useAppStore(s => s.updateShoppingItem)

  const [view, setView] = useState<null | 'new' | string>(null)
  const openLightbox    = useLightboxStore(s => s.open)

  const incompleteLists = lists.filter(l => !l.isCompleted)
  const completedLists  = lists.filter(l =>  l.isCompleted)
  const totalPending    = incompleteLists.reduce((a, l) => a + l.items.filter(i => !i.isChecked).length, 0)
  const activeList      = typeof view === 'string' ? lists.find(l => l.id === view) ?? null : null

  return (
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
                   max-w-lg mx-auto flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 48px)' }}
      >
        <div className="px-5 pt-4 pb-3 shrink-0">
          <div className="drag-handle mb-3" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl" style={{ background: '#fff0f0' }}>❤️</div>
              <div>
                <h2 className="text-base font-bold text-gray-800">Shopping</h2>
                <p className="text-xs text-gray-400">{totalPending} item{totalPending !== 1 ? 's' : ''} to get</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('new')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                style={{ background: RED }}
              >
                <Plus size={12} /> New List
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
        <div className="h-px bg-gray-100 mx-5 shrink-0" />

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {lists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="text-5xl mb-3 opacity-30">🛍️</span>
              <p className="text-sm font-semibold text-gray-500 mb-1">No shopping lists yet</p>
              <p className="text-xs text-gray-400 mb-5">Create one or scan a receipt to get started</p>
              <button
                onClick={() => setView('new')}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-white text-sm font-semibold"
                style={{ background: RED }}
              >
                <Plus size={14} /> Create a list
              </button>
            </div>
          ) : (
            [...incompleteLists, ...completedLists].map((list, idx) => {
              const checked = list.items.filter(i => i.isChecked).length
              const total   = list.items.length
              const pct     = total > 0 ? (checked / total) * 100 : 0
              const cost    = listTotal(list)
              return (
                <motion.button
                  key={list.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: list.isCompleted ? 0.72 : 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView(list.id)}
                  className="w-full text-left rounded-2xl overflow-hidden bg-white shadow-card"
                >
                  {effectivePhotos(list)[0] && (
                    <div
                      className="w-full h-28 overflow-hidden cursor-pointer"
                      onClick={e => { e.stopPropagation(); openLightbox(effectivePhotos(list)) }}
                    >
                      <img src={effectivePhotos(list)[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-gray-800 truncate">{list.name}</p>
                          {list.isCompleted && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 shrink-0">✓ Completed</span>
                          )}
                        </div>
                        {list.storeName && <p className="text-[11px] text-gray-400 mt-0.5">📍 {list.storeName}</p>}
                        {list.date && <p className="text-[10px] text-gray-300 mt-0.5">🗓 {list.date}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        {cost > 0 && <p className="text-sm font-bold text-gray-800">€{cost.toFixed(2)}</p>}
                        <p className="text-[10px] text-gray-400">{total} item{total !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    {total > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: list.isCompleted ? '#10b981' : RED }}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{checked}/{total}</span>
                      </div>
                    )}
                  </div>
                </motion.button>
              )
            })
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {view === 'new' && (
          <ShoppingListEditorSheet
            mode="create"
            onSave={(id) => setView(id)}
            onClose={() => setView(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeList && (
          <ShoppingDetailSheet
            list={activeList}
            onUpdate={(updates) => updateList(activeList.id, updates)}
            onDelete={() => { deleteList(activeList.id); setView(null) }}
            onAddItem={(name, qty, notes, price) => addItem(activeList.id, name, qty, notes, price)}
            onToggleItem={(itemId) => toggleItem(activeList.id, itemId)}
            onDeleteItem={(itemId) => deleteItem(activeList.id, itemId)}
            onUpdateItem={(itemId, updates) => updateItem(activeList.id, itemId, updates)}
            onClose={() => setView(null)}
          />
        )}
      </AnimatePresence>

    </>
  )
}

/* ── ShoppingDetailSheet ────────────────────────────────────────────────────── */
export function ShoppingDetailSheet({
  list, onUpdate, onDelete, onAddItem, onToggleItem, onDeleteItem, onUpdateItem, onClose,
}: {
  list: ShoppingList
  onUpdate: (updates: Partial<ShoppingList>) => void
  onDelete: () => void
  onAddItem: (name: string, qty: number, notes?: string, price?: number) => void
  onToggleItem: (itemId: string) => void
  onDeleteItem: (itemId: string) => void
  onUpdateItem: (itemId: string, updates: Partial<ShoppingItem>) => void
  onClose: () => void
}) {
  const [itemName,  setItemName]  = useState('')
  const [itemQty,   setItemQty]   = useState('1')
  const [itemPrice, setItemPrice] = useState('')
  const photoRef = useRef<HTMLInputElement>(null)

  const itemNameRef = useRef<HTMLInputElement>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  // Receipt scanning
  const [scannerOpen,   setScannerOpen]   = useState(false)
  const [scanResult,    setScanResult]    = useState<ReceiptResult | null>(null)
  const [scanPhotos,    setScanPhotos]    = useState<string[]>([])
  const [editName,  setEditName]  = useState('')
  const [editQty,   setEditQty]   = useState('1')
  const [editPrice, setEditPrice] = useState('')
  const [editNotes, setEditNotes] = useState('')

  const [completionDialog, setCompletionDialog] = useState(false)
  const [leaveNoteMode,    setLeaveNoteMode]    = useState(false)
  const [completionNote,   setCompletionNote]   = useState(list.completionNote ?? '')
  const [showDeleteListConfirm, setShowDeleteListConfirm] = useState(false)
  const [deleteItemId, setDeleteItemId]         = useState<string | null>(null)
  const prevCompletedRef = useRef(list.isCompleted ?? false)

  useEffect(() => {
    if (list.isCompleted && !prevCompletedRef.current) {
      setCompletionDialog(true)
    }
    prevCompletedRef.current = list.isCompleted ?? false
  }, [list.isCompleted])

  const openLightbox = useLightboxStore(s => s.open)
  const checked = list.items.filter(i => i.isChecked).length
  const total   = list.items.length
  const pct     = total > 0 ? (checked / total) * 100 : 0
  const cost    = listTotal(list)
  const photos  = effectivePhotos(list)

  function handleAddItem() {
    if (!itemName.trim()) return
    onAddItem(itemName.trim(), parseInt(itemQty) || 1, undefined, parseFloat(itemPrice) || undefined)
    setItemName(''); setItemQty('1'); setItemPrice('')
    // Refocus the name input so the user can keep typing the next item
    requestAnimationFrame(() => itemNameRef.current?.focus())
  }

  function startEditItem(item: ShoppingItem) {
    setEditingItemId(item.id)
    setEditName(item.name)
    setEditQty(String(item.quantity))
    setEditPrice(item.price != null ? String(item.price) : '')
    setEditNotes(item.notes ?? '')
  }

  function saveItemEdit() {
    if (!editingItemId || !editName.trim()) return
    onUpdateItem(editingItemId, {
      name:     editName.trim(),
      quantity: parseInt(editQty) || 1,
      price:    parseFloat(editPrice) || undefined,
      notes:    editNotes.trim() || undefined,
    })
    setEditingItemId(null)
  }

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const resized = await resizeImage(file)
    const updated = [...photos, resized]
    onUpdate({ photos: updated, coverPhoto: updated[0] })
    e.target.value = ''
  }

  function saveCompletionNote() {
    onUpdate({ completionNote: completionNote.trim() || undefined })
    setCompletionDialog(false)
    setLeaveNoteMode(false)
  }

  function handleSaveReceipt(result: ReceiptResult) {
    const receipt: ShoppingListReceipt = { ...result, photos: scanPhotos.length ? scanPhotos : undefined }
    onUpdate({ receipt })
    setScanResult(null)
    setScanPhotos([])
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/20"
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 380 }}
        className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[2rem] shadow-modal
                   max-w-lg mx-auto flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 48px)' }}
      >
        <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoPick} />

        <div className="px-5 pt-4 pb-3 shrink-0">
          <div className="drag-handle mb-3" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h3 className="text-base font-bold text-gray-800 truncate">{list.name}</h3>
                {list.isCompleted && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 shrink-0">✓ Done</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                {list.storeName && <span>📍 {list.storeName}</span>}
                {list.date     && <span>🗓 {list.date}</span>}
                {cost > 0      && <span className="font-semibold text-gray-600">€{cost.toFixed(2)} total</span>}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => photoRef.current?.click()}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 active:bg-gray-200">
                <Camera size={14} />
              </button>
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 active:bg-gray-200">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 pb-3 shrink-0 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: list.isCompleted ? '#10b981' : RED }}
                animate={{ width: `${pct}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 18 }}
              />
            </div>
            <span className="text-xs font-bold shrink-0 tabular-nums"
              style={{ color: list.isCompleted ? '#10b981' : '#9ca3af' }}>
              {checked}/{total}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {list.isCompleted && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl px-4 py-3"
              style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}
            >
              <p className="text-sm font-bold text-emerald-600">🎉 Shopping completed!</p>
              {list.completedAt && (
                <p className="text-[10px] text-emerald-400 mt-0.5">
                  {new Date(list.completedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  {list.completedBy ? ` · by ${list.completedBy}` : ''}
                </p>
              )}
              {list.completionNote ? (
                <div className="mt-2 pt-2 border-t border-emerald-100">
                  <p className="text-[11px] text-emerald-700 leading-relaxed italic">"{list.completionNote}"</p>
                  <button
                    onClick={() => { setLeaveNoteMode(true); setCompletionDialog(true) }}
                    className="text-[10px] text-emerald-500 font-semibold mt-1 active:opacity-70"
                  >Edit note</button>
                </div>
              ) : (
                <button
                  onClick={() => { setLeaveNoteMode(true); setCompletionDialog(true) }}
                  className="mt-1.5 text-[10px] text-emerald-500 font-semibold active:opacity-70"
                >+ Add a note about this trip</button>
              )}
            </motion.div>
          )}

          <div className="bg-gray-50 rounded-2xl p-3">
            <div className="flex items-center gap-2">
              <input
                ref={itemNameRef}
                type="text" value={itemName} onChange={e => setItemName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem() } }}
                placeholder="Add item..."
                className="flex-1 text-sm text-gray-700 bg-white rounded-xl px-3 py-2 outline-none border border-gray-100"
              />
              <input type="number" value={itemQty} onChange={e => setItemQty(e.target.value)} min="1"
                onFocus={e => e.target.select()}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem() } }}
                className="w-10 text-xs text-center bg-white rounded-xl px-1.5 py-2 outline-none border border-gray-100" />
              <input type="number" value={itemPrice} onChange={e => setItemPrice(e.target.value)} placeholder="€"
                onFocus={e => e.target.select()}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddItem() } }}
                className="w-14 text-xs bg-white rounded-xl px-2 py-2 outline-none border border-gray-100" />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {list.items.map(item => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
              >
                {editingItemId === item.id ? (
                  <div className="bg-white rounded-2xl border-2 p-2.5 space-y-2" style={{ borderColor: RED + '40' }}>
                    <div className="flex gap-1.5">
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                        className="flex-1 text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-1.5 outline-none min-w-0" />
                      <input type="number" value={editQty} onChange={e => setEditQty(e.target.value)} min="1"
                        onFocus={e => e.target.select()}
                        className="w-12 text-xs text-center bg-gray-50 rounded-xl px-1.5 py-1.5 outline-none shrink-0" />
                      <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="€"
                        className="w-16 text-xs bg-gray-50 rounded-xl px-2 py-1.5 outline-none shrink-0" />
                    </div>
                    <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Note (optional)"
                      className="w-full text-xs text-gray-600 bg-gray-50 rounded-xl px-3 py-1.5 outline-none" />
                    <div className="flex gap-1.5">
                      <button onClick={saveItemEdit} disabled={!editName.trim()}
                        className="flex-1 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold disabled:opacity-40">
                        Save
                      </button>
                      <button onClick={() => setEditingItemId(null)}
                        className="flex-1 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold">
                        Cancel
                      </button>
                      <button onClick={() => setDeleteItemId(item.id)}
                        className="w-8 py-1.5 rounded-xl bg-red-50 text-red-400 flex items-center justify-center">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-2xl border transition-colors',
                    item.isChecked ? 'opacity-55 bg-gray-50 border-gray-100' : 'bg-white border-gray-100'
                  )}>
                    <button
                      onClick={() => onToggleItem(item.id)}
                      className={cn(
                        'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                        item.isChecked ? 'bg-emerald-400 border-emerald-400' : 'border-gray-300'
                      )}
                    >
                      {item.isChecked && <Check size={10} color="white" strokeWidth={3} />}
                    </button>
                    <button className="flex-1 min-w-0 text-left" onClick={() => startEditItem(item)}>
                      <p className={cn('text-sm font-medium leading-tight', item.isChecked ? 'line-through text-gray-400' : 'text-gray-800')}>
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {item.quantity > 1 && <span className="text-[10px] text-gray-400">×{item.quantity}</span>}
                        {item.price != null && item.price > 0 && (
                          <span className="text-[10px] text-gray-400">€{item.price.toFixed(2)}</span>
                        )}
                        {item.quantity > 1 && item.price != null && item.price > 0 && (
                          <span className="text-[10px] font-semibold text-gray-500">= €{(item.price * item.quantity).toFixed(2)}</span>
                        )}
                        {item.notes && <span className="text-[10px] text-gray-400 italic truncate">{item.notes}</span>}
                      </div>
                    </button>
                    <button onClick={() => startEditItem(item)} className="text-gray-300 active:text-blue-400 p-1 shrink-0">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => setDeleteItemId(item.id)} className="text-gray-200 active:text-red-400 p-0.5 shrink-0">
                      <X size={13} />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {list.items.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-6">No items yet — add one above</p>
          )}

          {/* ── Purchased / Receipt section ── */}
          {list.receipt ? (
            <div className="mt-2 rounded-2xl overflow-hidden border border-gray-100">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">🧾 Purchased</p>
                  {(list.receipt.store || list.receipt.date) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {list.receipt.store}{list.receipt.store && list.receipt.date ? ' · ' : ''}{list.receipt.date}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setScannerOpen(true)}
                  className="text-[10px] font-semibold text-gray-400 active:opacity-70"
                >
                  Re-scan
                </button>
              </div>

              {list.receipt.photos && list.receipt.photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-gray-100 scrollbar-hide">
                  {list.receipt.photos.map((src, i) => (
                    <img
                      key={i} src={src} alt=""
                      onClick={() => openLightbox(list.receipt!.photos!, i)}
                      className="w-16 h-20 object-cover rounded-xl shrink-0 border border-gray-100 cursor-pointer active:opacity-80"
                    />
                  ))}
                </div>
              )}

              <div className="divide-y divide-gray-50">
                {list.receipt.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{it.name}</p>
                      {it.quantity > 1 && <p className="text-[10px] text-gray-400">×{it.quantity}</p>}
                    </div>
                    <p className="text-sm font-medium text-gray-600 shrink-0 ml-3">
                      {list.receipt?.currency} {it.lineTotal.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-1">
                {list.receipt.tax > 0 && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Tax</span>
                    <span>{list.receipt.currency} {list.receipt.tax.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-gray-800">
                  <span>Total paid</span>
                  <span>{list.receipt.currency} {list.receipt.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setScannerOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-400 active:border-gray-300 active:text-gray-500 transition-colors"
            >
              <ScanLine size={16} /> Scan Receipt
            </button>
          )}

          {photos.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Photos</p>
                <button onClick={() => photoRef.current?.click()}
                  className="text-[10px] font-semibold text-gray-400 active:opacity-70 flex items-center gap-0.5">
                  <Camera size={11} /> Add
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((p, i) => (
                  <button key={i} onClick={() => openLightbox(photos, i)}
                    className="relative shrink-0 w-20 h-20 rounded-2xl overflow-hidden active:opacity-80">
                    <img src={p} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 pt-3 shrink-0 border-t border-gray-100 pb-sheet-footer">
          <button
            onClick={() => setShowDeleteListConfirm(true)}
            className="w-full py-3 rounded-2xl text-red-400 text-sm font-medium flex items-center justify-center gap-2 bg-red-50"
          >
            <Trash2 size={14} /> Delete list
          </button>
        </div>
      </motion.div>

      <DeleteConfirmSheet
        open={showDeleteListConfirm}
        title="Delete this list?"
        message="This shopping list and all its items will be permanently removed."
        onCancel={() => setShowDeleteListConfirm(false)}
        onConfirm={() => { onDelete(); setShowDeleteListConfirm(false) }}
      />
      <DeleteConfirmSheet
        open={!!deleteItemId}
        title="Remove this item?"
        message="This item will be permanently removed from the list."
        confirmLabel="Remove"
        onCancel={() => setDeleteItemId(null)}
        onConfirm={() => {
          onDeleteItem(deleteItemId!)
          if (editingItemId === deleteItemId) setEditingItemId(null)
          setDeleteItemId(null)
        }}
      />

      {/* Receipt scanner */}
      <AnimatePresence>
        {scannerOpen && (
          <ReceiptScannerSheet
            onClose={() => setScannerOpen(false)}
            onResultReady={(result, photos) => {
              setScanResult(result)
              setScanPhotos(photos)
              setScannerOpen(false)
            }}
          />
        )}
      </AnimatePresence>

      {/* Receipt review */}
      <AnimatePresence>
        {scanResult && (
          <ReceiptReviewSheet
            result={scanResult}
            photos={scanPhotos}
            onClose={() => { setScanResult(null); setScanPhotos([]) }}
            onSave={handleSaveReceipt}
          />
        )}
      </AnimatePresence>

      {/* Completion dialog */}
      <AnimatePresence>
        {completionDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setCompletionDialog(false); setLeaveNoteMode(false) }}
              className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
            />
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              className="fixed inset-0 z-[70] flex items-center justify-center p-6 pointer-events-none"
            >
              <div
                className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-modal pointer-events-auto"
                onClick={e => e.stopPropagation()}
              >
                {!leaveNoteMode ? (
                  <>
                    <div className="text-center mb-5">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: 2, duration: 0.45 }}
                        className="text-4xl mb-3"
                      >🎉</motion.div>
                      <h3 className="text-base font-bold text-gray-800 mb-1">Shopping completed!</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        Would you like to leave a note about this shopping trip?
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCompletionDialog(false)}
                        className="flex-1 py-3.5 rounded-2xl bg-gray-100 text-gray-600 text-sm font-semibold active:opacity-80"
                      >Not Now</button>
                      <button
                        onClick={() => setLeaveNoteMode(true)}
                        className="flex-1 py-3.5 rounded-2xl text-white text-sm font-semibold active:opacity-80"
                        style={{ background: RED }}
                      >Leave Note</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold text-gray-800">Trip note 🛍️</h3>
                      <button onClick={() => { setCompletionDialog(false); setLeaveNoteMode(false) }}
                        className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                        <X size={14} />
                      </button>
                    </div>
                    <textarea
                      value={completionNote}
                      onChange={e => setCompletionNote(e.target.value)}
                      placeholder="How did the trip go? Any notes for next time..."
                      rows={4}
                      autoFocus
                      className="w-full text-sm text-gray-700 placeholder:text-gray-300 bg-gray-50 rounded-2xl px-4 py-3 outline-none resize-none mb-4 leading-relaxed"
                    />
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={saveCompletionNote}
                      className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold"
                      style={{ background: RED }}
                    >Save Note</motion.button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
