'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { WishlistCategory, GoalCategory, EventColor } from '@/types'

type QuickType = 'plan' | 'dream' | 'wish' | 'moment' | 'note'

const TYPES: { id: QuickType; emoji: string; label: string }[] = [
  { id: 'plan',   emoji: '✅', label: 'Plan'   },
  { id: 'dream',  emoji: '✨', label: 'Dream'  },
  { id: 'wish',   emoji: '💫', label: 'Wish'   },
  { id: 'moment', emoji: '📅', label: 'Moment' },
  { id: 'note',   emoji: '💌', label: 'Note'   },
]


interface Props {
  open: boolean
  onClose: () => void
  primary: string
}

export function QuickAddSheet({ open, onClose, primary }: Props) {
  const currentUser     = useAppStore(s => s.currentUser)!
  const addTodo         = useAppStore(s => s.addTodo)
  const addGoal         = useAppStore(s => s.addGoal)
  const addWishlistItem = useAppStore(s => s.addWishlistItem)
  const addEvent        = useAppStore(s => s.addEvent)
  const sendNote        = useAppStore(s => s.sendPartnerNote)

  const [type, setType]   = useState<QuickType>('plan')
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate]   = useState('')
  const [time, setTime]   = useState('')
  const [color, setColor] = useState<EventColor>(currentUser === 'mateo' ? 'mateo' : 'seval')
  const [sent, setSent]   = useState(false)

  function reset() {
    setTitle(''); setNotes(''); setDate(''); setTime(''); setSent(false)
    setColor(currentUser === 'mateo' ? 'mateo' : 'seval')
  }

  function close() { reset(); onClose() }

  function handleSubmit() {
    switch (type) {
      case 'plan':
        if (!title.trim()) return
        addTodo(title.trim(), undefined, date || undefined, undefined, notes.trim() || undefined, time || undefined)
        break
      case 'dream':
        if (!title.trim()) return
        addGoal('life', title.trim(), notes.trim() || undefined, date || undefined, 0, time || undefined)
        break
      case 'wish':
        if (!title.trim()) return
        addWishlistItem(title.trim(), 'plan', notes.trim() || undefined)
        break
      case 'moment':
        if (!title.trim() || !date) return
        addEvent({ title: title.trim(), date, startTime: time || undefined, notes: notes.trim() || undefined, color, createdBy: currentUser })
        break
      case 'note':
        if (!title.trim()) return
        sendNote(title.trim())
        setSent(true)
        setTimeout(() => close(), 1800)
        return
    }
    close()
  }

  const canSubmit = type === 'moment' ? !!(title.trim() && date) : !!title.trim()
  const showDatetime = type === 'plan' || type === 'dream' || type === 'moment'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 380 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-modal
                       max-w-lg mx-auto"
          >
            <div className="px-5 pt-4 pb-10">
              <div className="drag-handle" />

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-gray-800">Add something 💕</h3>
                <button onClick={close}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <X size={16} />
                </button>
              </div>

              {/* Type chips — always visible */}
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1 -mx-1 px-1">
                {TYPES.map(t => (
                  <motion.button
                    key={t.id}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => { setType(t.id); setTitle(''); setNotes('') }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold shrink-0 transition-all"
                    style={type === t.id
                      ? { background: primary, color: 'white' }
                      : { background: '#f3f4f6', color: '#6b7280' }
                    }
                  >
                    {t.emoji} {t.label}
                  </motion.button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {sent ? (
                  <motion.div
                    key="sent"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center py-8 text-center"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: 2, duration: 0.4 }}
                      className="text-5xl mb-3"
                    >💌</motion.div>
                    <p className="font-bold text-gray-800">Sent with love 💕</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={type}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3"
                  >
                    {/* Main title / message input */}
                    <div className="bg-gray-50 rounded-2xl p-4">
                      {type === 'note' ? (
                        <textarea
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          placeholder="Write something from the heart..."
                          rows={4}
                          autoFocus
                          className="w-full text-sm text-gray-700 placeholder:text-gray-300
                                     bg-transparent outline-none resize-none leading-relaxed"
                        />
                      ) : (
                        <input
                          type="text"
                          value={title}
                          onChange={e => setTitle(e.target.value)}
                          placeholder={
                            type === 'plan'   ? 'What do you want to plan?' :
                            type === 'dream'  ? 'What do you dream of?' :
                            type === 'wish'   ? 'What do you wish for?' :
                            'Name this moment...'
                          }
                          autoFocus
                          className="w-full text-sm text-gray-700 placeholder:text-gray-300
                                     bg-transparent outline-none"
                        />
                      )}
                    </div>

                    {/* Notes field (all types except note) */}
                    {type !== 'note' && (
                      <div className="bg-gray-50 rounded-2xl px-4 py-3">
                        <textarea
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          placeholder="Notes (optional)..."
                          rows={2}
                          className="w-full text-sm text-gray-500 placeholder:text-gray-300
                                     bg-transparent outline-none resize-none"
                        />
                      </div>
                    )}

                    {/* Date + time */}
                    {showDatetime && (
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={date}
                          onChange={e => setDate(e.target.value)}
                          className="flex-1 text-sm text-gray-600 bg-gray-50 rounded-2xl px-4 py-3 outline-none"
                        />
                        <input
                          type="time"
                          value={time}
                          onChange={e => setTime(e.target.value)}
                          className="w-28 text-sm text-gray-600 bg-gray-50 rounded-2xl px-3 py-3 outline-none"
                        />
                      </div>
                    )}

                    {/* Submit */}
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleSubmit}
                      disabled={!canSubmit}
                      className="w-full py-4 rounded-2xl text-white text-sm font-semibold
                                 disabled:opacity-40 flex items-center justify-center gap-2"
                      style={{ background: primary }}
                    >
                      <Plus size={16} />
                      {type === 'note' ? 'Send with love 💌' : 'Save 💕'}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
