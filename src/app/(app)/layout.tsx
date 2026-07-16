'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { BottomNav } from '@/components/layout/BottomNav'
import { PartnerNoteNotification } from '@/components/PartnerNoteNotification'
import { useSupabaseSync } from '@/hooks/useSupabaseSync'
import { useNotifications } from '@/hooks/useNotifications'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { FullCreateSheet } from '@/components/ui/FullCreateSheet'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router      = useRouter()
  const currentUser = useAppStore(s => s.currentUser)
  const isSeval     = currentUser === 'seval'
  const primary     = isSeval ? '#8b5cf6' : '#14b8a6'

  useSupabaseSync()
  useNotifications()
  usePushNotifications() // registers SW on every page load

  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [scrolling, setScrolling]       = useState(false)
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mainRef        = useRef<HTMLElement | null>(null)

  const handleScroll = useCallback(() => {
    setScrolling(true)
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    scrollTimerRef.current = setTimeout(() => setScrolling(false), 600)
  }, [])

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', handleScroll)
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current)
    }
  }, [handleScroll])

  useEffect(() => {
    if (currentUser === null) router.replace('/')
  }, [currentUser, router])

  if (currentUser === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-dvh overflow-hidden">
      <main ref={mainRef} className="h-full overflow-y-auto overscroll-none pb-24">
        {children}
      </main>

      <BottomNav />

      {/* Floating action button */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        animate={{
          scale:   scrolling ? 0.78 : 1,
          opacity: scrolling ? 0.35 : 1,
        }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        onClick={() => setQuickAddOpen(true)}
        className="fixed bottom-20 right-5 z-30 w-14 h-14 rounded-full
                   flex items-center justify-center text-white backdrop-blur-sm"
        style={{ background: primary, boxShadow: `0 4px 20px ${primary}55` }}
      >
        <motion.div
          animate={{ rotate: scrolling ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <Plus size={26} strokeWidth={2.5} />
        </motion.div>
      </motion.button>

      <PartnerNoteNotification />

      <FullCreateSheet
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        primary={primary}
      />
    </div>
  )
}
