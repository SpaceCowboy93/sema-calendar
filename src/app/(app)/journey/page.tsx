'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO, differenceInCalendarDays } from 'date-fns'
import { Plus, X, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { USERS, type CalendarEvent } from '@/types'
import { getTodayString, cn } from '@/lib/utils'
import { EventModal } from '@/components/calendar/EventModal'

const EMOJI_OPTIONS = ['🎉', '✈️', '💕', '🎂', '🌟', '🎊', '🌸', '🌊', '💍', '🏖️', '🎄', '🎭']

type FeedItem =
  | { kind: 'memory'; id: string; title: string; date: string; notes?: string; createdBy: string; photos?: string[] }
  | { kind: 'lovenote'; id: string; content: string; createdAt: string; from: string; isPinned: boolean }

export default function JourneyPage() {
  const currentUser     = useAppStore(s => s.currentUser)!
  const countdowns      = useAppStore(s => s.countdowns)
  const addCountdown    = useAppStore(s => s.addCountdown)
  const deleteCountdown = useAppStore(s => s.deleteCountdown)
  const events          = useAppStore(s => s.events)
  const memories        = useAppStore(s => s.memories)
  const loveNotes       = useAppStore(s => s.loveNotes)

  const isSeval  = currentUser === 'seval'
  const primary  = isSeval ? '#8b5cf6' : '#14b8a6'
  const today    = new Date()
  const todayStr = getTodayString()

  const [addOpen, setAddOpen]         = useState(false)
  const [newTitle, setNewTitle]       = useState('')
  const [newDate, setNewDate]         = useState('')
  const [newEmoji, setNewEmoji]       = useState('🎉')
  const [editId, setEditId]           = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [modalOpen, setModalOpen]     = useState(false)

  const futureCountdowns = countdowns
    .filter(c => c.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))

  const pastCountdowns = countdowns
    .filter(c => c.date < todayStr)
    .sort((a, b) => b.date.localeCompare(a.date))

  const upcomingEvents = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + 90)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return events
      .filter(e => e.date >= todayStr && e.date <= cutoffStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 10)
  }, [events, todayStr])

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...memories.map(m => ({ kind: 'memory' as const, id: m.id, title: m.title, date: m.date, notes: m.notes, createdBy: m.createdBy, photos: m.photos })),
      ...loveNotes.map(n => ({ kind: 'lovenote' as const, id: n.id, content: n.content, createdAt: n.createdAt, from: n.from, isPinned: n.isPinned })),
    ]
    return items.sort((a, b) => {
      const da = a.kind === 'memory' ? a.date : a.createdAt.slice(0, 10)
      const db = b.kind === 'memory' ? b.date : b.createdAt.slice(0, 10)
      return db.localeCompare(da)
    })
  }, [memories, loveNotes])

  function openAdd() {
    setNewTitle(''); setNewDate(''); setNewEmoji('🎉'); setEditId(null); setAddOpen(true)
  }

  function openEdit(c: typeof countdowns[0]) {
    setNewTitle(c.title); setNewDate(c.date); setNewEmoji(c.emoji); setEditId(c.id); setAddOpen(true)
  }

  function handleSave() {
    if (!newTitle.trim() || !newDate) return
    if (editId) deleteCountdown(editId)
    addCountdown(newTitle.trim(), newDate, newEmoji)
    setAddOpen(false)
  }

  function handleDelete() {
    if (editId) deleteCountdown(editId)
    setAddOpen(false)
  }

  const isEmpty = feed.length === 0 && upcomingEvents.length === 0 && countdowns.length === 0

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div
        className="px-5 pt-14 pb-4"
        style={{ background: isSeval ? 'linear-gradient(135deg, #f5f3ff, #fafafa)' : 'linear-gradient(135deg, #f0fdfa, #fafafa)' }}
      >
        <h1 className="text-2xl font-bold text-gray-800">Our Journey</h1>
        <p className="text-sm text-gray-400">every moment, past and future</p>
      </div>

      <div className="px-5 space-y-6 pt-4">

        {/* ── Countdowns ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Countdowns</p>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={openAdd}
              className="flex items-center gap-1 text-xs font-semibold rounded-full px-3 py-1.5 text-white"
              style={{ background: primary }}
            >
              <Plus size={12} strokeWidth={2.5} /> Add
            </motion.button>
          </div>

          {countdowns.length === 0 ? (
            <button
              onClick={openAdd}
              className="w-full rounded-2xl border-2 border-dashed border-gray-200 py-8 text-center"
            >
              <span className="text-3xl block mb-2">⏳</span>
              <p className="text-sm text-gray-400">Add your first countdown</p>
            </button>
          ) : (
            <div className="space-y-2">
              {futureCountdowns.map(c => {
                const days = differenceInCalendarDays(parseISO(c.date), today)
                return (
                  <motion.button
                    key={c.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openEdit(c)}
                    className="w-full bg-white rounded-2xl shadow-card px-4 py-3.5 flex items-center gap-3 text-left"
                  >
                    <span className="text-2xl shrink-0">{c.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{c.title}</p>
                      <p className="text-xs text-gray-400">{format(parseISO(c.date), 'MMM d, yyyy')}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold" style={{ color: primary }}>{days === 0 ? 'Today!' : days}</p>
                      {days > 0 && <p className="text-[10px] text-gray-400">days left</p>}
                    </div>
                  </motion.button>
                )
              })}

              {pastCountdowns.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wider pt-1 px-1">
                    Anniversaries
                  </p>
                  {pastCountdowns.map(c => {
                    const days   = differenceInCalendarDays(today, parseISO(c.date))
                    const years  = Math.floor(days / 365)
                    const months = Math.floor(days / 30)
                    const label  = years >= 1
                      ? `${years} year${years > 1 ? 's' : ''} together`
                      : months >= 1
                      ? `${months} month${months > 1 ? 's' : ''} together`
                      : `${days} day${days !== 1 ? 's' : ''} together`
                    return (
                      <motion.button
                        key={c.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => openEdit(c)}
                        className="w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left"
                        style={{ background: `${primary}0d`, border: `1.5px solid ${primary}25` }}
                      >
                        <span className="text-2xl shrink-0">{c.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm truncate">{c.title}</p>
                          <p className="text-xs font-medium" style={{ color: primary }}>{label} 💕</p>
                        </div>
                        <span className="text-gray-300 text-lg">›</span>
                      </motion.button>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Upcoming events ── */}
        {upcomingEvents.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Coming up</p>
            <div className="space-y-2">
              {upcomingEvents.map(ev => {
                const days = differenceInCalendarDays(parseISO(ev.date), today)
                return (
                  <motion.button
                    key={ev.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setEditingEvent(ev); setModalOpen(true) }}
                    className="w-full bg-white rounded-2xl shadow-card px-4 py-3 flex items-center gap-3 text-left active:opacity-90 transition-opacity"
                  >
                    <div className="shrink-0 text-center w-10">
                      {days === 0
                        ? <span className="text-xl">🎉</span>
                        : <>
                            <p className="text-base font-bold text-gray-700">{days}</p>
                            <p className="text-[9px] text-gray-400">days</p>
                          </>
                      }
                    </div>
                    <div className="w-px h-8 bg-gray-100 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{ev.title}</p>
                      <p className="text-xs text-gray-400">{format(parseISO(ev.date), 'EEE, MMM d')}</p>
                    </div>
                    <span className="text-gray-300 shrink-0">›</span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Memories feed ── */}
        {feed.length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Memories</p>
            <div className="space-y-4">
              {feed.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  {item.kind === 'memory'
                    ? <MemoryCard item={item} />
                    : <LoveNoteCard item={item} />
                  }
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {isEmpty && (
          <div className="text-center pt-12">
            <div className="text-5xl mb-3">🌱</div>
            <p className="font-semibold text-gray-500 mb-1">Your journey starts here</p>
            <p className="text-sm text-gray-400">Add a countdown or create memories together</p>
          </div>
        )}
      </div>

      {/* ── Event modal (Coming up) ── */}
      <EventModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEvent(null) }}
        date={editingEvent?.date ?? todayStr}
        event={editingEvent}
      />

      {/* ── Add / Edit countdown sheet ── */}
      <AnimatePresence>
        {addOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setAddOpen(false)}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 380 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-modal max-w-lg mx-auto"
            >
              <div className="px-5 pt-4 pb-10">
                <div className="drag-handle mb-4" />
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-800">
                    {editId ? 'Edit Countdown' : 'New Countdown'}
                  </h3>
                  <button
                    onClick={() => setAddOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Emoji picker */}
                <div className="flex gap-2 flex-wrap mb-4">
                  {EMOJI_OPTIONS.map(e => (
                    <button
                      key={e}
                      onClick={() => setNewEmoji(e)}
                      className={cn(
                        'text-2xl w-11 h-11 rounded-2xl flex items-center justify-center transition-all',
                        newEmoji === e ? 'bg-gray-200 scale-110' : 'bg-gray-50'
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 mb-5">
                  <div className="bg-gray-50 rounded-2xl px-4 py-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Title</p>
                    <input
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="e.g. Our trip to Paris"
                      className="w-full text-sm text-gray-800 bg-transparent outline-none"
                    />
                  </div>
                  <div className="bg-gray-50 rounded-2xl px-4 py-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date</p>
                    <input
                      type="date"
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      className="w-full text-sm text-gray-700 bg-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  {editId && (
                    <button
                      onClick={handleDelete}
                      className="w-12 h-12 flex items-center justify-center rounded-2xl bg-red-50 text-red-400 shrink-0 active:opacity-80"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSave}
                    disabled={!newTitle.trim() || !newDate}
                    className="flex-1 py-3.5 rounded-2xl text-white text-sm font-semibold disabled:opacity-40"
                    style={{ background: primary }}
                  >
                    {editId ? 'Save Changes' : 'Add Countdown'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function MemoryCard({ item }: { item: Extract<FeedItem, { kind: 'memory' }> }) {
  const user = USERS[item.createdBy as keyof typeof USERS]
  return (
    <div className="bg-white rounded-3xl shadow-card overflow-hidden">
      {item.photos && item.photos.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto p-3 pb-0 scrollbar-hide">
          {item.photos.map((src, i) => (
            <img key={i} src={src} alt="" className="w-28 h-28 object-cover rounded-2xl shrink-0" />
          ))}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[10px] font-bold text-gray-400">
            {format(parseISO(item.date + 'T12:00:00'), 'MMM d, yyyy')}
          </span>
          <span className="text-gray-200">·</span>
          <span className="text-[10px] text-gray-400">{user?.emoji} {user?.displayName}</span>
        </div>
        <p className="font-semibold text-gray-800 text-sm mb-1">{item.title}</p>
        {item.notes && <p className="text-xs text-gray-500 leading-relaxed line-clamp-4">{item.notes}</p>}
      </div>
    </div>
  )
}

function LoveNoteCard({ item }: { item: Extract<FeedItem, { kind: 'lovenote' }> }) {
  const fromUser  = USERS[item.from as keyof typeof USERS]
  const fromColor = item.from === 'seval' ? '#8b5cf6' : '#14b8a6'
  return (
    <div className="rounded-3xl p-5" style={{ background: `${fromColor}0d`, border: `1.5px solid ${fromColor}20` }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">💌</span>
        <div className="flex-1">
          <p className="text-xs font-bold" style={{ color: fromColor }}>{fromUser?.emoji} {fromUser?.displayName}</p>
          <p className="text-[10px] text-gray-400">{format(parseISO(item.createdAt), 'MMM d, yyyy')}</p>
        </div>
        {item.isPinned && <span className="text-xs">📌</span>}
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{item.content}</p>
    </div>
  )
}
