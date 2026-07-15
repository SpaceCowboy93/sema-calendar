'use client'

import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, isSameMonth, isToday, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Clock, Plus, X, Send, FileText, Camera, Check, Palette, ChevronDown } from 'lucide-react'
import { QuickAddSheet } from '@/components/ui/QuickAddSheet'
import { useAppStore } from '@/store/useAppStore'
import { USERS, OTHER_USER, type UserName, type MoodType, type CalendarEvent, type WishlistCategory, type GoalCategory, type EventTodo, type EventColor } from '@/types'
import { EventModal, COLOR_OPTIONS } from '@/components/calendar/EventModal'
import {
  MOOD_CONFIG, WISHLIST_CATEGORY_CONFIG, getCalendarDays, toDateString, formatTime,
  getTodayString, cn, EVENT_COLOR_CLASS, COLOR_HEX, generateId,
} from '@/lib/utils'

const GOAL_CATEGORIES: [GoalCategory, { emoji: string; label: string }][] = [
  ['travel',     { emoji: '✈️', label: 'Travel'     }],
  ['money',      { emoji: '💰', label: 'Money'      }],
  ['fitness',    { emoji: '💪', label: 'Fitness'    }],
  ['life',       { emoji: '🌱', label: 'Life'       }],
  ['learning',   { emoji: '📚', label: 'Learning'   }],
  ['hobbies',    { emoji: '🎨', label: 'Hobbies'    }],
  ['challenges', { emoji: '🏆', label: 'Challenges' }],
]

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MOOD_TYPES = Object.entries(MOOD_CONFIG) as [MoodType, { emoji: string; label: string }][]

type CategoryType = 'wishes' | 'plans' | 'dreams' | 'moments'
const CATEGORY_DEFS: { id: CategoryType; emoji: string; label: string; color: EventColor }[] = [
  { id: 'wishes',  emoji: '💜', label: 'Wishes',  color: 'seval'  },
  { id: 'plans',   emoji: '💚', label: 'Plans',   color: 'green'  },
  { id: 'dreams',  emoji: '💙', label: 'Dreams',  color: 'blue'   },
  { id: 'moments', emoji: '💛', label: 'Moments', color: 'yellow' },
]

export default function TogetherPage() {
  const currentUser  = useAppStore(s => s.currentUser)!
  const events       = useAppStore(s => s.events)
  const todos        = useAppStore(s => s.todos)
  const goals        = useAppStore(s => s.goals)
  const wishlist     = useAppStore(s => s.wishlistItems)
  const getMood      = useAppStore(s => s.getMoodForUser)
  const setMood      = useAppStore(s => s.setMood)
  const partnerNotes = useAppStore(s => s.partnerNotes)
  const markRead     = useAppStore(s => s.markPartnerNoteRead)
  const sendNote     = useAppStore(s => s.sendPartnerNote)

  const pageBg         = useAppStore(s => s.pageBackgrounds.together)
  const uploadPageBg   = useAppStore(s => s.uploadPageBackground)
  const setPageBg      = useAppStore(s => s.setPageBackground)
  const bgInputRef     = useRef<HTMLInputElement>(null)

  const partnerUser = OTHER_USER[currentUser]
  const isSeval     = currentUser === 'seval'
  const primary     = isSeval ? '#8b5cf6' : '#14b8a6'
  const lightBg     = isSeval ? 'bg-seval-50' : 'bg-mateo-50'

  async function handleBgPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await uploadPageBg('together', file)
    e.target.value = ''
  }

  // Calendar state
  const [viewDate, setViewDate]         = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(getTodayString())
  const [modalOpen, setModalOpen]       = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  // Double-tap to add event
  const lastTapRef     = useRef(0)
  const lastTapDateRef = useRef('')

  function handleDayTap(dateStr: string) {
    const now      = Date.now()
    const diff     = now - lastTapRef.current
    const dayEvts  = eventsByDate[dateStr] ?? []

    if (diff < 300 && diff > 0 && lastTapDateRef.current === dateStr) {
      // Double-tap → create new event on any day
      lastTapRef.current     = 0
      lastTapDateRef.current = ''
      setSelectedDate(dateStr)
      setEditingEvent(null)
      setModalOpen(true)
      return
    }

    lastTapRef.current     = now
    lastTapDateRef.current = dateStr
    setSelectedDate(dateStr)

    if (dayEvts.length === 1) {
      // Single event → open it immediately
      setEditingEvent(dayEvts[0])
      setModalOpen(true)
      lastTapRef.current = 0 // prevent accidental double-tap
    }
  }

  // Category hub
  const [openCategory, setOpenCategory]   = useState<CategoryType | null>(null)
  const [quickAddOpen, setQuickAddOpen]   = useState(false)

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

  const selectedEvents = useMemo(() => {
    const seen = new Set<string>()
    return (eventsByDate[selectedDate] ?? []).filter(ev => {
      if (seen.has(ev.id)) return false
      seen.add(ev.id)
      return true
    })
  }, [eventsByDate, selectedDate])

  // Category counts
  const categoryCounts: Record<CategoryType, number> = {
    wishes:  wishlist.filter(i => !i.isCompleted).length,
    plans:   todos.filter(t => !t.isCompleted).length,
    dreams:  goals.filter(g => !g.isCompleted).length,
    moments: events.length,
  }

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
    <div
      className="min-h-screen bg-gray-50 relative"
      style={pageBg ? { backgroundImage: `url(${pageBg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {pageBg && <div className="fixed inset-0 bg-white/85 backdrop-blur-sm z-0 pointer-events-none" />}
      <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgPick} />

      {/* ── Calendar header ── */}
      <div
        className="px-5 pt-14 pb-3 relative z-10"
        style={{
          background: pageBg ? 'transparent' : (isSeval
            ? 'linear-gradient(135deg, #f5f3ff, #fafafa)'
            : 'linear-gradient(135deg, #f0fdfa, #fafafa)'),
        }}
      >
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{format(viewDate, 'MMMM')}</h1>
            <p className="text-xs text-gray-400">{format(viewDate, 'yyyy')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => bgInputRef.current?.click()}
              className="w-8 h-8 rounded-full bg-white/80 shadow-card flex items-center justify-center text-gray-400 active:bg-gray-100"
              title="Set page background"
            >
              <Camera size={13} />
            </button>
            {pageBg && (
              <button
                onClick={() => setPageBg('together', null)}
                className="w-8 h-8 rounded-full bg-white/80 shadow-card flex items-center justify-center text-gray-400 active:bg-gray-100"
                title="Remove background"
              >
                <X size={13} />
              </button>
            )}
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

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {DOW_LABELS.map((d, i) => (
            <div key={i} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-y-1 mb-1">
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
                onClick={() => handleDayTap(dateStr)}
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
      </div>

      {/* ── Category hub (under calendar) ── */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overview</p>
          <button
            onClick={() => setOpenCategory('plans')}
            className="flex items-center gap-1 text-[10px] font-semibold"
            style={{ color: primary }}
          >
            <Plus size={11} /> Add New
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {CATEGORY_DEFS.map(cat => {
            const catHex = COLOR_HEX[cat.color]
            return (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.93 }}
                onClick={() => setOpenCategory(cat.id)}
                className="bg-white rounded-xl shadow-card p-2.5 flex flex-col items-center gap-1"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                  style={{ background: `${catHex}20` }}
                >
                  {cat.emoji}
                </div>
                <span className="text-[9px] font-semibold text-gray-500">{cat.label}</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: `${catHex}20`, color: catHex }}
                >
                  {categoryCounts[cat.id]}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* ── Mood chips strip ── */}
        <div className="flex gap-2 flex-wrap">
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

        {/* ── Unread partner note banner ── */}
        <AnimatePresence>
          {unreadNote && !readingNote && (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              onClick={() => setReadingNote(true)}
              className="w-full rounded-2xl px-4 py-3 text-left"
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

        {/* ── Leave a note button ── */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setNoteOpen(true)}
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{ background: `${primary}10`, border: `1.5px solid ${primary}20` }}
        >
          <span className="text-xl">💌</span>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-gray-800">Leave a note</p>
            <p className="text-xs text-gray-400">Send {USERS[partnerUser].displayName} a little love message</p>
          </div>
          <span className="text-gray-300 text-sm">›</span>
        </motion.button>

        {/* ── Selected date events ── */}
        <div>
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
                  className="w-full text-left rounded-2xl mb-2 shadow-card overflow-hidden relative
                             active:scale-[0.98] transition-transform"
                  style={ev.backgroundPhoto ? {
                    backgroundImage: `url(${ev.backgroundPhoto})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : {}}
                >
                  {ev.backgroundPhoto && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
                  )}
                  <div className={cn('relative flex gap-3 p-4', !ev.backgroundPhoto && 'bg-white')}>
                    {!ev.backgroundPhoto && (
                      <div className={cn('w-1 rounded-full shrink-0 self-stretch', EVENT_COLOR_CLASS[ev.color])} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-semibold text-sm', ev.backgroundPhoto ? 'text-white drop-shadow-sm' : 'text-gray-800')}>
                        {ev.title}
                      </p>
                      {ev.startTime && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock size={11} className={ev.backgroundPhoto ? 'text-white/70' : 'text-gray-400'} />
                          <p className={cn('text-xs', ev.backgroundPhoto ? 'text-white/80' : 'text-gray-400')}>{formatTime(ev.startTime)}</p>
                        </div>
                      )}
                      {ev.notes && (
                        <p className={cn('text-xs mt-1 truncate', ev.backgroundPhoto ? 'text-white/70' : 'text-gray-400')}>{ev.notes}</p>
                      )}
                      {ev.photos && ev.photos.length > 0 && (
                        <p className={cn('text-xs mt-1', ev.backgroundPhoto ? 'text-white/60' : 'text-gray-300')}>
                          📸 {ev.photos.length} photo{ev.photos.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 self-center">
                      <div
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={ev.backgroundPhoto
                          ? { background: 'rgba(255,255,255,0.2)', color: 'white' }
                          : { background: ev.createdBy === 'seval' ? '#ede9fe' : '#ccfbf1', color: ev.createdBy === 'seval' ? '#7c3aed' : '#0d9488' }
                        }
                      >
                        {USERS[ev.createdBy].displayName}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </AnimatePresence>
        </div>

        </div>

      {/* ── EventModal ── */}
      <EventModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEvent(null) }}
        date={selectedDate}
        event={editingEvent}
      />

      <QuickAddSheet
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        primary={primary}
      />

      {/* ── Category hub sheet ── */}
      <AnimatePresence>
        {openCategory && (
          <CategoryHubSheet
            type={openCategory}
            primary={primary}
            currentUser={currentUser}
            onClose={() => setOpenCategory(null)}
            onEditMoment={ev => {
              setOpenCategory(null)
              setEditingEvent(ev)
              setModalOpen(true)
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Mood picker sheet ── */}
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
                  <button onClick={() => setMoodOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
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

      {/* ── Note compose sheet ── */}
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
                    <motion.div key="sent" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-10 text-center">
                      <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: 2, duration: 0.4 }}
                        className="text-5xl mb-4">💌</motion.div>
                      <p className="font-bold text-gray-800 mb-1">Sent with love 💕</p>
                      <p className="text-sm text-gray-400">{USERS[partnerUser].displayName} will see it when they open the app</p>
                    </motion.div>
                  ) : (
                    <motion.div key="compose" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h3 className="text-base font-bold text-gray-800">Leave a note 💌</h3>
                          <p className="text-xs text-gray-400 mt-0.5">To {USERS[partnerUser].emoji} {USERS[partnerUser].displayName}</p>
                        </div>
                        <button onClick={() => { setNoteOpen(false); setNoteText('') }}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
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
                          className="w-full text-sm text-gray-700 placeholder:text-gray-300 bg-transparent outline-none resize-none leading-relaxed"
                        />
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSendNote}
                        disabled={!noteText.trim()}
                        className="w-full py-4 rounded-2xl text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
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

      {/* ── Read note modal ── */}
      <AnimatePresence>
        {readingNote && unreadNote && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { markRead(unreadNote.id); setReadingNote(false) }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-7 w-full max-w-sm shadow-modal"
            >
              <div className="text-center mb-5">
                <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: 2, duration: 0.5 }}
                  className="text-4xl mb-2">💌</motion.div>
                <p className="text-xs font-bold text-gray-400">From {USERS[partnerUser].emoji} {USERS[partnerUser].displayName}</p>
              </div>
              <p className="text-gray-700 text-sm leading-relaxed text-center mb-6">{unreadNote.content}</p>
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

/* ── Category Hub Sheet ───────────────────────────────────────────────────────── */
function CategoryHubSheet({
  type, primary, currentUser, onClose, onEditMoment,
}: {
  type: CategoryType
  primary: string
  currentUser: UserName
  onClose: () => void
  onEditMoment: (ev: CalendarEvent) => void
}) {
  const todos          = useAppStore(s => s.todos)
  const goals          = useAppStore(s => s.goals)
  const wishlist       = useAppStore(s => s.wishlistItems)
  const events         = useAppStore(s => s.events)
  const toggleTodo     = useAppStore(s => s.toggleTodo)
  const toggleWishlist = useAppStore(s => s.toggleWishlistItem)
  const updateTodo     = useAppStore(s => s.updateTodo)
  const updateGoal     = useAppStore(s => s.updateGoal)
  const updateWishlist = useAppStore(s => s.updateWishlistItem)
  const deleteTodo     = useAppStore(s => s.deleteTodo)
  const deleteGoal     = useAppStore(s => s.deleteGoal)
  const deleteWishlist = useAppStore(s => s.deleteWishlistItem)
  const sendNote       = useAppStore(s => s.sendPartnerNote)
  // Add-form store actions
  const addTodoDo      = useAppStore(s => s.addTodo)
  const addGoalDo      = useAppStore(s => s.addGoal)
  const addWishDo      = useAppStore(s => s.addWishlistItem)
  const addEventDo     = useAppStore(s => s.addEvent)
  const uploadPhoto    = useAppStore(s => s.uploadEventPhoto)
  const updateEventDo  = useAppStore(s => s.updateEvent)

  const def = CATEGORY_DEFS.find(d => d.id === type)!
  const catHex = COLOR_HEX[def.color]

  // ── Add-form state ──────────────────────────────────────────────────────────
  const [addOpen, setAddOpen]             = useState(false)
  const [addTitle, setAddTitle]           = useState('')
  const [addNotes, setAddNotes]           = useState('')
  const [addDate, setAddDate]             = useState('')
  const [addTime, setAddTime]             = useState('')
  const [addColor, setAddColor]           = useState<EventColor>(def.color)
  const [addTodoItems, setAddTodoItems]   = useState<EventTodo[]>([])
  const [addNewTodo, setAddNewTodo]       = useState('')
  const [addPhotos, setAddPhotos]         = useState<string[]>([])
  const [addFiles, setAddFiles]           = useState<File[]>([])
  const [addBgIdx, setAddBgIdx]           = useState<number | null>(null)
  const [addUploading, setAddUploading]   = useState(false)
  const [addColorPopup, setAddColorPopup] = useState(false)
  const [addWishCat, setAddWishCat]       = useState<WishlistCategory>('plan')
  const [addGoalCat, setAddGoalCat]       = useState<GoalCategory>('life')
  const addPhotoRef = useRef<HTMLInputElement>(null)

  function resetAdd() {
    setAddTitle(''); setAddNotes(''); setAddDate(''); setAddTime('')
    setAddColor(def.color)
    setAddTodoItems([]); setAddNewTodo('')
    setAddPhotos([]); setAddFiles([]); setAddBgIdx(null)
    setAddWishCat('plan'); setAddGoalCat('life'); setAddColorPopup(false)
  }

  async function handleAddSave() {
    if (!addTitle.trim()) return
    if (type === 'plans') {
      addTodoDo(
        addTitle.trim(),
        addTodoItems.length ? addTodoItems.map(t => t.title) : undefined,
        addDate || undefined,
        addColor,
        addNotes.trim() || undefined,
        addTime || undefined,
      )
    } else if (type === 'dreams') {
      addGoalDo(addGoalCat, addTitle.trim(), addNotes.trim() || undefined, addDate || undefined, 0, addTime || undefined)
    } else if (type === 'wishes') {
      addWishDo(addTitle.trim(), addWishCat, addNotes.trim() || undefined)
    } else {
      // moments
      const newId = addEventDo({
        title: addTitle.trim(),
        date: addDate || getTodayString(),
        startTime: addTime || undefined,
        notes: addNotes.trim() || undefined,
        color: addColor,
        todos: addTodoItems.length ? addTodoItems : undefined,
        createdBy: currentUser,
      })
      if (addFiles.length > 0) {
        setAddUploading(true)
        for (const f of addFiles) await uploadPhoto(newId, f)
        if (addBgIdx !== null) {
          const stored = useAppStore.getState().events.find(e => e.id === newId)
          const bpUrl  = stored?.photos?.[addBgIdx]
          if (bpUrl) updateEventDo(newId, { backgroundPhoto: bpUrl })
        }
        setAddUploading(false)
      }
    }
    resetAdd()
    setAddOpen(false)
  }

  const addLabel = type === 'plans' ? 'Plan' : type === 'dreams' ? 'Dream' : type === 'wishes' ? 'Wish' : 'Moment'
  const addActiveColor = COLOR_OPTIONS.find(c => c.value === addColor)

  type ListItem = { id: string; title: string; sub?: string; done: boolean }

  const items: ListItem[] = useMemo(() => {
    switch (type) {
      case 'wishes':
        return wishlist.map(i => ({
          id: i.id, title: i.title,
          sub: i.notes || WISHLIST_CATEGORY_CONFIG[i.category].label,
          done: i.isCompleted,
        }))
      case 'plans':
        return todos.map(t => ({
          id: t.id, title: t.title,
          sub: t.notes || t.date,
          done: t.isCompleted,
        }))
      case 'dreams':
        return goals.map(g => ({
          id: g.id, title: g.title,
          sub: g.notes || g.targetDate,
          done: g.isCompleted,
        }))
      case 'moments':
        return [...events].sort((a, b) => a.date.localeCompare(b.date)).map(e => ({
          id: e.id, title: e.title,
          sub: e.date + (e.startTime ? ` · ${formatTime(e.startTime)}` : ''),
          done: false,
        }))
    }
  }, [type, todos, goals, wishlist, events])

  // ── edit state ──
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editDate,  setEditDate]  = useState('')
  const [editTime,  setEditTime]  = useState('')

  function openEdit(id: string) {
    if (type === 'moments') {
      const ev = events.find(e => e.id === id)
      if (ev) { onClose(); onEditMoment(ev) }
      return
    }
    let src: { title: string; notes?: string; date?: string; startTime?: string; targetDate?: string } | undefined
    if (type === 'wishes') src = wishlist.find(i => i.id === id)
    if (type === 'plans')  src = todos.find(t => t.id === id)
    if (type === 'dreams') src = goals.find(g => g.id === id)
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
    if (type === 'plans')  updateTodo(editingId,     { ...base, date:       editDate || undefined })
    if (type === 'dreams') updateGoal(editingId,     { ...base, targetDate: editDate || undefined })
    if (type === 'wishes') updateWishlist(editingId, { ...base, date:       editDate || undefined })
    setEditingId(null)
  }

  function handleDelete() {
    if (!editingId) return
    if (type === 'plans')  deleteTodo(editingId)
    if (type === 'dreams') deleteGoal(editingId)
    if (type === 'wishes') deleteWishlist(editingId)
    setEditingId(null)
  }

  function handleToggle(id: string, title: string, done: boolean) {
    if (type === 'plans')  toggleTodo(id)
    if (type === 'wishes') toggleWishlist(id)
    if (type === 'dreams') updateGoal(id, { isCompleted: !done })
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
                   max-w-lg mx-auto max-h-[80vh] flex flex-col"
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

      {/* ── Add sub-sheet ── */}
      <AnimatePresence>
        {addOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (!addUploading) { resetAdd(); setAddOpen(false) } }}
              className="fixed inset-0 z-[60] bg-black/20"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 380 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[2rem] shadow-modal
                         max-w-lg mx-auto max-h-[92vh] overflow-y-auto"
            >
              <div className="px-5 pt-4 pb-10">
                <div className="drag-handle mb-4" />
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-gray-800">Add {addLabel}</h3>
                  <button onClick={() => { resetAdd(); setAddOpen(false) }}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <X size={16} />
                  </button>
                </div>

                {/* Title */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={addTitle}
                    onChange={e => setAddTitle(e.target.value)}
                    placeholder={
                      type === 'plans' ? "What's the plan?" :
                      type === 'dreams' ? "What do you dream of?" :
                      type === 'wishes' ? "What do you wish for?" :
                      "Name this moment..."
                    }
                    autoFocus
                    className="w-full text-lg font-semibold text-gray-800 placeholder:text-gray-300
                               border-b-2 border-gray-100 focus:border-gray-200 pb-3 outline-none bg-transparent"
                  />
                </div>

                {/* Wish category */}
                {type === 'wishes' && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Category</p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(WISHLIST_CATEGORY_CONFIG) as [WishlistCategory, { emoji: string; label: string }][]).map(([id, cfg]) => (
                        <button key={id} onClick={() => setAddWishCat(id)}
                          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all', addWishCat === id ? 'text-white' : 'bg-gray-100 text-gray-500')}
                          style={addWishCat === id ? { background: catHex } : {}}>
                          {cfg.emoji} {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dream / goal category */}
                {type === 'dreams' && (
                  <div className="mb-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Category</p>
                    <div className="flex flex-wrap gap-2">
                      {GOAL_CATEGORIES.map(([id, cfg]) => (
                        <button key={id} onClick={() => setAddGoalCat(id)}
                          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all', addGoalCat === id ? 'text-white' : 'bg-gray-100 text-gray-500')}
                          style={addGoalCat === id ? { background: catHex } : {}}>
                          {cfg.emoji} {cfg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color picker (Plans + Moments) */}
                {(type === 'plans' || type === 'moments') && (
                  <div className="relative mb-4">
                    <button
                      onClick={() => setAddColorPopup(v => !v)}
                      className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <div className="w-5 h-5 rounded-full shrink-0" style={{ background: addActiveColor?.hex }} />
                      <span className="text-sm font-medium text-gray-700 flex-1 text-left">{addActiveColor?.label}</span>
                      <Palette size={14} className="text-gray-400" />
                      <ChevronDown size={14} className={cn('text-gray-400 transition-transform', addColorPopup && 'rotate-180')} />
                    </button>
                    <AnimatePresence>
                      {addColorPopup && (
                        <>
                          <div className="fixed inset-0 z-[65]" onClick={() => setAddColorPopup(false)} />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.12 }}
                            className="absolute left-0 right-0 top-full mt-1.5 z-[66] bg-white rounded-2xl shadow-modal border border-gray-100 p-2.5"
                          >
                            <div className="grid grid-cols-2 gap-1.5">
                              {COLOR_OPTIONS.map(opt => (
                                <button key={opt.value}
                                  onClick={() => { setAddColor(opt.value as EventColor); setAddColorPopup(false) }}
                                  className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all', addColor === opt.value ? 'bg-gray-100' : 'hover:bg-gray-50')}
                                >
                                  <div className="w-6 h-6 rounded-full shrink-0" style={{ background: opt.hex }} />
                                  <span className="text-sm font-medium text-gray-700 flex-1 text-left">{opt.label}</span>
                                  {addColor === opt.value && <Check size={13} className="text-gray-400 shrink-0" strokeWidth={2.5} />}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Date + Time */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white shadow-card flex items-center justify-center">
                      <Clock size={14} className="text-gray-400" />
                    </div>
                    <input type="date" value={addDate} onChange={e => setAddDate(e.target.value)}
                      className="flex-1 text-sm text-gray-700 bg-transparent outline-none" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8" />
                    <input type="time" value={addTime} onChange={e => setAddTime(e.target.value)}
                      className="flex-1 text-sm text-gray-700 bg-white rounded-xl px-3 py-1.5 outline-none shadow-card" />
                    <span className="text-xs text-gray-400">time (optional)</span>
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-4 flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white shadow-card flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-gray-400" />
                  </div>
                  <textarea value={addNotes} onChange={e => setAddNotes(e.target.value)}
                    placeholder="Add notes..." rows={3}
                    className="flex-1 text-sm text-gray-700 bg-transparent outline-none resize-none placeholder:text-gray-300" />
                </div>

                {/* Checklist (Plans + Moments) */}
                {(type === 'plans' || type === 'moments') && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Checklist</p>
                    <div className="space-y-2">
                      {addTodoItems.map(todo => (
                        <div key={todo.id} className="flex items-center gap-3 group">
                          <button
                            onClick={() => setAddTodoItems(prev => prev.map(t => t.id === todo.id ? { ...t, isCompleted: !t.isCompleted } : t))}
                            className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all', todo.isCompleted ? 'border-emerald-400 bg-emerald-400' : 'border-gray-300')}
                          >
                            {todo.isCompleted && <Check size={11} color="white" strokeWidth={3} />}
                          </button>
                          <span className={cn('flex-1 text-sm', todo.isCompleted ? 'line-through text-gray-400' : 'text-gray-700')}>{todo.title}</span>
                          <button onClick={() => setAddTodoItems(prev => prev.filter(t => t.id !== todo.id))}
                            className="opacity-0 group-hover:opacity-100 text-gray-300 active:text-red-400 transition-all">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="w-5 h-5 rounded-full border-2 border-dashed border-gray-200 shrink-0" />
                        <input
                          type="text" value={addNewTodo} onChange={e => setAddNewTodo(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && addNewTodo.trim()) {
                              setAddTodoItems(prev => [...prev, { id: generateId(), title: addNewTodo.trim(), isCompleted: false }])
                              setAddNewTodo('')
                            }
                          }}
                          placeholder="Add item..."
                          className="flex-1 text-sm text-gray-600 placeholder:text-gray-300 outline-none bg-transparent"
                        />
                        {addNewTodo && (
                          <button onClick={() => {
                            setAddTodoItems(prev => [...prev, { id: generateId(), title: addNewTodo.trim(), isCompleted: false }])
                            setAddNewTodo('')
                          }} className="text-gray-400 active:text-gray-600"><Plus size={16} /></button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Photos (Moments only) */}
                {type === 'moments' && (
                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Photos</p>
                    {addPhotos.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-3">
                        {addPhotos.map((url, i) => (
                          <div key={i} className="relative w-20 h-20">
                            <img src={url} alt="" className="w-full h-full rounded-2xl object-cover" />
                            <button
                              onClick={() => {
                                setAddPhotos(p => p.filter((_, idx) => idx !== i))
                                setAddFiles(p => p.filter((_, idx) => idx !== i))
                                if (addBgIdx === i) setAddBgIdx(null)
                                else if (addBgIdx !== null && addBgIdx > i) setAddBgIdx(addBgIdx - 1)
                              }}
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                            >×</button>
                            <button
                              onClick={() => setAddBgIdx(addBgIdx === i ? null : i)}
                              className={cn('absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5 rounded-lg font-bold transition-all', addBgIdx === i ? 'bg-yellow-400 text-white' : 'bg-black/40 text-white/80')}
                            >{addBgIdx === i ? '★ BG' : '☆'}</button>
                          </div>
                        ))}
                      </div>
                    )}
                    <input ref={addPhotoRef} type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setAddPhotos(prev => [...prev, URL.createObjectURL(file)])
                        setAddFiles(prev => [...prev, file])
                        if (e.target) e.target.value = ''
                      }}
                    />
                    <button onClick={() => addPhotoRef.current?.click()} disabled={addUploading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-50 text-sm text-gray-500 font-medium active:bg-gray-100 disabled:opacity-50">
                      <Camera size={15} className="text-gray-400" />
                      {addPhotos.length > 0 ? 'Add another photo' : 'Add photo'}
                    </button>
                    <p className="text-[10px] text-gray-300 mt-1">☆ = set as card background · Max 5MB</p>
                  </div>
                )}

                {/* Save */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAddSave}
                  disabled={!addTitle.trim() || addUploading}
                  className="w-full py-4 rounded-2xl text-white text-sm font-semibold disabled:opacity-40"
                  style={{ background: catHex }}
                >
                  {addUploading ? 'Uploading...' : `Add ${addLabel}`}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Edit sub-sheet ── */}
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
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[2rem] shadow-modal max-w-lg mx-auto"
            >
              <div className="px-5 pt-4 pb-10">
                <div className="drag-handle mb-4" />
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-gray-800">Edit {def.label.slice(0, -1)}</h3>
                  <button onClick={() => setEditingId(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-3 mb-5">
                  <div className="bg-gray-50 rounded-2xl px-4 py-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Title</p>
                    <input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full text-sm text-gray-800 bg-transparent outline-none"
                      placeholder="Title..."
                    />
                  </div>
                  <div className="bg-gray-50 rounded-2xl px-4 py-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                    <textarea
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      rows={3}
                      className="w-full text-sm text-gray-700 bg-transparent outline-none resize-none placeholder:text-gray-300"
                      placeholder="Add notes..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Date</p>
                      <input
                        type="date"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        className="w-full text-sm text-gray-700 bg-transparent outline-none"
                      />
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Time</p>
                      <input
                        type="time"
                        value={editTime}
                        onChange={e => setEditTime(e.target.value)}
                        className="w-full text-sm text-gray-700 bg-transparent outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    className="flex-1 py-3.5 rounded-2xl text-red-400 text-sm font-semibold bg-red-50 active:opacity-80"
                  >
                    Delete
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={saveEdit}
                    disabled={!editTitle.trim()}
                    className="flex-1 py-3.5 rounded-2xl text-white text-sm font-semibold disabled:opacity-40"
                    style={{ background: catHex }}
                  >
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
