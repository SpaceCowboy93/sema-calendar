'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import type { ShoppingList } from '@/types'

const COUPLE_ID   = 'sema'
const DEBOUNCE_MS = 800
const POLL_MS     = 4_000   // poll every 4s for faster sync

const SKIP_KEYS = new Set(['currentUser'])

// ── Module-level sync status ────────────────────────────────────────────────
export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error'

let _status: SyncStatus = 'idle'
let _lastSync: Date | null = null
const _listeners = new Set<(s: SyncStatus) => void>()

function setStatus(s: SyncStatus) {
  _status = s
  if (s === 'ok') _lastSync = new Date()
  _listeners.forEach(fn => fn(s))
}

export function useSyncStatus() {
  const [status, setLocalStatus] = useState<SyncStatus>(_status)
  useEffect(() => {
    _listeners.add(setLocalStatus)
    return () => { _listeners.delete(setLocalStatus) }
  }, [])
  return { status, lastSync: _lastSync }
}

// ── Module-level pull trigger (callable from any component) ─────────────────
let _pullFn: (() => Promise<void>) | null = null
export function triggerPull() { _pullFn?.() }

// ── Helpers ─────────────────────────────────────────────────────────────────
function getSyncableState(state: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(state).filter(([k, v]) => !SKIP_KEYS.has(k) && typeof v !== 'function')
  )
}

// Merge shopping lists by ID so both devices' lists survive
function mergeShoppingLists(remote: ShoppingList[], local: ShoppingList[]): ShoppingList[] {
  const remoteMap = new Map(remote.map(l => [l.id, l]))
  const localMap  = new Map(local.map(l => [l.id, l]))

  const result = new Map<string, ShoppingList>()

  // Start with remote
  for (const [id, list] of remoteMap) result.set(id, list)

  // Merge local lists
  for (const [id, localList] of localMap) {
    const remoteList = remoteMap.get(id)
    if (!remoteList) {
      // Local-only list (added offline) — keep it
      result.set(id, localList)
    } else {
      // Both sides have this list — union items by ID
      const itemMap = new Map(remoteList.items.map(i => [i.id, i]))
      for (const item of localList.items) {
        if (!itemMap.has(item.id)) {
          // Item only exists locally — add it
          itemMap.set(item.id, item)
        } else {
          // Item exists in both — prefer checked state (action is irreversible)
          const remoteItem = itemMap.get(item.id)!
          if (item.isChecked && !remoteItem.isChecked) {
            itemMap.set(item.id, item)
          }
        }
      }
      const newerUpdatedAt = remoteList.updatedAt > localList.updatedAt
        ? remoteList.updatedAt : localList.updatedAt
      result.set(id, { ...remoteList, items: Array.from(itemMap.values()), updatedAt: newerUpdatedAt })
    }
  }

  return Array.from(result.values())
}

// Merge generic arrays: take all unique IDs from both sides (remote wins for conflicts)
function mergeArrayById(
  remote: unknown[], local: unknown[], idKey = 'id'
): unknown[] {
  const map = new Map<string, unknown>()
  for (const item of local)  map.set((item as Record<string,string>)[idKey], item)
  for (const item of remote) map.set((item as Record<string,string>)[idKey], item) // remote overwrites
  return Array.from(map.values())
}

async function fetchRemote() {
  const { data, error } = await supabase
    .from('couple_state')
    .select('state, updated_at')
    .eq('id', COUPLE_ID)
    .maybeSingle()
  if (error) {
    console.error('[Sync] READ ERROR:', error.code, error.message)
    setStatus('error')
    return null
  }
  console.log('[Sync] read ok —', data?.updated_at ?? 'empty')
  return data as { state: Record<string, unknown>; updated_at: string } | null
}

async function writeRemote(syncable: Record<string, unknown>): Promise<string | null> {
  const updated_at = new Date().toISOString()
  setStatus('syncing')
  const { data, error } = await supabase
    .from('couple_state')
    .upsert({ id: COUPLE_ID, state: syncable, updated_at })
    .select('updated_at')
    .single()
  if (error) {
    console.error('[Sync] WRITE ERROR:', error.code, error.message)
    setStatus('error')
    return null
  }
  console.log('[Sync] write ok —', data?.updated_at)
  setStatus('ok')
  return data?.updated_at ?? null
}

export function useSupabaseSync() {
  const isMerging   = useRef(false)
  const lastWriteMs = useRef(0)
  const lastRemoteAt = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function applyRemote(remoteState: Record<string, unknown>, updatedAt: string) {
    console.log('[Sync] applying remote state from', updatedAt)
    lastRemoteAt.current = updatedAt
    isMerging.current = true

    const local = useAppStore.getState() as unknown as Record<string, unknown>

    // Smart merge: union by ID for all arrays so offline changes survive
    const merged: Record<string, unknown> = { ...remoteState }

    const SIMPLE_ARRAY_KEYS = ['events','todos','moods','loveNotes','wishlistItems',
                                'countdowns','memories','goals','partnerNotes']
    for (const key of SIMPLE_ARRAY_KEYS) {
      const r = Array.isArray(remoteState[key]) ? (remoteState[key] as unknown[]) : []
      const l = Array.isArray(local[key])       ? (local[key]       as unknown[]) : []
      merged[key] = mergeArrayById(r, l)
    }

    // Shopping lists get special deep merge
    const remoteShop = Array.isArray(remoteState.shoppingLists)
      ? (remoteState.shoppingLists as ShoppingList[]) : []
    const localShop  = Array.isArray(local.shoppingLists)
      ? (local.shoppingLists  as ShoppingList[]) : []
    merged.shoppingLists = mergeShoppingLists(remoteShop, localShop)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAppStore.setState(merged as any)
    isMerging.current = false
    setStatus('ok')
  }

  async function pull() {
    if (Date.now() - lastWriteMs.current < 1500) return // short grace after our own write
    const data = await fetchRemote()
    if (!data?.state || Object.keys(data.state).length === 0) return
    if (data.updated_at === lastRemoteAt.current) {
      console.log('[Sync] no change since', lastRemoteAt.current)
      return
    }
    applyRemote(data.state, data.updated_at)
  }

  // Register pull so components can call triggerPull()
  useEffect(() => {
    _pullFn = pull
    return () => { if (_pullFn === pull) _pullFn = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 1. Initial hydration
  useEffect(() => {
    console.log('[Sync] init — URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING')
    fetchRemote().then(data => {
      if (!data) return
      if (data.state && Object.keys(data.state).length > 0) {
        applyRemote(data.state, data.updated_at)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2. Write on local state change (debounced)
  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      if (isMerging.current) return
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        const syncable = getSyncableState(state as unknown as Record<string, unknown>)
        console.log('[Sync] writing — shoppingLists count:',
          Array.isArray(syncable.shoppingLists) ? syncable.shoppingLists.length : 0)
        const savedAt = await writeRemote(syncable)
        if (savedAt) {
          lastWriteMs.current  = Date.now()
          lastRemoteAt.current = savedAt
        }
      }, DEBOUNCE_MS)
    })
    return () => {
      unsub()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 3. Poll every 4s
  useEffect(() => {
    const timer = setInterval(pull, POLL_MS)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 4. Pull on foreground
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        console.log('[Sync] foregrounded — pulling')
        pull()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 5. Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('couple_state_rt')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'couple_state', filter: `id=eq.${COUPLE_ID}` },
        (payload) => {
          if (Date.now() - lastWriteMs.current < 1500) {
            console.log('[Sync] realtime: skipping own echo')
            return
          }
          const remote = payload.new as { state: Record<string, unknown>; updated_at: string }
          if (!remote?.state || remote.updated_at === lastRemoteAt.current) return
          console.log('[Sync] realtime: applying update')
          applyRemote(remote.state, remote.updated_at)
        }
      )
      .subscribe(status => console.log('[Sync] realtime status:', status))
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
