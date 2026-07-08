'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, LogOut, X, Send, Camera } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { USERS, OTHER_USER, type UserName, type MoodType } from '@/types'
import { MOOD_CONFIG, getDaysUntil, formatDate, cn } from '@/lib/utils'

const MOOD_TYPES = Object.entries(MOOD_CONFIG) as [
  keyof typeof MOOD_CONFIG,
  { emoji: string; label: string }
][]

export default function UsPage() {
  const router = useRouter()
  const currentUser = useAppStore(s => s.currentUser)!
  const setCurrentUser  = useAppStore(s => s.setCurrentUser)
  const getMood     = useAppStore(s => s.getMoodForUser)
  const setMood     = useAppStore(s => s.setMood)
  const countdowns       = useAppStore(s => s.countdowns)
  const addCountdown     = useAppStore(s => s.addCountdown)
  const deleteCountdown  = useAppStore(s => s.deleteCountdown)
  const sendPartnerNote  = useAppStore(s => s.sendPartnerNote)

  const pageBg       = useAppStore(s => s.pageBackgrounds.us)
  const uploadPageBg = useAppStore(s => s.uploadPageBackground)
  const setPageBg    = useAppStore(s => s.setPageBackground)
  const bgInputRef   = useRef<HTMLInputElement>(null)

  async function handleBgPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await uploadPageBg('us', file)
    e.target.value = ''
  }

  const partnerUser = OTHER_USER[currentUser]
  const myMood      = getMood(currentUser)
  const partnerMood = getMood(partnerUser)

  const isSeval      = currentUser === 'seval'
  const primaryColor = isSeval ? '#8b5cf6' : '#14b8a6'
  const lightBg      = isSeval ? 'bg-seval-50' : 'bg-mateo-50'

  const [showNoteForm,      setShowNoteForm]      = useState(false)
  const [noteContent,       setNoteContent]       = useState('')
  const [noteSent,          setNoteSent]          = useState(false)
  const [showCountdownForm, setShowCountdownForm] = useState(false)
  const [cdTitle, setCdTitle] = useState('')
  const [cdDate, setCdDate]   = useState('')
  const [cdEmoji, setCdEmoji] = useState('🎉')

  // Emotion popup
  const [moodPopup, setMoodPopup]       = useState(false)
  const [pendingMood, setPendingMood]   = useState<MoodType | null>(null)
  const [moodMessage, setMoodMessage]   = useState('')
  const [moodVisible, setMoodVisible]   = useState(false)

  function openMoodPopup(mood: MoodType) {
    setPendingMood(mood)
    setMoodMessage(myMood?.note ?? '')
    setMoodPopup(true)
  }

  function saveMood() {
    if (!pendingMood) return
    setMood(pendingMood, moodMessage.trim() || undefined)
    setMoodPopup(false)
    setMoodVisible(false)
    setPendingMood(null)
    setMoodMessage('')
  }

  function handleSendNote() {
    if (!noteContent.trim()) return
    sendPartnerNote(noteContent.trim())
    setNoteContent('')
    setNoteSent(true)
    setTimeout(() => {
      setNoteSent(false)
      setShowNoteForm(false)
    }, 1600)
  }

  function handleAddCountdown() {
    if (!cdTitle.trim() || !cdDate) return
    addCountdown(cdTitle.trim(), cdDate, cdEmoji)
    setCdTitle('')
    setCdDate('')
    setCdEmoji('🎉')
    setShowCountdownForm(false)
  }

  const sortedCountdowns = [...countdowns].sort((a, b) => {
    const da = getDaysUntil(a.date)
    const db = getDaysUntil(b.date)
    return da - db
  })

  return (
    <div
      className="min-h-screen px-4 pt-14 relative"
      style={pageBg ? { backgroundImage: `url(${pageBg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      {pageBg && <div className="fixed inset-0 bg-white/85 backdrop-blur-sm z-0 pointer-events-none" />}
      <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgPick} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Our Space</h1>
          <p className="text-sm text-gray-400 mt-0.5">just the two of you 💕</p>
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
              onClick={() => setPageBg('us', null)}
              className="w-8 h-8 rounded-full bg-white/80 shadow-card flex items-center justify-center text-gray-400 active:bg-gray-100"
              title="Remove background"
            >
              <X size={13} />
            </button>
          )}
          <button
            onClick={() => { setCurrentUser(null); router.replace('/') }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                       text-gray-400 bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>

      {/* Remaining content above overlay */}
      <div className="relative z-10">

      {/* Leave a Note button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowNoteForm(true)}
        className="w-full flex items-center gap-3 rounded-3xl px-5 py-4 mb-6 text-left
                   active:opacity-90 transition-opacity"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}22, ${primaryColor}0a)`,
          border: `1.5px solid ${primaryColor}30`,
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xl"
          style={{ background: `${primaryColor}20` }}
        >
          💌
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800">Leave a Note</p>
          <p className="text-xs text-gray-400 truncate">
            Send {USERS[OTHER_USER[currentUser]].displayName} a little love message
          </p>
        </div>
        <Send size={16} style={{ color: primaryColor }} className="shrink-0" />
      </motion.button>

      {/* Mood section */}
      <section className="mb-7">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          How we feel today
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {([currentUser, partnerUser] as UserName[]).map(uid => {
            const u    = USERS[uid]
            const mood = getMood(uid)
            const isMe = uid === currentUser
            const color = uid === 'seval' ? '#8b5cf6' : '#14b8a6'
            const bg    = uid === 'seval' ? 'bg-seval-50' : 'bg-mateo-50'

            return (
              <div
                key={uid}
                className={cn('rounded-3xl p-4 text-center', bg)}
              >
                <div className="text-2xl mb-1">{u.emoji}</div>
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  {isMe ? 'You' : u.displayName}
                </p>
                {mood ? (
                  <div>
                    <span className="text-2xl">{MOOD_CONFIG[mood.mood].emoji}</span>
                    <p className="text-xs text-gray-500 mt-1">{MOOD_CONFIG[mood.mood].label}</p>
                    {mood.note && (
                      <p className="text-[10px] text-gray-400 italic mt-1 leading-snug line-clamp-2">
                        &ldquo;{mood.note}&rdquo;
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-300 italic">not set yet</p>
                )}
              </div>
            )
          })}
        </div>

        {/* Show note if present */}
        {myMood?.note && (
          <p className="text-xs text-gray-400 italic mt-1 mb-3 px-1">
            &ldquo;{myMood.note}&rdquo;
          </p>
        )}

        {/* Set my mood – hover/tap to reveal */}
        <div
          onMouseEnter={() => setMoodVisible(true)}
          onMouseLeave={() => { if (!moodPopup) setMoodVisible(false) }}
        >
          <button
            onClick={() => setMoodVisible(v => !v)}
            className="flex items-center gap-1.5 mb-3 group/btn"
          >
            <span className="text-xs font-semibold text-gray-400 group-hover/btn:text-gray-500 transition-colors">
              How are you feeling?
            </span>
            <motion.span
              animate={{ rotate: moodVisible ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="text-gray-300 text-xs leading-none"
            >
              ▾
            </motion.span>
          </button>

          <AnimatePresence>
            {moodVisible && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="flex gap-2 flex-wrap"
              >
                {MOOD_TYPES.map(([type, cfg]) => (
                  <motion.button
                    key={type}
                    whileTap={{ scale: 0.88 }}
                    onClick={() => openMoodPopup(type)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all',
                      myMood?.mood === type
                        ? 'text-white shadow-sm'
                        : 'bg-white text-gray-600 shadow-card'
                    )}
                    style={myMood?.mood === type ? { background: primaryColor } : {}}
                  >
                    <span className="text-base">{cfg.emoji}</span>
                    {cfg.label}
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Emotion popup */}
      <AnimatePresence>
        {moodPopup && pendingMood && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoodPopup(false)}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-modal
                         max-w-lg mx-auto"
            >
              <div className="px-5 pt-4 pb-10">
                <div className="drag-handle" />

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-gray-800">How are you feeling?</h3>
                  <button
                    onClick={() => setMoodPopup(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Mood options */}
                <div className="flex justify-around mb-6">
                  {MOOD_TYPES.map(([type, cfg]) => (
                    <motion.button
                      key={type}
                      whileTap={{ scale: 0.88 }}
                      onClick={() => setPendingMood(type)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl transition-all',
                        pendingMood === type ? 'shadow-sm' : ''
                      )}
                      style={pendingMood === type ? { background: `${primaryColor}18` } : {}}
                    >
                      <span className="text-3xl">{cfg.emoji}</span>
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: pendingMood === type ? primaryColor : '#9ca3af' }}
                      >
                        {cfg.label}
                      </span>
                    </motion.button>
                  ))}
                </div>

                {/* Message */}
                <div
                  className={cn(
                    'rounded-2xl p-4 mb-5 transition-colors',
                    isSeval ? 'bg-seval-50' : 'bg-mateo-50'
                  )}
                >
                  <p className="text-xs font-semibold text-gray-400 mb-2">
                    {pendingMood === myMood?.mood ? 'Update your message' : 'Add a message'}{' '}
                    <span className="font-normal text-gray-300">(optional)</span>
                  </p>
                  <textarea
                    value={moodMessage}
                    onChange={e => setMoodMessage(e.target.value)}
                    placeholder={`Tell ${USERS[OTHER_USER[currentUser]].displayName} how you're feeling...`}
                    rows={3}
                    className="w-full text-sm text-gray-700 placeholder:text-gray-300 bg-transparent
                               outline-none resize-none"
                  />
                </div>

                {/* Save */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={saveMood}
                  className="w-full py-4 rounded-2xl text-white text-sm font-semibold"
                  style={{ background: primaryColor }}
                >
                  {MOOD_CONFIG[pendingMood].emoji} Share this feeling
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Countdowns */}
      <section className="mb-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Looking forward to...</h2>
          <button
            onClick={() => setShowCountdownForm(!showCountdownForm)}
            className="text-xs font-semibold flex items-center gap-1"
            style={{ color: primaryColor }}
          >
            <Plus size={14} />
            Add
          </button>
        </div>

        <AnimatePresence>
          {showCountdownForm && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className={cn('rounded-2xl p-4', lightBg)}>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={cdEmoji}
                    onChange={e => setCdEmoji(e.target.value)}
                    className="w-10 text-center text-xl bg-white rounded-xl p-1 outline-none shadow-card"
                    maxLength={2}
                  />
                  <input
                    type="text"
                    value={cdTitle}
                    onChange={e => setCdTitle(e.target.value)}
                    placeholder="Something to celebrate..."
                    autoFocus
                    className="flex-1 text-sm text-gray-700 placeholder:text-gray-400 bg-white
                               rounded-xl px-3 py-2 outline-none shadow-card"
                  />
                </div>
                <input
                  type="date"
                  value={cdDate}
                  onChange={e => setCdDate(e.target.value)}
                  className="w-full text-sm text-gray-600 bg-white rounded-xl px-3 py-2 mb-3
                             outline-none shadow-card"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCountdownForm(false)}
                    className="flex-1 py-2 rounded-xl bg-white text-gray-500 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCountdown}
                    disabled={!cdTitle.trim() || !cdDate}
                    className="flex-1 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
                    style={{ background: primaryColor }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {sortedCountdowns.length === 0 ? (
          <div className="rounded-2xl bg-white shadow-card p-5 text-center">
            <p className="text-2xl mb-2">⏳</p>
            <p className="text-sm text-gray-400">Nothing yet — add something to look forward to 🌙</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {sortedCountdowns.map(cd => {
                const days = getDaysUntil(cd.date)
                const isPast = days < 0

                return (
                  <motion.div
                    key={cd.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-2xl p-4 shadow-card flex items-center gap-3 group"
                  >
                    <span className="text-2xl shrink-0">{cd.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{cd.title}</p>
                      <p className="text-xs text-gray-400">{formatDate(cd.date)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {isPast ? (
                        <p className="text-xs text-gray-300">Passed</p>
                      ) : days === 0 ? (
                        <p className="text-sm font-bold" style={{ color: primaryColor }}>
                          Today!
                        </p>
                      ) : (
                        <>
                          <p className="text-xl font-bold text-gray-800">{days}</p>
                          <p className="text-[10px] text-gray-400">days</p>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => deleteCountdown(cd.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 active:text-red-400
                                 transition-all ml-1"
                    >
                      <Trash2 size={15} />
                    </button>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Leave a Note compose sheet */}
      <AnimatePresence>
        {showNoteForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!noteSent) { setShowNoteForm(false); setNoteContent('') } }}
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[2rem] shadow-modal
                         max-w-lg mx-auto"
            >
              <div className="px-5 pt-4 pb-10">
                <div className="drag-handle" />

                <AnimatePresence mode="wait">
                  {noteSent ? (
                    /* Success state */
                    <motion.div
                      key="sent"
                      initial={{ opacity: 0, scale: 0.85 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-8 text-center"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.25, 1] }}
                        transition={{ repeat: 2, duration: 0.4 }}
                        className="text-5xl mb-4"
                      >
                        💌
                      </motion.div>
                      <p className="text-base font-bold text-gray-800 mb-1">Note sent!</p>
                      <p className="text-sm text-gray-400">
                        {USERS[OTHER_USER[currentUser]].displayName} will see it when they open the app 💕
                      </p>
                    </motion.div>
                  ) : (
                    /* Compose state */
                    <motion.div key="compose" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h3 className="text-base font-bold text-gray-800">Leave a Note 💌</h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            To {USERS[OTHER_USER[currentUser]].emoji}{' '}
                            {USERS[OTHER_USER[currentUser]].displayName}
                          </p>
                        </div>
                        <button
                          onClick={() => { setShowNoteForm(false); setNoteContent('') }}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      {/* Textarea */}
                      <div
                        className="rounded-2xl p-4 mb-4"
                        style={{ background: `${primaryColor}0d` }}
                      >
                        <textarea
                          value={noteContent}
                          onChange={e => setNoteContent(e.target.value)}
                          placeholder="Write something from the heart..."
                          rows={5}
                          autoFocus
                          className="w-full text-sm text-gray-700 placeholder:text-gray-300 bg-transparent
                                     outline-none resize-none leading-relaxed"
                        />
                      </div>

                      {/* Send button */}
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSendNote}
                        disabled={!noteContent.trim()}
                        className="w-full py-4 rounded-2xl text-white text-sm font-semibold
                                   disabled:opacity-40 flex items-center justify-center gap-2"
                        style={{ background: primaryColor }}
                      >
                        <Send size={15} />
                        Send with love 💌
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      </div>{/* end z-10 wrapper */}
    </div>
  )
}
