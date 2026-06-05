'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, LogOut, Settings, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { USERS, OTHER_USER, type UserName } from '@/types'
import { MOOD_CONFIG, getDaysUntil, formatDate, cn } from '@/lib/utils'

const MOOD_TYPES = Object.entries(MOOD_CONFIG) as [
  keyof typeof MOOD_CONFIG,
  { emoji: string; label: string }
][]

export default function UsPage() {
  const router = useRouter()
  const currentUser = useAppStore(s => s.currentUser)!
  const signOut     = useAppStore(s => s.signOut)
  const getMood     = useAppStore(s => s.getMoodForUser)
  const setMood     = useAppStore(s => s.setMood)
  const countdowns  = useAppStore(s => s.countdowns)
  const addCountdown = useAppStore(s => s.addCountdown)
  const deleteCountdown = useAppStore(s => s.deleteCountdown)
  const changePassword  = useAppStore(s => s.changePassword)

  const partnerUser = OTHER_USER[currentUser]
  const myMood      = getMood(currentUser)
  const partnerMood = getMood(partnerUser)

  const isSeval      = currentUser === 'seval'
  const primaryColor = isSeval ? '#8b5cf6' : '#14b8a6'
  const lightBg      = isSeval ? 'bg-seval-50' : 'bg-mateo-50'

  const [showCountdownForm, setShowCountdownForm] = useState(false)
  const [cdTitle, setCdTitle] = useState('')
  const [cdDate, setCdDate]   = useState('')
  const [cdEmoji, setCdEmoji] = useState('🎉')

  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  function handleAddCountdown() {
    if (!cdTitle.trim() || !cdDate) return
    addCountdown(cdTitle.trim(), cdDate, cdEmoji)
    setCdTitle('')
    setCdDate('')
    setCdEmoji('🎉')
    setShowCountdownForm(false)
  }

  function handleChangePassword() {
    if (!newPassword.trim()) return
    changePassword(currentUser, newPassword.trim())
    setNewPassword('')
    setPasswordSaved(true)
    setTimeout(() => { setPasswordSaved(false); setShowPasswordForm(false) }, 1500)
  }

  const sortedCountdowns = [...countdowns].sort((a, b) => {
    const da = getDaysUntil(a.date)
    const db = getDaysUntil(b.date)
    return da - db
  })

  return (
    <div className="min-h-screen px-4 pt-14">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Our Space</h1>
          <p className="text-sm text-gray-400 mt-0.5">moods, countdowns & more</p>
        </div>
        <button
          onClick={() => { signOut(); router.replace('/') }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
                     text-gray-400 bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>

      {/* Mood section */}
      <section className="mb-7">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Today&apos;s Mood
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
                  </div>
                ) : (
                  <p className="text-xs text-gray-300 italic">not set yet</p>
                )}
              </div>
            )
          })}
        </div>

        {/* Set my mood */}
        <p className="text-xs font-semibold text-gray-400 mb-2">How are you feeling?</p>
        <div className="flex gap-2 flex-wrap">
          {MOOD_TYPES.map(([type, cfg]) => (
            <motion.button
              key={type}
              whileTap={{ scale: 0.88 }}
              onClick={() => setMood(type)}
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
        </div>
      </section>

      {/* Countdowns */}
      <section className="mb-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Countdowns</h2>
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
                    placeholder="Event name..."
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
            <p className="text-sm text-gray-400">No countdowns yet — add one above</p>
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

      {/* Settings */}
      <section className="mb-12">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Settings</h2>

        <button
          onClick={() => setShowPasswordForm(!showPasswordForm)}
          className="w-full flex items-center gap-3 bg-white rounded-2xl p-4 shadow-card mb-2
                     active:bg-gray-50 transition-colors"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: lightBg.replace('bg-', '#') }}
          >
            <Lock size={16} style={{ color: primaryColor }} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-gray-700">Change Password</p>
            <p className="text-xs text-gray-400">Update your login password</p>
          </div>
        </button>

        <AnimatePresence>
          {showPasswordForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className={cn('rounded-2xl p-4 mb-2', lightBg)}>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="New password"
                  autoFocus
                  className="input-field mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowPasswordForm(false); setNewPassword('') }}
                    className="flex-1 py-2.5 rounded-2xl bg-white text-gray-500 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={!newPassword.trim()}
                    className="flex-1 py-2.5 rounded-2xl text-white text-sm font-semibold disabled:opacity-40"
                    style={{ background: primaryColor }}
                  >
                    {passwordSaved ? '✓ Saved' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  )
}
