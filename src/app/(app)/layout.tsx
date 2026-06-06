'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useAppStore'
import { BottomNav } from '@/components/layout/BottomNav'
import { PartnerNoteNotification } from '@/components/PartnerNoteNotification'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const currentUser = useAppStore(s => s.currentUser)

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
    <div className="min-h-screen bg-gray-50">
      <main className="pb-24">
        {children}
      </main>
      <BottomNav />
      <PartnerNoteNotification />
    </div>
  )
}
