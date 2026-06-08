'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'

const COUPLE_ID  = 'sema'
const DEBOUNCE_MS = 1200
const POLL_MS     = 8_000   // polling fallback — works even without realtime

// currentUser is per-device, never shared
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
  if (error) { console.error('[Sync] fetch failed:', error.message); return null }
  return data as { state: Record<string, unknown>; updated_at: string } | null
}

async function writeRemote(syncable: Record<string, unknown>) {
  const updated_at = new Date().toISOString()
  const { data, error } = await supabase
    .from('couple_state')
    .upsert({ id: COUPLE_ID, state: syncable, updated_at })
    .select('updated_at')
    .single()
  if (error) { console.error('[Sync] write failed:', error.message); return null }
  return data?.updated_at ?? null
}

export function useSupabaseSync() {
  const isMerging      = useRef(false)   // true while we're applying remote state
  const justWrote      = useRef(false)   // true for 5s after we write, to skip echo
  const justWroteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceRef    = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRemoteAt   = useRef<string | null>(null)  // updated_at of last applied remote

  function applyRemote(state: Record<string, unknown>, updatedAt: string) {
    lastRemoteAt.current = updatedAt
    isMerging.current    = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAppStore.setState(state as any)
    isMerging.current = false
  }

  // ── 1. Hydrate from Supabase on first load ─────────────────────────────────
  useEffect(() => {
    fetchRemote().then(data => {
      if (data?.state && Object.keys(data.state).length > 0) {
        applyRemote(data.state, data.updated_at)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 2. Write to Supabase on any Zustand state change (debounced) ───────────
  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      if (isMerging.current) return   // don't write what we just read

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        const syncable = getSyncableState(state as unknown as Record<string, unknown>)

        // Suppress echo for 5 seconds after writing
        justWrote.current = true
        if (justWroteTimer.current) clearTimeout(justWroteTimer.current)
        justWroteTimer.current = setTimeout(() => { justWrote.current = false }, 5000)

        const savedAt = await writeRemote(syncable)
        if (savedAt) lastRemoteAt.current = savedAt
        else justWrote.current = false   // write failed, allow retries
      }, DEBOUNCE_MS)
    })

    return () => {
      unsub()
      if (debounceRef.current)    clearTimeout(debounceRef.current)
      if (justWroteTimer.current) clearTimeout(justWroteTimer.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 3. Polling fallback every 8s (reliable even without realtime) ──────────
  useEffect(() => {
    const timer = setInterval(async () => {
      if (justWrote.current) return   // skip if we just wrote

      const data = await fetchRemote()
      if (!data?.state) return
      if (data.updated_at === lastRemoteAt.current) return   // nothing new

      applyRemote(data.state, data.updated_at)
    }, POLL_MS)

    return () => clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 4. Real-time subscription (instant when properly configured) ───────────
  useEffect(() => {
    const channel = supabase
      .channel('couple_state_rt')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'couple_state', filter: `id=eq.${COUPLE_ID}` },
        (payload) => {
          if (justWrote.current) return   // skip our own echo

          const remote = payload.new as { state: Record<string, unknown>; updated_at: string }
          if (!remote?.state || remote.updated_at === lastRemoteAt.current) return

          applyRemote(remote.state, remote.updated_at)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])
}
