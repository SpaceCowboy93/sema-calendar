'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'

const COUPLE_ID = 'sema'
const DEBOUNCE_MS = 1200

// currentUser is per-device — never sync it to the shared database
const SKIP_KEYS = new Set(['currentUser'])

function getSyncableState(state: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(state).filter(([k, v]) => !SKIP_KEYS.has(k) && typeof v !== 'function')
  )
}

export function useSupabaseSync() {
  const justWrote        = useRef(false)
  const justWroteTimer   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMergingRemote  = useRef(false)
  const debounceRef      = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 1. Hydrate from Supabase on mount ──────────────────────────────────────
  useEffect(() => {
    async function hydrate() {
      const { data, error } = await supabase
        .from('couple_state')
        .select('state')
        .eq('id', COUPLE_ID)
        .maybeSingle()

      if (!error && data?.state && Object.keys(data.state as object).length > 0) {
        isMergingRemote.current = true
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useAppStore.setState(data.state as any)
        isMergingRemote.current = false
      }
    }
    hydrate()
  }, [])

  // ── 2. Write to Supabase on any state change (debounced) ───────────────────
  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      if (isMergingRemote.current) return

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        const syncable = getSyncableState(state as unknown as Record<string, unknown>)

        // Flag so we ignore the echo that comes back from the real-time subscription
        justWrote.current = true
        if (justWroteTimer.current) clearTimeout(justWroteTimer.current)
        justWroteTimer.current = setTimeout(() => { justWrote.current = false }, 3000)

        await supabase
          .from('couple_state')
          .upsert({ id: COUPLE_ID, state: syncable, updated_at: new Date().toISOString() })
      }, DEBOUNCE_MS)
    })

    return () => {
      unsub()
      if (debounceRef.current)    clearTimeout(debounceRef.current)
      if (justWroteTimer.current) clearTimeout(justWroteTimer.current)
    }
  }, [])

  // ── 3. Real-time subscription — apply changes from the other device ────────
  useEffect(() => {
    const channel = supabase
      .channel('couple_state_changes')
      .on(
        'postgres_changes',
        {
          event:  'UPDATE',
          schema: 'public',
          table:  'couple_state',
          filter: `id=eq.${COUPLE_ID}`,
        },
        (payload) => {
          if (justWrote.current) return // skip our own write echoed back

          const remoteState = (payload.new as { state: Record<string, unknown> }).state
          if (!remoteState) return

          isMergingRemote.current = true
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          useAppStore.setState(remoteState as any)
          isMergingRemote.current = false
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])
}
