'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { UserName } from '@/types'

export type PushStatus = 'unsupported' | 'denied' | 'default' | 'subscribed'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  const buf     = new ArrayBuffer(raw.length)
  const view    = new DataView(buf)
  for (let i = 0; i < raw.length; i++) view.setUint8(i, raw.charCodeAt(i))
  return buf
}

async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  } catch {
    return null
  }
}

async function getCurrentSub(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  try {
    const reg = await navigator.serviceWorker.ready
    return reg.pushManager.getSubscription()
  } catch {
    return null
  }
}

export function usePushNotifications() {
  const currentUser = useAppStore(s => s.currentUser)
  const [status, setStatus] = useState<PushStatus>('default')
  const [loading, setLoading] = useState(false)
  const [swReady, setSwReady] = useState(false)

  // Register SW and determine initial status
  useEffect(() => {
    if (typeof window === 'undefined') return

    ;(async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('unsupported')
        return
      }
      await registerSW()
      setSwReady(true)

      if (Notification.permission === 'denied') { setStatus('denied'); return }

      const sub = await getCurrentSub()
      if (sub) {
        setStatus('subscribed')
      } else if (Notification.permission === 'granted') {
        setStatus('default') // granted but not subscribed yet
      } else {
        setStatus('default')
      }
    })()
  }, [])

  // Sync reminders whenever user subscribes or store changes
  const syncReminders = useCallback(async (userName: UserName) => {
    try {
      const store = useAppStore.getState()
      const items = collectDatedItems(store, userName)
      if (items.length === 0) return
      await fetch('/api/push/sync-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, items }),
      })
    } catch { /* non-fatal */ }
  }, [])

  const enable = useCallback(async () => {
    if (!swReady || !currentUser) return
    setLoading(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { setStatus(perm === 'denied' ? 'denied' : 'default'); return }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) { console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY not set'); return }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), userName: currentUser }),
      })

      if (res.ok) {
        setStatus('subscribed')
        await syncReminders(currentUser)
      }
    } catch (err) {
      console.error('Push enable error:', err)
    } finally {
      setLoading(false)
    }
  }, [swReady, currentUser, syncReminders])

  const disable = useCallback(async () => {
    setLoading(true)
    try {
      const sub = await getCurrentSub()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus('default')
    } catch { /* non-fatal */ } finally {
      setLoading(false)
    }
  }, [])

  return { status, loading, enable, disable, syncReminders }
}

/* ── Collect all dated items from store state ─────────────────────────────── */
interface DatedItem {
  id: string
  type: 'event' | 'todo' | 'goal' | 'wishlist' | 'countdown'
  title: string
  fireAts: string[] // UTC ISO strings
}

function computeFireAts(dateStr: string, timeStr: string): string[] {
  const eventMs = new Date(`${dateStr}T${timeStr}:00`).getTime()
  const now     = Date.now()

  // Day before at 8 PM local time
  const dayBefore = new Date(`${dateStr}T${timeStr}:00`)
  dayBefore.setDate(dayBefore.getDate() - 1)
  dayBefore.setHours(20, 0, 0, 0)

  const candidates = [
    dayBefore.getTime(),
    eventMs - 60 * 60 * 1000,   // 1 hour before
    eventMs - 5 * 60 * 1000,    // 5 minutes before
  ]

  return candidates
    .filter(ms => ms > now)
    .map(ms => new Date(ms).toISOString())
}

function collectDatedItems(
  store: ReturnType<typeof useAppStore.getState>,
  userName: UserName
): DatedItem[] {
  const items: DatedItem[] = []

  store.events.forEach(e => {
    if (e.date && e.startTime) {
      const fireAts = computeFireAts(e.date, e.startTime)
      if (fireAts.length) items.push({ id: e.id, type: 'event', title: e.title, fireAts })
    }
  })

  store.todos.forEach(t => {
    if (!t.isCompleted && t.date && t.startTime) {
      const fireAts = computeFireAts(t.date, t.startTime)
      if (fireAts.length) items.push({ id: t.id, type: 'todo', title: t.title, fireAts })
    }
  })

  store.goals.forEach(g => {
    if (!g.isCompleted && g.targetDate && g.startTime) {
      const fireAts = computeFireAts(g.targetDate, g.startTime)
      if (fireAts.length) items.push({ id: g.id, type: 'goal', title: g.title, fireAts })
    }
  })

  store.wishlistItems.forEach(w => {
    if (!w.isCompleted && w.date && w.startTime) {
      const fireAts = computeFireAts(w.date, w.startTime)
      if (fireAts.length) items.push({ id: w.id, type: 'wishlist', title: w.title, fireAts })
    }
  })

  store.countdowns.forEach(c => {
    if (c.date) {
      const fireAts = computeFireAts(c.date, '09:00')
      if (fireAts.length) items.push({ id: c.id, type: 'countdown', title: c.title, fireAts })
    }
  })

  return items
}
