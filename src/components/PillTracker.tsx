'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { getTodayString } from '@/lib/utils'
import { PILL_SCHEDULE } from '@/lib/pills'
import { C2SectionLabel } from '@/components/ui/C2SectionLabel'

export function PillTracker() {
  const user = useAppStore(s => s.currentUser)
  const doses = useAppStore(s => s.pillDoses)
  const toggle = useAppStore(s => s.togglePillDose)
  const [today, setToday] = useState('')
  useEffect(() => {
    const refresh = () => setToday(getTodayString())
    refresh()
    const timer = setInterval(refresh, 1000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [])
  if (!user) return null
  return (
    <section className="pb-8">
      <C2SectionLabel as="h2" className="mb-3">Daily pills</C2SectionLabel>
      <p className="text-xs text-gray-500 mb-4">Your daily checklist · resets at midnight</p>
      <div className="grid grid-cols-2 gap-3">
        {PILL_SCHEDULE.map(({ pill, label }) => {
          const taken = doses.some(d => d.userId === user && d.date === today && d.pill === pill)
          return (
            <button key={pill} type="button" disabled={!today} aria-pressed={taken}
              onClick={() => toggle(pill)}
              aria-label={`Pill ${pill}, ${label}, ${taken ? 'taken; tap to undo' : 'not taken; tap to mark taken'}`}
              className="rounded-full border px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ background: taken ? '#E7F0E7' : '#FAE8E5', borderColor: taken ? '#A3B899' : '#D9A19A', color: taken ? '#426343' : '#9B4740' }}>
              <span className="flex items-center justify-between text-sm font-medium"><span>Pill {pill}</span><span>{taken ? '✓' : '○'}</span></span>
              <span className="block text-xs mt-1">{label} · {taken ? 'Taken' : 'Not taken'}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-gray-500 mt-3">Tap to mark taken. Tap again to undo. Enable notifications above for reminders.</p>
    </section>
  )
}
