'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { USERS, type UserName } from '@/types'

export default function LandingPage() {
  const router = useRouter()
  const currentUser = useAppStore(s => s.currentUser)

  useEffect(() => {
    if (currentUser) {
      router.replace('/calendar')
    }
  }, [currentUser, router])

  function handleSelect(user: UserName) {
    router.push(`/auth/${user}`)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Gradient background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse at 20% 50%, rgba(167,139,250,0.18) 0%, transparent 60%), ' +
            'radial-gradient(ellipse at 80% 50%, rgba(45,212,191,0.18) 0%, transparent 60%), ' +
            'linear-gradient(135deg, #f5f3ff 0%, #fefce8 50%, #f0fdfa 100%)',
        }}
      />

      {/* Decorative blobs */}
      <motion.div
        className="absolute top-16 left-8 w-32 h-32 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }}
        animate={{ scale: [1, 1.1, 1], x: [0, 6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-24 right-8 w-40 h-40 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, #2dd4bf, transparent)' }}
        animate={{ scale: [1, 1.08, 1], x: [0, -6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center w-full max-w-sm"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-2 text-5xl"
        >
          💕
        </motion.div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-800 mb-1">SeMa</h1>
        <p className="text-gray-400 text-sm mb-12 font-medium">our little world, together</p>

        {/* Profile cards */}
        <div className="flex gap-4 justify-center mb-12">
          {(['seval', 'mateo'] as UserName[]).map((name, i) => {
            const user = USERS[name]
            const isSeval = name === 'seval'
            return (
              <motion.button
                key={name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelect(name)}
                className="flex-1 flex flex-col items-center gap-3 py-7 px-4 rounded-3xl shadow-soft
                           bg-white border-2 transition-all active:shadow-md"
                style={{
                  borderColor: isSeval ? '#c4b5fd' : '#5eead4',
                }}
              >
                {/* Avatar */}
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-card"
                  style={{
                    background: isSeval
                      ? 'linear-gradient(135deg, #ede9fe, #ddd6fe)'
                      : 'linear-gradient(135deg, #ccfbf1, #99f6e4)',
                  }}
                >
                  {user.emoji}
                </div>

                <div>
                  <p className="font-semibold text-gray-800 text-base">{user.displayName}</p>
                  <p
                    className="text-xs font-medium mt-0.5"
                    style={{ color: isSeval ? '#8b5cf6' : '#14b8a6' }}
                  >
                    tap to sign in
                  </p>
                </div>
              </motion.button>
            )
          })}
        </div>

        <p className="text-xs text-gray-300 font-medium">made with love, just for you two</p>
      </motion.div>
    </div>
  )
}
