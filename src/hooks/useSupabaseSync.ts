'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'

const COUPLE_ID   = 'sema'
const DEBOUNCE_MS = 1000
const POLL_MS     = 8_000

const SKIP_KEYS = new Set(['currentUser'])

function getSyncableState(state: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(state).filter(([k, v]) => !SKIP_KEYS.has(k) && typeof v !== 'function')
  )
}

async function fetchRemote() {
  const { data, error } = await supabase
    .from('couple_state')
    .select('state, updated_at')
    .eq('id', COUPLE_ID)
    .maybeSingle()
  if (error) {
    console.error('[Sync] READ ERROR:', error.code, error.message)
    return null
  }
  console.log('[Sync] read ok — updated_at:', data?.updated_at ?? 'empty')
  return data as { state: Record<string, unknown>; updated_at: string } | null
}

async function writeRemote(syncable: Record<string, unknown>): Promise<string | null> {
  const updated_at = new Date().toISOString()
  const { data, error } = await supabase
    .from('couple_state')
    .upsert({ id: COUPLE_ID, state: syncable, updated_at })
    .select('updated_at')
    .single()
  if (error) {
    console.error('[Sync] WRITE ERROR:', error.code, error.message)
    return null
  }
  console.log('[Sync] write ok — saved at:', data?.updated_at)
  return data?.updated_at ?? null
}

export function useSupabaseSync() {
  const isMerging      = useRef(false)
  const lastWriteMs    = useRef(0)          // epoch ms of last successful write
  const lastRemoteAt   = useRef<string | null>(null)
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Merge remote state (skip currentUser) ─────────────────────────────────
  function applyRemote(state: Record<string, unknown>, updatedAt: string) {
    console.log('[Sync] applying remote state from', updatedAt)
    lastRemoteAt.current = updatedAt
    isMerging.current    = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAppStore.setState(state as any)
    isMerging.current = false
  }

  // ── Fetch + conditionally apply ────────────────────────────────────────────
  async function pull() {
    // Don't pull immediately after we wrote (2s grace period to avoid echo)
    if (Date.now() - lastWriteMs.current < 2000) return

    const data = await fetchRemote()
    if (!data?.state || Object.keys(data.state).length === 0) return
    if (data.updated_at === lastRemoteAt.current) return   // no change

    applyRemote(data.state, data.updated_at)
  }

  // ── 1. Initial hydration from Supabase ────────────────────────────────────
  useEffect(() => {
    console.log('[Sync] starting — URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'MISSING')
    fetchRemote().then(data => {
      if (!data) return
      if (data.state && Object.keys(data.state).length > 0) {
        applyRemote(data.state, data.updated_at)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 2. Write to Supabase on any local state change (debounced) ────────────
  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      if (isMerging.current) return

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        const syncable = getSyncableState(state as unknown as Record<string, unknown>)
        const savedAt  = await writeRemote(syncable)
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

  // ── 3. Polling every 8s ───────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(pull, POLL_MS)
    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 4. Pull when app comes back to foreground (tab/app switch) ────────────
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        console.log('[Sync] app foregrounded — pulling')
        pull()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 5. Real-time subscription (instant when configured) ───────────────────
  useEffect(() => {
    const channel = supabase
      .channel('couple_state_rt')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'couple_state', filter: `id=eq.${COUPLE_ID}` },
        (payload) => {
          if (Date.now() - lastWriteMs.current < 2000) {
            console.log('[Sync] realtime: skipping own echo')
            return
          }
          const remote = payload.new as { state: Record<string, unknown>; updated_at: string }
          if (!remote?.state || remote.updated_at === lastRemoteAt.current) return
          console.log('[Sync] realtime: applying remote update')
          applyRemote(remote.state, remote.updated_at)
        }
      )
      .subscribe((status) => {
        console.log('[Sync] realtime status:', status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [])
}
