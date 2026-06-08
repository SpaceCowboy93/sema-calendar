'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { BottomNav } from '@/components/layout/BottomNav'
import { PartnerNoteNotification } from '@/components/PartnerNoteNotification'
import { useSupabaseSync } from '@/hooks/useSupabaseSync'
import { SyncStatusDot } from '@/components/SyncStatusDot'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const currentUser = useAppStore(s => s.currentUser)
  useSupabaseSync()

  useEffect(() => {
    if (currentUser === null) {
      router.replace('/')
    }
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
      <main className="h-full overflow-y-auto overscroll-none pb-20">
        {children}
      </main>
      <BottomNav />
      <PartnerNoteNotification />
      <SyncStatusDot />
    </div>
  )
}
