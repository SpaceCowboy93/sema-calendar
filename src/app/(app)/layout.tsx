'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { BottomNav } from '@/components/layout/BottomNav'
import { PartnerNoteNotification } from '@/components/PartnerNoteNotification'
import { useSupabaseSync } from '@/hooks/useSupabaseSync'
import { QuickAddSheet } from '@/components/ui/QuickAddSheet'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router      = useRouter()
  const currentUser = useAppStore(s => s.currentUser)
  const isSeval     = currentUser === 'seval'
  const primary     = isSeval ? '#8b5cf6' : '#14b8a6'

  useSupabaseSync()

  const [quickAddOpen, setQuickAddOpen] = useState(false)

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
      <main className="h-full overflow-y-auto overscroll-none pb-24">
        {children}
      </main>

      <BottomNav />

      {/* Floating action button */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setQuickAddOpen(true)}
        className="fixed bottom-20 right-5 z-30 w-14 h-14 rounded-full shadow-lg
                   flex items-center justify-center text-white"
        style={{ background: primary, boxShadow: `0 4px 20px ${primary}60` }}
      >
        <Plus size={26} strokeWidth={2.5} />
      </motion.button>

      <PartnerNoteNotification />

      <QuickAddSheet
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        primary={primary}
      />
    </div>
  )
}
