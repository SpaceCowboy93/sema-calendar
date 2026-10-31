'use client'

import { useState } from 'react'
import { differenceInCalendarDays, isValid, parseISO, format } from 'date-fns'
import type { Countdown } from '@/types'
import { useIOSDevice } from '@/hooks/useIOSDevice'
import { RELATIONSHIP_START_DATE } from '@/lib/relationship'
import { C2Sheet, C2SheetHeader, C2SheetBody } from './C2Sheet'

/** Read the configured relationship origin and optional milestones without writes. */
export function DaysTogetherCard({ countdowns, className = '' }: { countdowns: Countdown[]; className?: string }) {
  const ios = useIOSDevice()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState('relationship-start')
  const today = new Date()
  const milestones = [{ id: 'relationship-start', title: 'Our story began', date: RELATIONSHIP_START_DATE }, ...countdowns].filter(c => {
    const date = parseISO(c.date + 'T12:00:00')
    return isValid(date) && differenceInCalendarDays(today, date) >= 0
  })
  const milestone = milestones.find(c => c.id === selected)
  const days = milestone ? differenceInCalendarDays(today, parseISO(milestone.date + 'T12:00:00')) : null
  if (!ios) return null
  return <>
    <button type="button" aria-label="Days together" onClick={() => setOpen(true)}
      className={`c2-card w-full px-4 py-4 text-left min-h-11 ${className}`}>
      <span className="block text-sm font-semibold text-gray-800">Days together</span>
      <span className="block text-sm text-gray-500 mt-1">{days === null ? 'Tap to count from a milestone' : `${days.toLocaleString()} days · ${milestone!.title}`}</span>
    </button>
    <C2Sheet open={open} onClose={() => setOpen(false)} aria-label="Days together">
      <C2SheetHeader title="Days together" onClose={() => setOpen(false)} />
      <C2SheetBody className="py-4 space-y-4">
        {milestones.length ? <>
          <label className="block text-sm text-gray-600">Count from
            <select aria-label="Count days from" value={selected} onChange={event => setSelected(event.target.value)} className="block w-full min-w-0 mt-1 rounded-xl bg-white px-3 py-3">
              <option value="">Choose your start milestone</option>
              {milestones.map(c => <option key={c.id} value={c.id}>{c.title} · {c.date}</option>)}
            </select>
          </label>
          {days !== null && <div role="status" className="rounded-2xl bg-teal-50 px-4 py-6 text-center">
            <p className="text-4xl font-bold text-teal-700">{days.toLocaleString()}</p>
            <p className="text-sm font-semibold text-teal-700 mt-1">{days === 1 ? 'day together' : 'days together'}</p>
            <p className="text-xs text-gray-500 mt-2">Since {format(parseISO(milestone!.date), 'd MMMM yyyy')} · {milestone!.title}</p>
          </div>}
        </> : <p className="text-sm text-gray-600">Add your original relationship start date in Us → Milestones, then choose it here to see your total days together.</p>}
      </C2SheetBody>
    </C2Sheet>
  </>
}
