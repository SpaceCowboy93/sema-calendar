/**
 * Regression — background-tab polling (hidden-tab egress defect).
 *
 * The setInterval in useSupabaseSync has no document.visibilityState guard.
 * It polls every 5 s even when the tab is in the background, downloading
 * the full couple_state JSON (~20-30 KB). At 4 sessions × 12 polls/min
 * this explains the ~14 GB Supabase egress observed over 8.6 days.
 *
 * Fix: add `if (document.visibilityState === 'hidden') return` inside the
 * setInterval callback. The existing visibilitychange → pull() path already
 * handles catching up when the tab returns to the foreground.
 *
 * Test 1 (fails before fix, passes after): interval does NOT call
 *   supabase.from() while the tab is hidden.
 * Test 2 (passes before and after fix): visibilitychange to 'visible'
 *   triggers a catch-up pull when the tab comes back to foreground.
 */

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { vi } from 'vitest'
import { useSupabaseSync } from '@/hooks/useSupabaseSync'
import { clearActiveCouple, loadCoupleCache } from '@/store/useAppStore'
import { establishAuth, getAuthGeneration, invalidateAuth } from '@/lib/auth-session'

// ── constants must match the hook ────────────────────────────────────────────
const POLL_MS = 5_000

// ── module-level mock hoisted so the factory closure can reference it ─────────
const mocks = vi.hoisted(() => ({ read: vi.fn() }))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = {
        select:      () => q,
        eq:          () => q,
        abortSignal: () => q,
        update:      () => q,
        maybeSingle: () => mocks.read(),
      }
      return q
    },
    channel:       () => ({ on: () => ({ subscribe: vi.fn() }) }),
    removeChannel: vi.fn(),
  },
}))

// ── fixtures ──────────────────────────────────────────────────────────────────
const access = { userId: 'u1', userName: 'mateo' as const, coupleId: 'c1', stateId: 'sema' }
const remoteRow = { data: { state: {}, updated_at: '2026-01-01T00:00:00.000Z' } }

// ── lifecycle ─────────────────────────────────────────────────────────────────
beforeEach(async () => {
  vi.useFakeTimers()
  localStorage.clear()
  invalidateAuth()
  clearActiveCouple()
  mocks.read.mockReset().mockResolvedValue(remoteRow)
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
})

afterEach(() => {
  vi.useRealTimers()
  invalidateAuth()
})

async function start() {
  await loadCoupleCache(access)
  const context = establishAuth(access, getAuthGeneration())!
  const hook = renderHook(() => useSupabaseSync(context))
  await act(async () => {})
  return hook
}

// ── Test 1: hidden tab — interval must NOT poll ────────────────────────────────

it('does NOT call supabase.from in the poll interval while the tab is hidden', async () => {
  // Mount with visible tab; initial pull fires and completes.
  const hook = await start()
  const callsAfterInitialPull = mocks.read.mock.calls.length
  expect(callsAfterInitialPull).toBeGreaterThanOrEqual(1) // sanity

  // Hide the tab.
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })

  // Advance three full poll cycles.
  await act(async () => { await vi.advanceTimersByTimeAsync(POLL_MS * 3 + 100) })

  // FAILS with current code — interval fires 3 more times while hidden.
  // PASSES after fix  — interval guard skips pull() when hidden.
  expect(mocks.read.mock.calls.length).toBe(callsAfterInitialPull)

  hook.unmount()
})

// ── Test 2: becoming visible triggers a catch-up pull ─────────────────────────

it('triggers a catch-up pull when the tab returns to visible', async () => {
  // Start with tab hidden; initial pull still fires (not guarded).
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
  const hook = await start()

  // Advance past one poll interval — no extra polls while hidden (after fix).
  await act(async () => { await vi.advanceTimersByTimeAsync(POLL_MS + 100) })
  const callsWhileHidden = mocks.read.mock.calls.length

  // Tab becomes visible — the existing visibilitychange handler calls pull().
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
  })

  // A catch-up read should have fired.
  expect(mocks.read.mock.calls.length).toBeGreaterThan(callsWhileHidden)

  hook.unmount()
})
