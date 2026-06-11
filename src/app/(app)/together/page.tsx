'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isSameMonth, isToday, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Clock, Plus, X, Send } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { USERS, OTHER_USER, type UserName, type MoodType, type CalendarEvent } from '@/types'
import { EventModal } from '@/components/calendar/EventModal'
import {
  MOOD_CONFIG, getCalendarDays, toDateString, formatTime,
  getTodayString, cn, EVENT_COLOR_CLASS,
} from '@/lib/utils'

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MOOD_TYPES = Object.entries(MOOD_CONFIG) as [MoodType, { emoji: string; label: string }][]

export default function TogetherPage() {
  const currentUser    = useAppStore(s => s.currentUser)!
  const events         = useAppStore(s => s.events)
  const getMood        = useAppStore(s => s.getMoodForUser)
  const setMood        = useAppStore(s => s.setMood)
  const partnerNotes   = useAppStore(s => s.partnerNotes)
  const markRead       = useAppStore(s => s.markPartnerNoteRead)
  const sendNote       = useAppStore(s => s.sendPartnerNote)

  const partnerUser = OTHER_USER[currentUser]
  const isSeval     = currentUser === 'seval'
  const primary     = isSeval ? '#8b5cf6' : '#14b8a6'
  const lightBg     = isSeval ? 'bg-seval-50' : 'bg-mateo-50'

  // Calendar state
  const [viewDate, setViewDate]         = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [modalOpen, setModalOpen]       = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  // Mood / note sheets
  const [moodOpen, setMoodOpen]       = useState(false)
  const [pendingMood, setPending]     = useState<MoodType | null>(null)
  const [moodMsg, setMoodMsg]         = useState('')
  const [noteOpen, setNoteOpen]       = useState(false)
  const [noteText, setNoteText]       = useState('')
  const [noteSent, setNoteSent]       = useState(false)
  const [readingNote, setReadingNote] = useState(false)

  const unreadNote = partnerNotes.find(n => n.to === currentUser && !n.isRead) ?? null

  const calendarDays = useMemo(
    () => getCalendarDays(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate]
  )

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    events.forEach(e => {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    })
    return map
  }, [events])

  const selectedEvents = eventsByDate[selectedDate] ?? []

  function saveMood() {
    if (!pendingMood) return
    setMood(pendingMood, moodMsg.trim() || undefined)
    setMoodOpen(false); setPending(null); setMoodMsg('')
  }

  function handleSendNote() {
    if (!noteText.trim()) return
    sendNote(noteText.trim())
    setNoteText(''); setNoteSent(true)
    setTimeout(() => { setNoteSent(false); setNoteOpen(false) }, 1800)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="px-5 pt-14 pb-3"
        style={{
          background: isSeval
            ? 'linear-gradient(135deg, #f5f3ff, #fafafa)'
            : 'linear-gradient(135deg, #f0fdfa, #fafafa)',
        }}
      >
        {/* Mood chips strip */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {([currentUser, partnerUser] as UserName[]).map(uid => {
            const mood  = getMood(uid)
            const color = uid === 'seval' ? '#8b5cf6' : '#14b8a6'
            const isMe  = uid === currentUser
            return (
              <motion.button
                key={uid}
                whileTap={{ scale: 0.95 }}
                onClick={() => isMe && setMoodOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: `${color}15`, color }}
              >
                <span>{USERS[uid].emoji}</span>
                {mood
                  ? <>{MOOD_CONFIG[mood.mood].emoji} {MOOD_CONFIG[mood.mood].label}</>
                  : <>{isMe ? 'Set mood' : 'No mood'}</>
                }
              </motion.button>
            )
          })}
        </div>

        {/* Unread partner note banner */}
        <AnimatePresence>
          {unreadNote && !readingNote && (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onClick={() => setReadingNote(true)}
              className="w-full rounded-2xl px-4 py-3 mb-3 text-left"
              style={{ background: `${primary}12`, border: `1.5px solid ${primary}30` }}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-base">💌</span>
                <p className="text-xs font-bold" style={{ color: primary }}>
                  Note from {USERS[partnerUser].displayName}
                </p>
              </div>
              <p className="text-xs text-gray-600 line-clamp-1">{unreadNote.content}</p>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{format(viewDate, 'MMMM')}</h1>
            <p className="text-xs text-gray-400">{format(viewDate, 'yyyy')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNoteOpen(true)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: `${primary}15`, color: primary }}
            >
              💌 Note
            </button>
            <button
              onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center active:scale-90 transition-transform"
            >
              <ChevronLeft size={18} className="text-gray-500" />
            </button>
            <button
              onClick={() => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
              className="w-9 h-9 rounded-full bg-white shadow-card flex items-center justify-center active:scale-90 transition-transform"
            >
              <ChevronRight size={18} className="text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mt-2 mb-1">
          {DOW_LABELS.map((d, i) => (
            <div key={i} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1 mb-5">
          {calendarDays.map((day, i) => {
            const dateStr        = toDateString(day)
            const isCurrentMonth = isSameMonth(day, viewDate)
            const isSelected     = dateStr === selectedDate
            const isTodayDate    = isToday(day)
            const dayEvents      = eventsByDate[dateStr] ?? []

            return (
              <motion.button
                key={i}
                whileTap={{ scale: 0.88 }}
                onClick={() => setSelectedDate(dateStr)}
                className="calendar-day flex-col relative"
              >
                <div
                  className={cn(
                    'absolute inset-1 rounded-full transition-all',
                    isSelected && !isTodayDate && 'opacity-15',
                    isSelected ? (isSeval ? 'bg-seval-400' : 'bg-mateo-400') : '',
                  )}
                />
                {isTodayDate && (
                  <div
                    className={cn('absolute inset-1 rounded-full', isSelected ? 'opacity-100' : 'opacity-20')}
                    style={{ background: primary }}
                  />
                )}
                <span
                  className={cn(
                    'relative z-10 text-sm font-medium transition-colors',
                    !isCurrentMonth && 'text-gray-300',
                    isCurrentMonth && !isSelected && !isTodayDate && 'text-gray-700',
                    isTodayDate && !isSelected && (isSeval ? 'text-seval-600' : 'text-mateo-600'),
                    isSelected && isTodayDate && 'text-white font-bold',
                    isSelected && !isTodayDate && (isSeval ? 'text-seval-700' : 'text-mateo-700'),
                  )}
                >
                  {day.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <div className="relative z-10 flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map(ev => (
                      <div key={ev.id} className={cn('w-1.5 h-1.5 rounded-full', EVENT_COLOR_CLASS[ev.color])} />
                    ))}
                  </div>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Selected date events */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-700">
              {selectedDate === getTodayString()
                ? 'Today'
                : format(parseISO(selectedDate), 'EEEE, MMM d')}
            </h2>
            <button
              onClick={() => { setEditingEvent(null); setModalOpen(true) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white
                         active:scale-95 transition-transform shadow-sm"
              style={{ background: primary }}
            >
              <Plus size={14} strokeWidth={2.5} /> Add
            </button>
          </div>

          <AnimatePresence mode="popLayout">
            {selectedEvents.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn('rounded-2xl py-5 px-4 text-center', lightBg)}
              >
                <p className="text-xs text-gray-400">A quiet day 🌙</p>
              </motion.div>
            ) : (
              selectedEvents.map(ev => (
                <motion.button
                  key={ev.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => { setEditingEvent(ev); setModalOpen(true) }}
                  className="w-full text-left bg-white rounded-2xl p-4 mb-2 shadow-card flex gap-3
                             active:scale-[0.98] transition-transform"
                >
                  <div className={cn('w-1 rounded-full shrink-0 self-stretch', EVENT_COLOR_CLASS[ev.color])} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{ev.title}</p>
                    {ev.startTime && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock size={11} className="text-gray-400" />
                        <p className="text-xs text-gray-400">{formatTime(ev.startTime)}</p>
                      </div>
                    )}
                    {ev.notes && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{ev.notes}</p>
                    )}
                    {ev.photos && ev.photos.length > 0 && (
                      <p className="text-xs text-gray-300 mt-1">📸 {ev.photos.length} photo{ev.photos.length !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                  <div className="shrink-0 self-center">
                    <div
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        background: ev.createdBy === 'seval' ? '#ede9fe' : '#ccfbf1',
                        color: ev.createdBy === 'seval' ? '#7c3aed' : '#0d9488',
                      }}
                    >
                      {USERS[ev.createdBy].displayName}
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* EventModal */}
      <EventModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEvent(null) }}
        date={selectedDate}
        event={editingEvent}
      />

      {/* ── Mood picker sheet ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {moodOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMoodOpen(false)}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-modal max-w-lg mx-auto"
            >
              <div className="px-5 pt-4 pb-10">
                <div className="drag-handle" />
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-base font-bold text-gray-800">How are you feeling?</h3>
                  <button
                    onClick={() => setMoodOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="flex justify-around mb-6">
                  {MOOD_TYPES.map(([type, cfg]) => (
                    <motion.button
                      key={type}
                      whileTap={{ scale: 0.88 }}
                      onClick={() => setPending(type)}
                      className="flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl transition-all"
                      style={pendingMood === type ? { background: `${primary}18` } : {}}
                    >
                      <span className="text-3xl">{cfg.emoji}</span>
                      <span className="text-[10px] font-semibold"
                        style={{ color: pendingMood === type ? primary : '#9ca3af' }}>
                        {cfg.label}
                      </span>
                    </motion.button>
                  ))}
                </div>
                <div className={cn('rounded-2xl p-4 mb-5', lightBg)}>
                  <textarea
                    value={moodMsg}
                    onChange={e => setMoodMsg(e.target.value)}
                    placeholder={`Tell ${USERS[partnerUser].displayName} how you're feeling...`}
                    rows={3}
                    className="w-full text-sm text-gray-700 placeholder:text-gray-300 bg-transparent outline-none resize-none"
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={saveMood}
                  disabled={!pendingMood}
                  className="w-full py-4 rounded-2xl text-white text-sm font-semibold disabled:opacity-40"
                  style={{ background: primary }}
                >
                  {pendingMood ? `${MOOD_CONFIG[pendingMood].emoji} Share this feeling` : 'Pick a mood first'}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Note compose sheet ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {noteOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (!noteSent) { setNoteOpen(false); setNoteText('') } }}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-modal max-w-lg mx-auto"
            >
              <div className="px-5 pt-4 pb-10">
                <div className="drag-handle" />
                <AnimatePresence mode="wait">
                  {noteSent ? (
                    <motion.div
                      key="sent"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-10 text-center"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: 2, duration: 0.4 }}
                        className="text-5xl mb-4"
                      >💌</motion.div>
                      <p className="font-bold text-gray-800 mb-1">Sent with love 💕</p>
                      <p className="text-sm text-gray-400">
                        {USERS[partnerUser].displayName} will see it when they open the app
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div key="compose" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h3 className="text-base font-bold text-gray-800">Leave a note 💌</h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            To {USERS[partnerUser].emoji} {USERS[partnerUser].displayName}
                          </p>
                        </div>
                        <button
                          onClick={() => { setNoteOpen(false); setNoteText('') }}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="rounded-2xl p-4 mb-4" style={{ background: `${primary}0d` }}>
                        <textarea
                          value={noteText}
                          onChange={e => setNoteText(e.target.value)}
                          placeholder="Write something from the heart..."
                          rows={5}
                          autoFocus
                          className="w-full text-sm text-gray-700 placeholder:text-gray-300
                                     bg-transparent outline-none resize-none leading-relaxed"
                        />
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSendNote}
                        disabled={!noteText.trim()}
                        className="w-full py-4 rounded-2xl text-white text-sm font-semibold
                                   disabled:opacity-40 flex items-center justify-center gap-2"
                        style={{ background: primary }}
                      >
                        <Send size={15} /> Send with love 💌
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Read note modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {readingNote && unreadNote && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { markRead(unreadNote.id); setReadingNote(false) }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-7 w-full max-w-sm shadow-modal"
            >
              <div className="text-center mb-5">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: 2, duration: 0.5 }}
                  className="text-4xl mb-2"
                >💌</motion.div>
                <p className="text-xs font-bold text-gray-400">
                  From {USERS[partnerUser].emoji} {USERS[partnerUser].displayName}
                </p>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed text-center mb-6">
                {unreadNote.content}
              </p>
              <button
                onClick={() => { markRead(unreadNote.id); setReadingNote(false) }}
                className="w-full py-3 rounded-2xl text-white text-sm font-semibold"
                style={{ background: primary }}
              >
                💕 Close with love
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
