import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useNotifications } from '@/hooks/useNotifications'
import { useAppStore } from '@/store/useAppStore'

// MAX_TIMER_DELAY mirrors the constant in the hook
const MAX_TIMER_DELAY = 2 ** 31 - 2

beforeEach(() => {
  vi.useFakeTimers()
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    value: { permission: 'granted' },
  })
  // Reset store to a clean state
  useAppStore.setState({ events: [], todos: [], goals: [], wishlistItems: [], countdowns: [], focusActivities: [] })
})

afterEach(() => {
  vi.useRealTimers()
})

it('does not set a timer for an event 60 days in the future (all three reminders exceed the cap)', () => {
  // 60 days out: prevDay/1h/5min reminders are all 57–60 days away, all > MAX_TIMER_DELAY
  const farFuture = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
  const dateStr = farFuture.toISOString().split('T')[0]
  const timeStr = `${String(farFuture.getHours()).padStart(2, '0')}:${String(farFuture.getMinutes()).padStart(2, '0')}`
  useAppStore.setState({ events: [{ id: 'far', title: 'Far event', date: dateStr, startTime: timeStr } as never] })
  const spy = vi.spyOn(globalThis, 'setTimeout')
  renderHook(() => useNotifications(true))
  // No event-reminder timer should be registered (delays > MAX_TIMER_DELAY must be skipped)
  const longDelays = spy.mock.calls
    .map(([, delay]) => delay as number)
    .filter(d => typeof d === 'number' && d > MAX_TIMER_DELAY)
  expect(longDelays).toHaveLength(0)
})

it('does set a timer for an event within the cap', async () => {
  const soon = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
  const dateStr = soon.toISOString().split('T')[0]
  const timeStr = `${String(soon.getHours()).padStart(2, '0')}:${String(soon.getMinutes()).padStart(2, '0')}`
  useAppStore.setState({ events: [{ id: 'soon', title: 'Soon event', date: dateStr, startTime: timeStr } as never] })
  const spy = vi.spyOn(globalThis, 'setTimeout')
  const hook = renderHook(() => useNotifications(true))
  await act(async () => {})
  const realTimerCalls = spy.mock.calls.filter(([, delay]) => typeof delay === 'number' && (delay as number) > 0)
  expect(realTimerCalls.length).toBeGreaterThan(0)
  hook.unmount()
})
