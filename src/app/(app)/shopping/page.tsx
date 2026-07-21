'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, Trash2, ShoppingBag, ChevronDown, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { USERS } from '@/types'
import { cn } from '@/lib/utils'
import { useSyncStatus, triggerPull } from '@/hooks/useSupabaseSync'
import { ShoppingListEditorSheet, effectivePhotos } from '@/components/ui/ShoppingListEditorSheet'
import { useLightboxStore } from '@/store/useLightboxStore'
import DeleteConfirmSheet from '@/components/ui/DeleteConfirmSheet'

export default function ShoppingPage() {
  const currentUser     = useAppStore(s => s.currentUser)!
  const lists           = useAppStore(s => s.shoppingLists)
  const deleteList      = useAppStore(s => s.deleteShoppingList)
  const toggleItem      = useAppStore(s => s.toggleShoppingItem)

  const isSeval  = currentUser === 'seval'
  const primary  = isSeval ? '#8b5cf6' : '#14b8a6'
  const { status: syncStatus } = useSyncStatus()

  const [openListId, setOpenListId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editListId, setEditListId] = useState<string | null>(null)
  const [deleteListId, setDeleteListId] = useState<string | null>(null)
  const openLightbox = useLightboxStore(s => s.open)

  const editList = editListId ? lists.find(l => l.id === editListId) ?? null : null

  return (
    <div className="min-h-screen bg-gray-50 pt-14 pb-32">
      <div
        className="px-5 pb-4"
        style={{ background: isSeval ? 'linear-gradient(135deg, #f5f3ff, #fafafa)' : 'linear-gradient(135deg, #f0fdfa, #fafafa)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Shopping</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={cn('w-2 h-2 rounded-full', {
                'bg-emerald-400': syncStatus === 'ok',
                'bg-yellow-400 animate-pulse': syncStatus === 'syncing',
                'bg-red-400': syncStatus === 'error',
                'bg-gray-300': syncStatus === 'idle',
              })} />
              <p className="text-xs text-gray-400">
                {syncStatus === 'ok' ? 'synced' : syncStatus === 'syncing' ? 'syncing…' : syncStatus === 'error' ? 'sync error' : 'connecting'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => triggerPull()}
              className="w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center"
            >
              <RefreshCw size={16} className={cn('text-gray-400', syncStatus === 'syncing' && 'animate-spin')} />
            </motion.button>
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
      </div>

      {/* Create list sheet */}
      <AnimatePresence>
        {showCreate && (
          <ShoppingListEditorSheet
            mode="create"
            onSave={(id) => { setShowCreate(false); setOpenListId(id) }}
            onClose={() => setShowCreate(false)}
          />
        )}
      </AnimatePresence>

      {/* Edit list sheet */}
      <AnimatePresence>
        {editList && (
          <ShoppingListEditorSheet
            mode="edit"
            list={editList}
            onSave={() => setEditListId(null)}
            onClose={() => setEditListId(null)}
          />
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
            const checkedCount = list.items.filter(i => i.isChecked).length
            const total        = list.items.length
            const allDone      = total > 0 && checkedCount === total
            const isOpen       = openListId === list.id
            const cover        = effectivePhotos(list)[0]

            return (
              <motion.div
                key={list.id}
                layout
                className="bg-white rounded-3xl shadow-card overflow-hidden"
              >
                {/* Cover photo */}
                {cover && (
                  <div
                    className="w-full h-24 overflow-hidden cursor-pointer"
                    onClick={() => openLightbox(effectivePhotos(list))}
                  >
                    <img src={cover} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Header */}
                <div
                  className="px-4 py-3.5 flex items-center gap-3 cursor-pointer"
                  onClick={() => setOpenListId(isOpen ? null : list.id)}
                >
                  <ShoppingBag size={18} className="text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{list.name}</p>
                    <p className="text-xs text-gray-400">
                      {checkedCount}/{total} items{allDone && total > 0 ? ' · all done!' : ''}
                      {list.storeName ? ` · ${list.storeName}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setEditListId(list.id) }}
                    className="text-gray-300 active:text-blue-400 p-1 shrink-0 text-xs font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteListId(list.id) }}
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
                        {/* Items list */}
                        {list.items.length === 0 ? (
                          <p className="text-center text-xs text-gray-400 py-3">No items — tap Edit to add</p>
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
                              {item.photo && (
                                <button onClick={e => { e.stopPropagation(); openLightbox([item.photo!]) }} className="shrink-0">
                                  <img
                                    src={item.photo}
                                    alt=""
                                    className={cn('w-10 h-10 rounded-xl object-cover', item.isChecked && 'opacity-50')}
                                  />
                                </button>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-sm font-medium', item.isChecked ? 'line-through text-gray-400' : 'text-gray-800')}>
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
                                  {item.notes && <span className="text-[10px] text-gray-400 italic">{item.notes}</span>}
                                </div>
                                {item.isChecked && item.checkedBy && (
                                  <p className="text-[10px] text-emerald-500 mt-0.5">
                                    by {USERS[item.checkedBy].emoji} {USERS[item.checkedBy].displayName}
                                  </p>
                                )}
                              </div>
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

                        <button
                          onClick={() => setEditListId(list.id)}
                          className="w-full py-2 rounded-2xl text-xs font-semibold text-gray-400 bg-gray-50 active:bg-gray-100"
                        >
                          + Add or edit items
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })
        )}
      </div>

      <DeleteConfirmSheet
        open={!!deleteListId}
        title="Delete this list?"
        message="This shopping list and all its items will be permanently removed."
        onCancel={() => setDeleteListId(null)}
        onConfirm={() => { deleteList(deleteListId!); setDeleteListId(null) }}
      />
    </div>
  )
}
