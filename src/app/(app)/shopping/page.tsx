'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Check, Trash2, ShoppingBag, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { USERS } from '@/types'
import type { ShoppingCategory } from '@/types'
import { cn } from '@/lib/utils'

const CATEGORY_CONFIG: Record<ShoppingCategory, { emoji: string; label: string }> = {
  produce:   { emoji: '🥬', label: 'Produce' },
  dairy:     { emoji: '🧀', label: 'Dairy' },
  meat:      { emoji: '🥩', label: 'Meat' },
  bakery:    { emoji: '🥖', label: 'Bakery' },
  household: { emoji: '🧹', label: 'Household' },
  other:     { emoji: '📦', label: 'Other' },
}

export default function ShoppingPage() {
  const currentUser     = useAppStore(s => s.currentUser)!
  const lists           = useAppStore(s => s.shoppingLists)
  const createList      = useAppStore(s => s.createShoppingList)
  const deleteList      = useAppStore(s => s.deleteShoppingList)
  const addItem         = useAppStore(s => s.addShoppingItem)
  const toggleItem      = useAppStore(s => s.toggleShoppingItem)
  const deleteItem      = useAppStore(s => s.deleteShoppingItem)

  const isSeval  = currentUser === 'seval'
  const primary  = isSeval ? '#8b5cf6' : '#14b8a6'

  const [openListId, setOpenListId]   = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')
  const [showCreate, setShowCreate]   = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQty, setNewItemQty]   = useState('1')
  const [newItemCat, setNewItemCat]   = useState<ShoppingCategory>('other')

  function handleCreateList() {
    if (!newListName.trim()) return
    createList(newListName.trim())
    setNewListName('')
    setShowCreate(false)
  }

  function handleAddItem(listId: string) {
    if (!newItemName.trim()) return
    addItem(listId, newItemName.trim(), parseInt(newItemQty) || 1, newItemCat)
    setNewItemName('')
    setNewItemQty('1')
    setNewItemCat('other')
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-14 pb-32">
      <div
        className="px-5 pb-4"
        style={{ background: isSeval ? 'linear-gradient(135deg, #f5f3ff, #fafafa)' : 'linear-gradient(135deg, #f0fdfa, #fafafa)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Shopping</h1>
            <p className="text-sm text-gray-400">what you need to get</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-white text-sm font-semibold"
            style={{ background: primary }}
          >
            <Plus size={15} strokeWidth={2.5} /> New list
          </motion.button>
        </div>
      </div>

      {/* Create list modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCreate(false)}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 380 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-modal max-w-lg mx-auto"
            >
              <div className="px-5 pt-4 pb-10">
                <div className="drag-handle mb-4" />
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-gray-800">New shopping list</h3>
                  <button onClick={() => setShowCreate(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <X size={16} />
                  </button>
                </div>
                <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-5">
                  <input
                    type="text"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    placeholder="e.g. Weekly groceries"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleCreateList()}
                    className="w-full text-sm text-gray-800 bg-transparent outline-none"
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleCreateList}
                  disabled={!newListName.trim()}
                  className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold disabled:opacity-40"
                  style={{ background: primary }}
                >
                  Create list
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="px-5 pt-4 space-y-3">
        {lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            <div className="text-5xl mb-4">🛒</div>
            <p className="font-semibold text-gray-600 mb-1">No shopping lists yet</p>
            <p className="text-sm text-gray-400">Create one to track what you need</p>
          </div>
        ) : (
          lists.map(list => {
            const checked = list.items.filter(i => i.isChecked).length
            const total   = list.items.length
            const allDone = total > 0 && checked === total
            const isOpen  = openListId === list.id

            return (
              <motion.div
                key={list.id}
                layout
                className="bg-white rounded-3xl shadow-card overflow-hidden"
              >
                {/* Header */}
                <div
                  className="px-4 py-3.5 flex items-center gap-3 cursor-pointer"
                  onClick={() => setOpenListId(isOpen ? null : list.id)}
                >
                  <ShoppingBag size={18} className="text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{list.name}</p>
                    <p className="text-xs text-gray-400">
                      {checked}/{total} items{allDone && total > 0 ? ' · all done!' : ''}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteList(list.id) }}
                    className="text-gray-300 active:text-red-400 p-1 shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={18} className="text-gray-400 shrink-0" />
                  </motion.div>
                </div>

                {/* Items */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-2">
                        {/* Add item row */}
                        <div className="bg-gray-50 rounded-2xl px-3 py-2.5 flex items-center gap-2">
                          <input
                            type="text"
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                            placeholder="Add item..."
                            onKeyDown={e => e.key === 'Enter' && handleAddItem(list.id)}
                            className="flex-1 text-sm text-gray-700 bg-transparent outline-none min-w-0"
                          />
                          <input
                            type="number"
                            value={newItemQty}
                            onChange={e => setNewItemQty(e.target.value)}
                            min="1"
                            className="w-10 text-sm text-gray-600 bg-white rounded-xl px-2 py-1 outline-none border border-gray-200 text-center shrink-0"
                          />
                          <select
                            value={newItemCat}
                            onChange={e => setNewItemCat(e.target.value as ShoppingCategory)}
                            className="text-xs text-gray-600 bg-white rounded-xl px-2 py-1 outline-none border border-gray-200 shrink-0"
                          >
                            {(Object.entries(CATEGORY_CONFIG) as [ShoppingCategory, { emoji: string; label: string }][]).map(([id, cfg]) => (
                              <option key={id} value={id}>{cfg.emoji} {cfg.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAddItem(list.id)}
                            disabled={!newItemName.trim()}
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 disabled:opacity-40"
                            style={{ background: primary }}
                          >
                            <Plus size={15} />
                          </button>
                        </div>

                        {/* Items list */}
                        {list.items.length === 0 ? (
                          <p className="text-center text-xs text-gray-400 py-3">No items yet</p>
                        ) : (
                          list.items.map(item => (
                            <motion.div
                              key={item.id}
                              layout
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-2xl border transition-all',
                                item.isChecked ? 'opacity-50 bg-gray-50 border-gray-100' : 'bg-white border-gray-100'
                              )}
                            >
                              <button
                                onClick={() => toggleItem(list.id, item.id)}
                                className={cn(
                                  'w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                                  item.isChecked ? 'border-emerald-400 bg-emerald-400' : 'border-gray-300'
                                )}
                              >
                                {item.isChecked && <Check size={12} color="white" strokeWidth={3} />}
                              </button>
                              <span className="text-base shrink-0">{CATEGORY_CONFIG[item.category].emoji}</span>
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-sm font-medium', item.isChecked ? 'line-through text-gray-400' : 'text-gray-800')}>
                                  {item.name}
                                </p>
                                {item.quantity > 1 && (
                                  <p className="text-[10px] text-gray-400">×{item.quantity}</p>
                                )}
                                {item.isChecked && item.checkedBy && (
                                  <p className="text-[10px] text-emerald-500">
                                    by {USERS[item.checkedBy].emoji} {USERS[item.checkedBy].displayName}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => deleteItem(list.id, item.id)}
                                className="text-gray-300 active:text-red-400 p-1 shrink-0"
                              >
                                <X size={14} />
                              </button>
                            </motion.div>
                          ))
                        )}

                        {allDone && total > 0 && (
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center py-3 bg-emerald-50 rounded-2xl border border-emerald-100"
                          >
                            <p className="text-sm font-bold text-emerald-600">All done! Great job!</p>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
