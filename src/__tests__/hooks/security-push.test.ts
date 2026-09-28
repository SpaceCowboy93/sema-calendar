import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { establishAuth, getAuthGeneration, invalidateAuth } from '@/lib/auth-session'
import { authenticatedFetch } from '@/lib/authenticated-fetch'
vi.mock('@/lib/authenticated-fetch', () => ({ authenticatedFetch: vi.fn() }))
const access = { userId: 'a', userName: 'mateo' as const, coupleId: 'a', stateId: 'sema' }
beforeEach(() => { invalidateAuth(); vi.clearAllMocks(); establishAuth(access, getAuthGeneration()) })
it('does not submit old reminder data under a switched account', async () => {
  let resolve!: (value: null) => void
  const getSubscription = vi.fn(() => new Promise<null>(r => { resolve = r }))
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve({ pushManager: { getSubscription } }), register: vi.fn(async () => ({})), addEventListener: vi.fn(), removeEventListener: vi.fn() } })
  Object.defineProperty(window, 'PushManager', { configurable: true, value: function () {} })
  Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'denied' } })
  const hook = renderHook(() => usePushNotifications())
  let task!: Promise<void>
  await act(async () => { task = hook.result.current.syncReminders('mateo'); await Promise.resolve() })
  act(() => { invalidateAuth(); establishAuth({ ...access, userId: 'b', userName: 'seval' }, getAuthGeneration()) })
  await act(async () => { resolve(null); await task })
  expect(authenticatedFetch).not.toHaveBeenCalled()
  hook.unmount()
})
it('requests authenticated reconnection on worker renewal messages', async () => {
  const listeners: Record<string, (event: MessageEvent) => void> = {}
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { addEventListener: (name: string, fn: (event: MessageEvent) => void) => { listeners[name] = fn }, removeEventListener: vi.fn() } })
  Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'denied' } })
  const hook = renderHook(() => usePushNotifications())
  act(() => listeners.message({ data: { type: 'PUSH_RECONNECT_REQUIRED' } } as MessageEvent))
  expect(hook.result.current.serverSaved).toBe(false)
  expect(hook.result.current.swError).toContain('reconnect')
  expect(authenticatedFetch).not.toHaveBeenCalled()
  hook.unmount()
})
