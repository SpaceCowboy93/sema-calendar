'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { WISHLIST_CATEGORY_CONFIG } from '@/lib/utils'
import type { WishlistCategory, GoalCategory } from '@/types'

type QuickType = 'plan' | 'dream' | 'wish' | 'moment' | 'note' | null

const QUICK_OPTIONS: { id: QuickType; emoji: string; label: string; sub: string }[] = [
  { id: 'plan',   emoji: '✅', label: 'Plan',   sub: 'a todo or shared task' },
  { id: 'dream',  emoji: '✨', label: 'Dream',  sub: 'a goal you want to reach' },
  { id: 'wish',   emoji: '💫', label: 'Wish',   sub: 'something to do together' },
  { id: 'moment', emoji: '📅', label: 'Moment', sub: 'a date or event' },
  { id: 'note',   emoji: '💌', label: 'Note',   sub: 'a love message to send' },
]

interface Props {
  open: boolean
  onClose: () => void
  primary: string
}

export function QuickAddSheet({ open, onClose, primary }: Props) {
  const currentUser    = useAppStore(s => s.currentUser)!
  const addTodo        = useAppStore(s => s.addTodo)
  const addGoal        = useAppStore(s => s.addGoal)
  const addWishlistItem = useAppStore(s => s.addWishlistItem)
  const addEvent       = useAppStore(s => s.addEvent)
  const sendNote       = useAppStore(s => s.sendPartnerNote)

  const [type, setType]     = useState<QuickType>(null)
  const [title, setTitle]   = useState('')
  const [date, setDate]     = useState('')
  const [time, setTime]     = useState('')
  const [sent, setSent]     = useState(false)

  function reset() {
    setType(null); setTitle(''); setDate(''); setTime(''); setSent(false)
  }

  function close() { reset(); onClose() }

  function handleSubmit() {
    if (!title.trim() && type !== 'note') return
    switch (type) {
      case 'plan':
        addTodo(title.trim(), undefined, date || undefined, undefined, undefined, time || undefined)
        break
      case 'dream':
        addGoal('life', title.trim(), undefined, date || undefined, 0, time || undefined)
        break
      case 'wish':
        addWishlistItem(title.trim(), 'plan')
        break
      case 'moment':
        if (!date) return
        addEvent({ title: title.trim(), date, color: currentUser === 'seval' ? 'seval' : 'mateo', createdBy: currentUser })
        break
      case 'note':
        if (!title.trim()) return
        sendNote(title.trim())
        setSent(true)
        setTimeout(() => { close() }, 1800)
        return
    }
    close()
  }

  const canSubmit = type === 'moment' ? !!(title.trim() && date) : !!title.trim()

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
                <div className="flex items-center gap-2">
                  {type && (
                    <button onClick={() => { setType(null); setTitle(''); setDate('') }}
                      className="text-xs text-gray-400 font-medium">
                      ← back
                    </button>
                  )}
                  <h3 className="text-base font-bold text-gray-800">
                    {type ? `Add a ${type}` : 'Add something 💕'}
                  </h3>
                </div>
                <button onClick={close}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <X size={16} />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {/* ── Type picker ── */}
                {!type && (
                  <motion.div
                    key="picker"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    {QUICK_OPTIONS.map(opt => (
                      <motion.button
                        key={opt.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setType(opt.id)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50
                                   active:bg-gray-100 transition-colors text-left"
                      >
                        <span className="text-2xl">{opt.emoji}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                          <p className="text-xs text-gray-400">{opt.sub}</p>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {/* ── Mini form ── */}
                {type && (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    {sent ? (
                      <div className="flex flex-col items-center py-8 text-center">
                        <motion.div
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ repeat: 2, duration: 0.4 }}
                          className="text-5xl mb-3"
                        >💌</motion.div>
                        <p className="font-bold text-gray-800">Sent with love 💕</p>
                      </div>
                    ) : (
                      <>
                        {/* Note uses "message" label */}
                        <div className="rounded-2xl bg-gray-50 p-4">
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

                        {/* Date + time (for plan / dream / moment / wish) */}
                        {(type === 'plan' || type === 'moment' || type === 'dream' || type === 'wish') && (
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={date}
                              onChange={e => setDate(e.target.value)}
                              className="flex-1 text-sm text-gray-600 bg-gray-50 rounded-2xl px-4 py-3
                                         outline-none"
                            />
                            <input
                              type="time"
                              value={time}
                              onChange={e => setTime(e.target.value)}
                              placeholder="time"
                              className="w-32 text-sm text-gray-600 bg-gray-50 rounded-2xl px-3 py-3
                                         outline-none"
                            />
                          </div>
                        )}

                        <motion.button
                          whileTap={{ scale: 0.97 }}
                          onClick={handleSubmit}
                          disabled={!canSubmit}
                          className="w-full py-4 rounded-2xl text-white text-sm font-semibold
                                     disabled:opacity-40 flex items-center justify-center gap-2"
                          style={{ background: primary }}
                        >
                          <Plus size={16} />
                          {type === 'note' ? 'Send with love 💌' : 'Kept with love ✨'}
                        </motion.button>
                      </>
                    )}
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
