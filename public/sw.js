/* SeMa Service Worker — v2
 *
 * Changes from v1:
 * - Stores the active userName in IndexedDB so pushsubscriptionchange can
 *   re-save a renewed subscription under the correct user (fixes BUG-1/BUG-5).
 * - skipWaiting() on install + clients.claim() on activate so new SW versions
 *   take effect immediately.
 * - renotify changed from true to false to reduce notification noise on repeat
 *   deliveries with the same tag.
 */

// ── Identity storage ──────────────────────────────────────────────────────────
// We store only the non-sensitive profile name ('mateo' or 'seval') so that
// pushsubscriptionchange can re-save the renewed subscription without the
// client needing to intervene.  No auth tokens or personal data are stored.

const SW_DB_NAME    = 'sema-sw-identity'
const SW_DB_VERSION = 1
const SW_STORE      = 'identity'

let _cachedUserName = null  // in-memory cache; survives while SW is alive

function openIdentityDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SW_DB_NAME, SW_DB_VERSION)
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(SW_STORE)
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror   = e => reject(e.target.error)
  })
}

async function persistUserName(name) {
  _cachedUserName = name
  try {
    const db = await openIdentityDB()
    const tx = db.transaction(SW_STORE, 'readwrite')
    tx.objectStore(SW_STORE).put(name, 'userName')
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej })
    db.close()
  } catch (err) {
    console.warn('[SW] persistUserName failed:', err?.message ?? String(err))
  }
}

async function loadUserName() {
  if (_cachedUserName) return _cachedUserName
  try {
    const db     = await openIdentityDB()
    const tx     = db.transaction(SW_STORE, 'readonly')
    const result = await new Promise((res, rej) => {
      const req    = tx.objectStore(SW_STORE).get('userName')
      req.onsuccess = e => res(e.target.result ?? null)
      req.onerror   = e => rej(e.target.error)
    })
    db.close()
    if (result) _cachedUserName = result
    return result
  } catch (err) {
    console.warn('[SW] loadUserName failed:', err?.message ?? String(err))
    return null
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

self.addEventListener('install', () => {
  // Activate the new SW immediately without waiting for existing clients to close.
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  // Take control of all existing clients without requiring a page reload.
  event.waitUntil(self.clients.claim())
})

// ── Message from client ───────────────────────────────────────────────────────
// After a successful PushManager.subscribe(), the React client posts:
//   { type: 'SET_USER', userName: 'mateo' | 'seval' }
// This anchors the subscription identity so renewal works correctly.

self.addEventListener('message', event => {
  if (event.data?.type === 'SET_USER' && typeof event.data.userName === 'string') {
    const name = event.data.userName.toLowerCase()
    persistUserName(name)
      .then(() => console.log('[SW] Identity stored for:', name))
      .catch(err => console.warn('[SW] Failed to store identity:', err?.message ?? String(err)))
  }
})

// ── Push notification received ────────────────────────────────────────────────

self.addEventListener('push', event => {
  if (!event.data) return
  let payload
  try { payload = event.data.json() } catch { payload = { title: 'SeMa', body: event.data.text() } }

  const { title = 'SeMa 💕', body = '', url = '/', tag = 'sema' } = payload

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon:     '/icons/icon-192.png',
      badge:    '/icons/icon-192.png',
      tag,
      renotify: false,   // do not re-alert if same tag already on screen
      data:     { url },
    })
  )
})

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(list => {
        for (const c of list) {
          if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus()
        }
        return clients.openWindow(url)
      })
  )
})

// ── Subscription renewal ──────────────────────────────────────────────────────
// Browsers auto-renew push subscriptions roughly every 60–90 days.
// We must save the new endpoint under the correct userName so the cron
// continues delivering to this device.
//
// Renewal flow:
//  1. Load userName from IndexedDB (set when the user first subscribed).
//  2. Re-subscribe with the same VAPID key from the old subscription.
//  3. POST the new subscription to /api/push/subscribe with the stored userName.
//  4. If userName is unknown, log a clear warning; user will need to reconnect.

self.addEventListener('pushsubscriptionchange', event => {
  event.waitUntil(
    (async () => {
      const userName = await loadUserName()

      if (!userName) {
        console.warn(
          '[SW] pushsubscriptionchange — no stored identity found. ' +
          'Subscription was NOT re-saved. Open the app and reconnect notifications.'
        )
        return
      }

      const vapidKey = event.oldSubscription?.options?.applicationServerKey
      if (!vapidKey) {
        console.warn(
          '[SW] pushsubscriptionchange — old VAPID key unavailable. ' +
          'Cannot auto-renew. Open the app and reconnect notifications.'
        )
        return
      }

      let newSub
      try {
        newSub = await self.registration.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: vapidKey,
        })
      } catch (err) {
        console.error('[SW] pushsubscriptionchange — re-subscribe failed:', err?.message ?? String(err))
        return
      }

      try {
        const res = await fetch('/api/push/subscribe', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ subscription: newSub.toJSON(), userName }),
        })
        if (res.ok) {
          console.log('[SW] pushsubscriptionchange — renewed subscription saved for', userName)
        } else {
          const data = await res.json().catch(() => ({}))
          console.error('[SW] pushsubscriptionchange — server rejected save:', data.error ?? res.status)
        }
      } catch (err) {
        console.error('[SW] pushsubscriptionchange — fetch failed:', err?.message ?? String(err))
      }
    })()
  )
})
