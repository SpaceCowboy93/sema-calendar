'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { USERS, type UserName } from '@/types'

export default function AuthPage() {
  const params = useParams()
  const router = useRouter()
  const signIn = useAppStore(s => s.signIn)

  const userName = params.user as UserName
  const user = USERS[userName]

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  if (!user) {
    router.replace('/')
    return null
  }

  const isSeval = userName === 'seval'
  const primaryColor = isSeval ? '#8b5cf6' : '#14b8a6'
  const lightBg = isSeval
    ? 'linear-gradient(135deg, #ede9fe, #ddd6fe)'
    : 'linear-gradient(135deg, #ccfbf1, #99f6e4)'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(false)
    setIsLoading(true)

    // Small delay for feel
    await new Promise(r => setTimeout(r, 400))

    const ok = signIn(userName, password)
    if (ok) {
      router.replace('/calendar')
    } else {
      setError(true)
      setIsLoading(false)
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen flex flex-col px-6 relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: isSeval
            ? 'radial-gradient(ellipse at 30% 40%, rgba(167,139,250,0.15) 0%, transparent 60%), #fafafa'
            : 'radial-gradient(ellipse at 70% 40%, rgba(45,212,191,0.15) 0%, transparent 60%), #fafafa',
        }}
      />

      {/* Back button */}
      <div className="pt-14 pb-4">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-500 active:opacity-70 transition-opacity"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col items-center justify-center pb-20"
      >
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mb-5 shadow-soft"
          style={{ background: lightBg }}
        >
          {user.emoji}
        </motion.div>

        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          Hey, {user.displayName}!
        </h1>
        <p className="text-gray-400 text-sm mb-10">enter your password to continue</p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false) }}
              placeholder="password"
              autoFocus
              className="input-field pr-12 text-center text-lg tracking-widest"
              style={{
                borderColor: error ? '#fca5a5' : undefined,
                background: error ? '#fff5f5' : undefined,
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-sm text-center"
              >
                Incorrect password, try again
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={!password || isLoading}
            whileTap={{ scale: 0.97 }}
            className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${isSeval ? '#7c3aed' : '#0d9488'})` }}
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              />
            ) : (
              'Sign In'
            )}
          </motion.button>
        </form>

        <p className="text-xs text-gray-300 mt-8">
          default: your name in lowercase
        </p>
      </motion.div>
    </div>
  )
}
