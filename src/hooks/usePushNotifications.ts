'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import type { UserName } from '@/types'

const LOG = (...args: unknown[]) => console.log('[Push]', ...args)
const ERR = (...args: unknown[]) => console.error('[Push]', ...args)

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
  if (!('serviceWorker' in navigator)) {
    ERR('serviceWorker not in navigator — unsupported browser')
    return null
  }
  try {
    LOG('Registering service worker /sw.js …')
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    LOG('SW registered — scope:', reg.scope, 'state:', reg.active?.state ?? 'installing')
    return reg
  } catch (err) {
    ERR('SW registration failed:', err)
    return null
  }
}

async function getCurrentSub(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    LOG('Existing subscription:', sub ? sub.endpoint.slice(-40) : 'none')
    return sub
  } catch (err) {
    ERR('getSubscription failed:', err)
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
      LOG('Init — userAgent:', navigator.userAgent.slice(0, 80))
      LOG('serviceWorker supported:', 'serviceWorker' in navigator)
      LOG('PushManager supported:', 'PushManager' in window)
      LOG('Notification.permission:', typeof Notification !== 'undefined' ? Notification.permission : 'N/A')

      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        LOG('Push unsupported on this browser/platform')
        setStatus('unsupported')
        return
      }

      const reg = await registerSW()
      if (!reg) {
        ERR('SW could not be registered — aborting push init')
        setStatus('unsupported')
        return
      }
      setSwReady(true)

      if (Notification.permission === 'denied') {
        LOG('Notification permission is denied')
        setStatus('denied')
        return
      }

      const sub = await getCurrentSub()
      if (sub) {
        LOG('Already subscribed — endpoint suffix:', sub.endpoint.slice(-40))
        setStatus('subscribed')
      } else {
        LOG('Not subscribed yet — permission:', Notification.permission)
        setStatus('default')
      }
    })()
  }, [])

  const syncReminders = useCallback(async (userName: UserName) => {
    try {
      const store = useAppStore.getState()
      const items = collectDatedItems(store, userName)
      LOG(`syncReminders — user: ${userName}, items with future fire times: ${items.length}`)
      items.forEach(item => {
        LOG(`  item "${item.title}" (${item.type}) — fireAts:`, item.fireAts)
      })
      if (items.length === 0) {
        LOG('syncReminders — nothing to sync (no future-dated items)')
        return
      }
      const res  = await fetch('/api/push/sync-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, items }),
      })
      const data = await res.json()
      LOG('syncReminders response:', res.status, data)
    } catch (err) {
      ERR('syncReminders failed:', err)
    }
  }, [])

  const enable = useCallback(async () => {
    if (!swReady || !currentUser) {
      ERR('enable() called but swReady:', swReady, 'currentUser:', currentUser)
      return
    }
    setLoading(true)
    try {
      LOG('Requesting notification permission …')
      const perm = await Notification.requestPermission()
      LOG('Permission result:', perm)
      if (perm !== 'granted') {
        setStatus(perm === 'denied' ? 'denied' : 'default')
        return
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        ERR('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set in environment')
        return
      }
      LOG('VAPID public key present — length:', vapidKey.length)

      LOG('Waiting for SW ready …')
      const reg = await navigator.serviceWorker.ready
      LOG('SW ready — scope:', reg.scope)

      LOG('Calling PushManager.subscribe() …')
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      LOG('PushManager.subscribe() succeeded')
      LOG('  endpoint suffix:', sub.endpoint.slice(-40))
      LOG('  p256dh present:', !!sub.toJSON().keys?.p256dh)
      LOG('  auth present:',   !!sub.toJSON().keys?.auth)

      LOG('Saving subscription to /api/push/subscribe …')
      const res  = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), userName: currentUser }),
      })
      const data = await res.json()
      LOG('/api/push/subscribe response:', res.status, data)

      if (res.ok) {
        setStatus('subscribed')
        await syncReminders(currentUser)
      } else {
        ERR('subscribe API returned error:', data)
      }
    } catch (err) {
      ERR('enable() error:', err)
    } finally {
      setLoading(false)
    }
  }, [swReady, currentUser, syncReminders])

  const disable = useCallback(async () => {
    setLoading(true)
    try {
      const sub = await getCurrentSub()
      if (sub) {
        LOG('Removing subscription …')
        const res = await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        LOG('DELETE /api/push/subscribe:', res.status)
        await sub.unsubscribe()
        LOG('sub.unsubscribe() done')
      } else {
        LOG('disable() — no active subscription found')
      }
      setStatus('default')
    } catch (err) {
      ERR('disable() error:', err)
    } finally {
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
  const timeNorm = /^\d{2}:\d{2}:\d{2}$/.test(timeStr) ? timeStr : `${timeStr}:00`
  const eventMs  = new Date(`${dateStr}T${timeNorm}`).getTime()
  const now      = Date.now()

  if (isNaN(eventMs)) {
    ERR('computeFireAts — invalid date/time:', dateStr, timeStr)
    return []
  }

  const dayBefore = new Date(`${dateStr}T${timeNorm}`)
  dayBefore.setDate(dayBefore.getDate() - 1)
  dayBefore.setHours(20, 0, 0, 0)

  const candidates = [
    { label: 'prev-day-8PM', ms: dayBefore.getTime() },
    { label: '1h-before',    ms: eventMs - 60 * 60 * 1000 },
    { label: '5min-before',  ms: eventMs - 5  * 60 * 1000 },
  ]

  const future = candidates.filter(c => c.ms > now)
  const skipped = candidates.filter(c => c.ms <= now)
  if (skipped.length) {
    LOG(`computeFireAts(${dateStr} ${timeStr}) — skipped past:`, skipped.map(c => c.label).join(', '))
  }

  return future.map(c => new Date(c.ms).toISOString())
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
      const fireAts = computeFireAts(c.date, c.time ?? '09:00')
      if (fireAts.length) items.push({ id: c.id, type: 'countdown', title: c.title, fireAts })
    }
  })

  return items
}
