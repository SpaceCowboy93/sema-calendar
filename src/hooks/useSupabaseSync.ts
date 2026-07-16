'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import type { ShoppingList } from '@/types'

const COUPLE_ID   = 'sema'
const DEBOUNCE_MS = 800
const POLL_MS     = 5_000

// ── Sync status (module-level pub/sub) ──────────────────────────────────────
export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error'
let _status: SyncStatus = 'idle'
const _listeners = new Set<(s: SyncStatus) => void>()
function setStatus(s: SyncStatus) {
  _status = s
  _listeners.forEach(fn => fn(s))
}

export function useSyncStatus() {
  const [status, setLocal] = useState<SyncStatus>(_status)
  useEffect(() => {
    _listeners.add(setLocal)
    return () => { _listeners.delete(setLocal) }
  }, [])
  return { status }
}

// ── Manual pull trigger ──────────────────────────────────────────────────────
let _pullFn: (() => Promise<void>) | null = null
export function triggerPull() { _pullFn?.() }

// ── Helpers ──────────────────────────────────────────────────────────────────
function getSyncable(state: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(state).filter(([k, v]) => k !== 'currentUser' && typeof v !== 'function')
  )
}

// Robust timestamp comparison — handles "Z" vs "+00:00" format differences
function sameTimestamp(a: string | null, b: string | null): boolean {
  if (!a || !b) return false
  return new Date(a).getTime() === new Date(b).getTime()
}

// Deep merge shopping lists: union by list ID, union items by ID, prefer checked state
function mergeShoppingLists(remote: ShoppingList[], local: ShoppingList[]): ShoppingList[] {
  const remoteMap = new Map(remote.map(l => [l.id, l]))
  const localMap  = new Map(local.map(l => [l.id, l]))
  const result    = new Map<string, ShoppingList>()

  remoteMap.forEach((list, id) => result.set(id, list))

  localMap.forEach((localList, id) => {
    const remoteList = remoteMap.get(id)
    if (!remoteList) {
      result.set(id, localList)
    } else {
      const itemMap = new Map(remoteList.items.map(i => [i.id, i]))
      localList.items.forEach(item => {
        if (!itemMap.has(item.id)) {
          itemMap.set(item.id, item)
        } else {
          const remoteItem = itemMap.get(item.id)!
          if (item.isChecked && !remoteItem.isChecked) itemMap.set(item.id, item)
        }
      })
      const newerAt = remoteList.updatedAt > localList.updatedAt ? remoteList.updatedAt : localList.updatedAt
      const mergedItems: ShoppingList['items'] = []
      itemMap.forEach(item => mergedItems.push(item))
      result.set(id, { ...remoteList, items: mergedItems, updatedAt: newerAt })
    }
  })

  const lists: ShoppingList[] = []
  result.forEach(list => lists.push(list))
  return lists
}

// Union merge for simple arrays: local first, remote overwrites conflicts
function mergeArrayById(remote: unknown[], local: unknown[], idKey = 'id'): unknown[] {
  const map = new Map<string, unknown>()
  for (const item of local)  map.set((item as Record<string, string>)[idKey], item)
  for (const item of remote) map.set((item as Record<string, string>)[idKey], item)
  return Array.from(map.values())
}

// ── Main hook ────────────────────────────────────────────────────────────────
export function useSupabaseSync() {
  const isMerging = useRef(false)
  const isReady   = useRef(false)   // becomes true after initial load finishes
  const lastAt    = useRef<string | null>(null)
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null)

  function applyRemote(remoteState: Record<string, unknown>, updatedAt: string) {
    lastAt.current    = updatedAt
    isMerging.current = true

    const local = useAppStore.getState() as unknown as Record<string, unknown>
    const merged: Record<string, unknown> = { ...remoteState }

    const ARRAY_KEYS = ['events', 'todos', 'moods', 'loveNotes', 'wishlistItems',
                        'countdowns', 'memories', 'goals', 'partnerNotes',
                        'budgetItems', 'savingsGoals', 'savingsTransactions']
    for (const key of ARRAY_KEYS) {
      const r = Array.isArray(remoteState[key]) ? (remoteState[key] as unknown[]) : []
      const l = Array.isArray(local[key])       ? (local[key]       as unknown[]) : []
      merged[key] = mergeArrayById(r, l)
    }

    // financeMonths uses 'key' (YYYY-MM) as identifier instead of 'id'
    const rFM = Array.isArray(remoteState.financeMonths) ? (remoteState.financeMonths as unknown[]) : []
    const lFM = Array.isArray(local.financeMonths)       ? (local.financeMonths       as unknown[]) : []
    merged.financeMonths = mergeArrayById(rFM, lFM, 'key')

    const remoteShop = Array.isArray(remoteState.shoppingLists) ? (remoteState.shoppingLists as ShoppingList[]) : []
    const localShop  = Array.isArray(local.shoppingLists)       ? (local.shoppingLists       as ShoppingList[]) : []
    merged.shoppingLists = mergeShoppingLists(remoteShop, localShop)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAppStore.setState(merged as any)
    isMerging.current = false
    setStatus('ok')
  }

  // ── 1. Initial load ────────────────────────────────────────────────────────
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    console.log('🔵 [Sync] Starting. Supabase URL:', url ?? 'MISSING — check Vercel env vars!')
    if (!url || url === 'https://placeholder.supabase.co') {
      console.error('🔴 [Sync] SUPABASE_URL is missing or placeholder. Sync will not work.')
      setStatus('error')
      isReady.current = true
      return
    }

    setStatus('syncing')
    supabase
      .from('couple_state')
      .select('state, updated_at')
      .eq('id', COUPLE_ID)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error('🔴 [Sync] Load error:', error.code, error.message)
          setStatus('error')
        } else if (data?.state && Object.keys(data.state).length > 0) {
          console.log('🟢 [Sync] Loaded. updated_at:', data.updated_at)
          applyRemote(data.state, data.updated_at)
        } else {
          console.log('🟡 [Sync] DB empty — ready to write')
          setStatus('ok')
        }
        isReady.current = true
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 2. Save on state change (debounced, only after initial load) ───────────
  useEffect(() => {
    const unsub = useAppStore.subscribe((rawState) => {
      if (isMerging.current || !isReady.current) return

      if (debounce.current) clearTimeout(debounce.current)
      debounce.current = setTimeout(async () => {
        const syncable = getSyncable(rawState as unknown as Record<string, unknown>)
        console.log('🟣 [Sync] Saving...')
        setStatus('syncing')

        const { data, error } = await supabase
          .from('couple_state')
          .upsert({ id: COUPLE_ID, state: syncable, updated_at: new Date().toISOString() })
          .select('updated_at')
          .single()

        if (error) {
          console.error('🔴 [Sync] Save error:', error.code, error.message)
          setStatus('error')
        } else {
          console.log('🟢 [Sync] Saved. updated_at:', data?.updated_at)
          lastAt.current = data?.updated_at ?? null
          setStatus('ok')
        }
      }, DEBOUNCE_MS)
    })

    return () => {
      unsub()
      if (debounce.current) clearTimeout(debounce.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 3. Poll every 5s ──────────────────────────────────────────────────────
  async function pull() {
    const { data, error } = await supabase
      .from('couple_state')
      .select('state, updated_at')
      .eq('id', COUPLE_ID)
      .maybeSingle()

    if (error) { console.error('🔴 [Sync] Poll error:', error.message); return }
    if (!data?.state) return

    if (sameTimestamp(data.updated_at, lastAt.current)) {
      console.log('🔄 [Sync] Poll: no change')
      return
    }

    console.log('🟢 [Sync] Poll: change detected, applying...')
    applyRemote(data.state, data.updated_at)
  }

  useEffect(() => {
    _pullFn = pull
    return () => { if (_pullFn === pull) _pullFn = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const timer = setInterval(pull, POLL_MS)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 4. Pull on foreground ─────────────────────────────────────────────────
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        console.log('👁️ [Sync] Foregrounded — pulling')
        pull()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 5. Realtime subscription ──────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('couple_state_rt')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'couple_state', filter: `id=eq.${COUPLE_ID}` },
        (payload) => {
          const remote = payload.new as { state: Record<string, unknown>; updated_at: string }
          if (!remote?.state) return
          if (sameTimestamp(remote.updated_at, lastAt.current)) {
            console.log('📡 [Sync] Realtime: own echo, skipping')
            return
          }
          console.log('📡 [Sync] Realtime: applying partner update')
          applyRemote(remote.state, remote.updated_at)
        }
      )
      .subscribe(s => console.log('📡 [Sync] Realtime status:', s))

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
