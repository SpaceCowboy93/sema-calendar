'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import type { ShoppingList } from '@/types'
import { selectSharedState, type SharedState } from '@/lib/shared-state'
import { pendingKeys, persistPending, readSyncBase, persistSyncBase } from '@/lib/couple-cache'
import { rebaseSharedState, sameValue } from '@/lib/sync-merge'
import { isCurrentAuth, subscribeAuth, type AuthContext } from '@/lib/auth-session'

const DEBOUNCE_MS = 800
const POLL_MS     = 300_000

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
export function useSupabaseSync(context: AuthContext | null) {
  useEffect(() => {
    if (!context) { setStatus('idle'); return }
    let active = true
    let ready = false
    let applying = false
    const pending = pendingKeys(context)
    let base = readSyncBase(context)
    const defaults = selectSharedState(useAppStore.getInitialState())
    let dirty = pending.size > 0
    let saving = false
    let reading = false
    let revision = 0
    let lastAt: string | null = null
    let lastRemote: unknown
    let debounce: ReturnType<typeof setTimeout> | undefined
    const abort = new AbortController()
    const current = () => active && isCurrentAuth(context) && !abort.signal.aborted
    const cancelAuth = subscribeAuth(() => {
      if (!isCurrentAuth(context)) { abort.abort(); clearTimeout(debounce) }
    })

    function rememberBase(remote: Partial<SharedState>) {
      const next = { ...remote }
      for (const key of pending) {
        delete next[key]
        if (Object.prototype.hasOwnProperty.call(base, key)) Object.assign(next, { [key]: base[key] })
      }
      base = next
      persistSyncBase(context!, base)
    }

    function applyRemote(remoteValue: unknown, updatedAt: string) {
      const remote = { ...defaults, ...selectSharedState(remoteValue) }
      const local = selectSharedState(useAppStore.getState())
      const { state: merged, conflicts } = rebaseSharedState(base, local, remote, pending)
      // Clean fields are authoritative, not a union with stale cache entries.
      // Retain genuinely conflicting local work rather than resurrecting it remotely.
      for (const key of pending) {
        if (conflicts.includes(key)) Object.assign(merged, { [key]: local[key] })
        else {
          Object.assign(base, { [key]: remote[key] })
          if (sameValue(merged[key], remote[key])) pending.delete(key)
        }
      }
      dirty = pending.size > 0
      applying = true
      useAppStore.setState(merged)
      applying = false
      lastAt = updatedAt
      lastRemote = remoteValue
      rememberBase(remote)
      persistPending(context!, pending)
      return conflicts.length > 0
    }

    async function save() {
      if (!current() || !ready || reading || saving || !dirty) return
      saving = true
      const startingRevision = revision
      setStatus('syncing')
      try {
        // Read/rebase AND condition the write: a read followed by an unconditional
        // update still loses a partner's changes in the gap between requests.
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data: remoteRow, error: readError } = await supabase.from('couple_state')
            .select('state, updated_at').eq('id', context!.stateId).eq('couple_id', context!.coupleId)
            .abortSignal(abort.signal).maybeSingle()
          if (!current()) return
          if (readError || !remoteRow) { setStatus('error'); return }
          const local = selectSharedState(useAppStore.getState())
          const remote = { ...defaults, ...selectSharedState(remoteRow.state) }
          const merged = rebaseSharedState(base, local, remote, pending)
          if (merged.conflicts.length) { setStatus('error'); return }
          const sentKeys = new Set(pending)
          // Preserve unknown/legacy JSON fields, and always advance the version,
          // even for two saves in one millisecond or a slow local clock.
          const state = { ...remoteRow.state, ...merged.state }
          const updatedAt = new Date(Math.max(Date.now(), Date.parse(remoteRow.updated_at) + 1)).toISOString()
          const { data, error } = await supabase.from('couple_state')
            .update({ state, updated_at: updatedAt })
            .eq('id', context!.stateId).eq('couple_id', context!.coupleId)
            .eq('updated_at', remoteRow.updated_at)
            .select('updated_at').abortSignal(abort.signal).maybeSingle()
          if (!current()) return
          if (error) { setStatus('error'); return }
          if (!data) continue // Another writer won; reread and rebase, bounded above.
          const latest = selectSharedState(useAppStore.getState())
          for (const key of sentKeys) {
            if (sameValue(latest[key], local[key])) pending.delete(key)
            else Object.assign(base, { [key]: local[key] })
          }
          const applied = { ...merged.state }
          pending.forEach(key => Object.assign(applied, { [key]: latest[key] }))
          applying = true
          useAppStore.setState(applied)
          applying = false
          rememberBase(merged.state)
          persistPending(context!, pending)
          lastAt = data.updated_at
          lastRemote = state
          dirty = pending.size > 0
          setStatus(dirty ? 'syncing' : 'ok')
          return
        }
        setStatus('error')
      } catch { if (current()) setStatus('error') }
      finally {
        saving = false
        // Keep failed work in the scoped cache; retry on the next change/foreground/poll.
        if (current() && dirty && revision !== startingRevision) schedule()
      }
    }
    function schedule() {
      clearTimeout(debounce)
      debounce = setTimeout(() => { void save() }, DEBOUNCE_MS)
    }
    async function pull() {
      if (!current() || reading || saving) return
      if (ready && dirty) { await save(); return }
      reading = true
      try {
        const { data, error } = await supabase.from('couple_state')
          .select('state, updated_at').eq('id', context!.stateId).eq('couple_id', context!.coupleId)
          .abortSignal(abort.signal).maybeSingle()
        if (!current()) return
        if (error || !data) { setStatus('error'); return }
        // applyRemote preserves pending fields, including edits made during this
        // read, while still loading the other fields before any full-state save.
        const conflicted = (data.updated_at !== lastAt || !sameValue(data.state, lastRemote))
          ? applyRemote(data.state, data.updated_at) : false
        ready = true
        if (dirty) schedule()
        setStatus(conflicted ? 'error' : dirty ? 'syncing' : 'ok')
      } catch { if (current()) setStatus('error') }
      finally { reading = false }
    }
    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (applying || !current()) return
      const next = selectSharedState(state)
      const old = selectSharedState(previous)
      if (Object.keys(next).every(key => next[key as keyof typeof next] === old[key as keyof typeof old])) return
      dirty = true
      for (const key of Object.keys(next) as (keyof typeof next)[]) {
        if (next[key] !== old[key]) {
          if (!pending.has(key)) Object.assign(base, { [key]: old[key] })
          pending.add(key)
        }
      }
      persistSyncBase(context!, base)
      persistPending(context!, pending)
      revision++
      if (ready) schedule()
    })
    setStatus('syncing')
    void pull()
    _pullFn = pull
    const pollIfVisible = () => { if (document.visibilityState !== 'hidden') void pull() }
    let timer = setInterval(pollIfVisible, POLL_MS)
    // Reset the interval so a full POLL_MS gap follows each event-driven pull,
    // preventing an immediate double-read from interval + Realtime/visibility/online.
    const resetPollTimer = () => { clearInterval(timer); timer = setInterval(pollIfVisible, POLL_MS) }
    const onVisible = () => { if (document.visibilityState === 'visible') { void pull(); resetPollTimer() } }
    const onOnline  = () => { void pull(); resetPollTimer() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    const channel = supabase.channel('couple-state-' + context.coupleId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couple_state', filter: 'id=eq.' + context.stateId }, () => { void pull(); resetPollTimer() })
      .subscribe()
    return () => {
      active = false
      abort.abort()
      cancelAuth()
      clearTimeout(debounce)
      clearInterval(timer)
      unsubscribe()
      if (_pullFn === pull) _pullFn = null
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      void supabase.removeChannel(channel)
    }
  }, [context])
}
