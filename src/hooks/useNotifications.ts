'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'

// Reminder offsets in milliseconds → label used in message
const REMINDERS = [
  {
    ms: 24 * 60 * 60 * 1000,
    message: (title: string) => `Tomorrow: ${title} 💞`,
  },
  {
    ms: 3 * 60 * 60 * 1000,
    message: (title: string) => `In 3 hours: ${title} 🌸`,
  },
  {
    ms: 60 * 60 * 1000,
    message: (title: string) => `1 hour until your moment — ${title} 🌊`,
  },
  {
    ms: 10 * 60 * 1000,
    message: (title: string) => `Starting in 10 minutes… ${title} 💫`,
  },
  {
    ms: 0,
    message: (title: string) => `It's starting now — ${title} 💞`,
  },
]

// Max scheduling window — only schedule notifications within 25 hours
const MAX_MS = 25 * 60 * 60 * 1000

interface TimedItem { title: string; datetime: Date }

function collectTimedItems(): TimedItem[] {
  const { events, todos, goals, wishlistItems } = useAppStore.getState()
  const items: TimedItem[] = []

  events.forEach(e => {
    if (e.date && e.startTime) {
      items.push({ title: e.title, datetime: new Date(`${e.date}T${e.startTime}:00`) })
    }
  })

  todos.forEach(t => {
    if (!t.isCompleted && t.date && t.startTime) {
      items.push({ title: t.title, datetime: new Date(`${t.date}T${t.startTime}:00`) })
    }
  })

  goals.forEach(g => {
    if (!g.isCompleted && g.targetDate && g.startTime) {
      items.push({ title: g.title, datetime: new Date(`${g.targetDate}T${g.startTime}:00`) })
    }
  })

  wishlistItems.forEach(w => {
    if (!w.isCompleted && w.date && w.startTime) {
      items.push({ title: w.title, datetime: new Date(`${w.date}T${w.startTime}:00`) })
    }
  })

  return items
}

function fireNotification(body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification('SeMa 💕', { body, icon: '/favicon.ico', badge: '/favicon.ico' })
  } catch {
    // Notifications not supported in this context
  }
}

export function useNotifications() {
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([])

  function clearAll() {
    timerIds.current.forEach(clearTimeout)
    timerIds.current = []
  }

  function scheduleAll() {
    clearAll()
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    const now   = Date.now()
    const items = collectTimedItems()

    items.forEach(item => {
      const eventMs = item.datetime.getTime()

      REMINDERS.forEach(reminder => {
        const fireAt = eventMs - reminder.ms
        const delay  = fireAt - now

        // Only schedule if in the future and within 25h window
        if (delay <= 0 || delay > MAX_MS) return

        const id = setTimeout(
          () => fireNotification(reminder.message(item.title)),
          delay
        )
        timerIds.current.push(id)
      })
    })
  }

  useEffect(() => {
    // Request permission on first mount (only prompts if 'default')
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(() => scheduleAll())
    } else {
      scheduleAll()
    }

    // Re-schedule whenever state changes
    const unsub = useAppStore.subscribe(scheduleAll)

    // Re-schedule when app comes back to foreground
    function onVisibility() {
      if (document.visibilityState === 'visible') scheduleAll()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearAll()
      unsub()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
