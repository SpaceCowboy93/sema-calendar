import { act, renderHook } from '@testing-library/react'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { establishAuth, getAuthGeneration, invalidateAuth } from '@/lib/auth-session'

const permission = vi.fn()
const register = vi.fn()
vi.mock('@/lib/authenticated-fetch', () => ({ authenticatedFetch: vi.fn(() => { throw new Error('No network permitted') }) }))

beforeEach(() => {
  permission.mockReset().mockResolvedValue('denied')
  register.mockReset().mockImplementation(() => new Promise(() => {}))
  vi.stubGlobal('isSecureContext', true)
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', { permission: 'default', requestPermission: permission })
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {
    register, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  } })
  invalidateAuth()
  establishAuth({ userId: 'fixture', userName: 'mateo', coupleId: 'fixture', stateId: 'fixture' }, getAuthGeneration())
})
afterEach(() => { invalidateAuth(); vi.unstubAllGlobals(); Reflect.deleteProperty(navigator, 'serviceWorker') })

it('requests permission during the user action even while worker registration is pending', async () => {
  const { result } = renderHook(usePushNotifications)
  expect(register).toHaveBeenCalledTimes(1)
  await act(async () => {
    const enabled = result.current.enable()
    expect(permission).toHaveBeenCalledTimes(1)
    await enabled
  })
  expect(result.current.status).toBe('denied')
  expect(register).toHaveBeenCalledTimes(1)
})

it('does not prompt repeatedly when permission is blocked', async () => {
  vi.stubGlobal('Notification', { permission: 'denied', requestPermission: permission })
  const { result } = renderHook(usePushNotifications)
  await act(async () => { await result.current.enable() })
  expect(permission).not.toHaveBeenCalled()
  expect(register).not.toHaveBeenCalled()
  expect(result.current.status).toBe('denied')
})

it('does not request permission in an unsupported or insecure context', async () => {
  vi.stubGlobal('isSecureContext', false)
  const { result } = renderHook(usePushNotifications)
  await act(async () => { await result.current.enable() })
  expect(permission).not.toHaveBeenCalled()
  expect(register).not.toHaveBeenCalled()
  expect(result.current.status).toBe('unsupported')
})
