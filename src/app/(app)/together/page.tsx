'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { LogOut, ChevronRight, X, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { USERS, OTHER_USER, type UserName, type MoodType } from '@/types'
import { MOOD_CONFIG, getDaysUntil, getTodayString, cn } from '@/lib/utils'

const MOOD_TYPES = Object.entries(MOOD_CONFIG) as [MoodType, { emoji: string; label: string }][]

export default function TogetherPage() {
  const router       = useRouter()
  const currentUser  = useAppStore(s => s.currentUser)!
  const setCurrentUser = useAppStore(s => s.setCurrentUser)
  const events       = useAppStore(s => s.events)
  const getMood      = useAppStore(s => s.getMoodForUser)
  const setMood      = useAppStore(s => s.setMood)
  const partnerNotes = useAppStore(s => s.partnerNotes)
  const markRead     = useAppStore(s => s.markPartnerNoteRead)
  const sendNote     = useAppStore(s => s.sendPartnerNote)
  const countdowns   = useAppStore(s => s.countdowns)

  const partnerUser  = OTHER_USER[currentUser]
  const isSeval      = currentUser === 'seval'
  const primary      = isSeval ? '#8b5cf6' : '#14b8a6'
  const lightBg      = isSeval ? 'bg-seval-50' : 'bg-mateo-50'

  const myMood      = getMood(currentUser)
  const partnerMood = getMood(partnerUser)

  const today = getTodayString()
  const now   = new Date()
  const hour  = now.getHours()
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Next upcoming event
  const nextEvent = useMemo(() =>
    events
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null
  , [events, today])

  // Nearest countdown
  const nextCountdown = useMemo(() =>
    [...countdowns]
      .filter(c => getDaysUntil(c.date) >= 0)
      .sort((a, b) => getDaysUntil(a.date) - getDaysUntil(b.date))[0] ?? null
  , [countdowns])

  // Unread note for current user
  const unreadNote = partnerNotes.find(n => n.to === currentUser && !n.isRead) ?? null

  // Mood popup
  const [moodOpen, setMoodOpen]     = useState(false)
  const [pendingMood, setPending]   = useState<MoodType | null>(null)
  const [moodMsg, setMoodMsg]       = useState('')

  // Note compose
  const [noteOpen, setNoteOpen]   = useState(false)
  const [noteText, setNoteText]   = useState('')
  const [noteSent, setNoteSent]   = useState(false)

  // Unread note modal
  const [readingNote, setReadingNote] = useState(false)

  function saveMood() {
    if (!pendingMood) return
    setMood(pendingMood, moodMsg.trim() || undefined)
    setMoodOpen(false)
    setPending(null)
    setMoodMsg('')
  }

  function handleSendNote() {
    if (!noteText.trim()) return
    sendNote(noteText.trim())
    setNoteText('')
    setNoteSent(true)
    setTimeout(() => { setNoteSent(false); setNoteOpen(false) }, 1800)
  }

  return (
    <div className="min-h-screen px-5 pt-14 pb-32">

      {/* Header row */}
      <div className="flex items-start justify-between mb-7">
        <div>
          <p className="text-xs text-gray-400 font-medium mb-0.5">
            {format(now, 'EEEE, MMMM d')}
          </p>
          <h1 className="text-2xl font-bold text-gray-800 leading-snug">
            {timeGreeting} 💕<br />
            <span style={{ color: primary }}>{USERS[currentUser].displayName}</span>
            {' & '}{USERS[partnerUser].displayName}
          </h1>
        </div>
        <button
          onClick={() => { setCurrentUser(null); router.replace('/') }}
          className="mt-1 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs
                     font-medium text-gray-400 bg-gray-100 active:bg-gray-200"
        >
          <LogOut size={12} /> Out
        </button>
      </div>

      {/* Mood chips — both users */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {([currentUser, partnerUser] as UserName[]).map(uid => {
          const mood  = getMood(uid)
          const color = uid === 'seval' ? '#8b5cf6' : '#14b8a6'
          const isMe  = uid === currentUser
          return (
            <motion.button
              key={uid}
              whileTap={{ scale: 0.95 }}
              onClick={() => isMe && setMoodOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold"
              style={{ background: `${color}15`, color }}
            >
              <span className="text-base">{USERS[uid].emoji}</span>
              {mood
                ? <>{MOOD_CONFIG[mood.mood].emoji} {MOOD_CONFIG[mood.mood].label}</>
                : <>{isMe ? 'Set your mood' : 'No mood yet'}</>
              }
            </motion.button>
          )
        })}
      </div>

      {/* Unread partner note banner */}
      <AnimatePresence>
        {unreadNote && !readingNote && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onClick={() => setReadingNote(true)}
            className="w-full rounded-3xl p-4 mb-5 text-left"
            style={{ background: `${primary}12`, border: `1.5px solid ${primary}30` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">💌</span>
              <p className="text-xs font-bold" style={{ color: primary }}>
                Note from {USERS[partnerUser].displayName}
              </p>
            </div>
            <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
              {unreadNote.content}
            </p>
            <p className="text-[10px] text-gray-400 mt-2">Tap to read</p>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Next moment together */}
      <div className="mb-5">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
          Next moment together
        </p>
        {nextEvent ? (
          <div className="rounded-3xl bg-white shadow-card p-5">
            <p className="text-base font-bold text-gray-800 mb-1">{nextEvent.title}</p>
            <p className="text-sm text-gray-400">
              {format(new Date(nextEvent.date + 'T12:00:00'), 'EEEE, MMMM d')}
            </p>
            {nextEvent.notes && (
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">{nextEvent.notes}</p>
            )}
          </div>
        ) : (
          <div className="rounded-3xl bg-white shadow-card p-5 text-center">
            <p className="text-2xl mb-2">🌙</p>
            <p className="text-sm text-gray-400">Nothing planned yet</p>
            <p className="text-xs text-gray-300 mt-0.5">use Plans to add something together</p>
          </div>
        )}
      </div>

      {/* Countdown */}
      {nextCountdown && (
        <div className="mb-5">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Looking forward to
          </p>
          <div className="rounded-3xl bg-white shadow-card p-5 flex items-center gap-4">
            <span className="text-3xl">{nextCountdown.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm truncate">{nextCountdown.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {format(new Date(nextCountdown.date + 'T12:00:00'), 'MMMM d')}
              </p>
            </div>
            <div className="text-right shrink-0">
              {getDaysUntil(nextCountdown.date) === 0 ? (
                <p className="text-sm font-bold" style={{ color: primary }}>Today!</p>
              ) : (
                <>
                  <p className="text-2xl font-bold text-gray-800">{getDaysUntil(nextCountdown.date)}</p>
                  <p className="text-[10px] text-gray-400">days</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leave a note button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setNoteOpen(true)}
        className="w-full flex items-center gap-3 rounded-3xl px-5 py-4"
        style={{ background: `${primary}12`, border: `1.5px solid ${primary}25` }}
      >
        <span className="text-2xl">💌</span>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-gray-800">Leave a note</p>
          <p className="text-xs text-gray-400">
            Send {USERS[partnerUser].displayName} a little love message
          </p>
        </div>
        <ChevronRight size={16} className="text-gray-300 shrink-0" />
      </motion.button>

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
                      className={cn('flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl transition-all')}
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
                    className="w-full text-sm text-gray-700 placeholder:text-gray-300
                               bg-transparent outline-none resize-none"
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

      {/* ── Note compose sheet ─────────────────────────────────────────────────── */}
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

      {/* ── Read note modal ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {readingNote && unreadNote && (
          <>
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
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
