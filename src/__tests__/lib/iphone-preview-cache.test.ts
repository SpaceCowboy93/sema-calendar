import { afterEach, expect, it, vi } from 'vitest'
import { coupleStorage, pendingKeys, persistPending, persistSyncBase, readSyncBase, setCacheScope } from '@/lib/couple-cache'

const access = { userId: 'test-user', userName: 'mateo' as const, coupleId: 'test-couple', stateId: 'sema' }
const oldKey = `semacalendar-v2:${access.coupleId}:sema`
const newKey = `semacalendar-v2:project:wwxdinkdjkjiqzynfbdk:iphone-preview-v1:${access.coupleId}:sema`
afterEach(() => { setCacheScope(null); vi.unstubAllEnvs(); localStorage.clear() })

it('v2 ignores old caches, pending markers and baselines without changing them', () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://wwxdinkdjkjiqzynfbdk.supabase.co')
  localStorage.clear()
  const saved = JSON.stringify({ state: { monthlyIncome: 777 } })
  for (const key of ['semacalendar-v1', oldKey]) localStorage.setItem(key, saved)
  localStorage.setItem('sema-legacy-cache-owner', access.coupleId)
  localStorage.setItem(oldKey + ':pending', '["monthlyIncome"]')
  localStorage.setItem(oldKey + ':base', '{"monthlyIncome":100}')
  const before = { ...localStorage }
  setCacheScope(access)
  expect(coupleStorage.getItem('ignored')).toBeNull()
  expect(pendingKeys(access).size).toBe(0)
  expect(readSyncBase(access)).toEqual({})
  expect({ ...localStorage }).toEqual(before)
  coupleStorage.setItem('ignored', saved)
  persistPending(access, new Set(['monthlyIncome']))
  persistSyncBase(access, { monthlyIncome: 222 })
  expect(localStorage.getItem(newKey)).toBe(saved)
  expect(pendingKeys(access)).toEqual(new Set(['monthlyIncome']))
  expect(readSyncBase(access)).toEqual({ monthlyIncome: 222 })
  for (const [key, value] of Object.entries(before)) expect(localStorage.getItem(key)).toBe(value)
})

it('original backend retains its existing legacy-cache behavior', () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://neyhoodxeumpbxekskej.supabase.co')
  localStorage.clear()
  const saved = JSON.stringify({ state: { monthlyIncome: 777 } })
  localStorage.setItem('semacalendar-v1', saved)
  setCacheScope(access)
  expect(coupleStorage.getItem('ignored')).toBe(saved)
  expect(pendingKeys(access)).toEqual(new Set(['monthlyIncome']))
})
