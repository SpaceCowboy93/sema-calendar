import type { StateStorage } from 'zustand/middleware'
import type { CoupleAccess } from './couple-access'
import { SHARED_KEYS, selectSharedState, type SharedState } from './shared-state'

let scope: CoupleAccess | null = null
export function setCacheScope(access: CoupleAccess | null) { scope = access }
const keyFor = (access: CoupleAccess) => `semacalendar-v2:${access.coupleId}:${access.stateId}`
export function pendingKeys(access: CoupleAccess): Set<keyof SharedState> {
  const saved = localStorage.getItem(keyFor(access) + ':pending')
  // Caches created before tracking was added may contain unsynced work.
  if (saved === null) {
    const owner = localStorage.getItem('sema-legacy-cache-owner')
    const legacy = access.stateId === 'sema' && (!owner || owner === access.coupleId)
      ? localStorage.getItem('semacalendar-v1') : null
    const cache = localStorage.getItem(keyFor(access)) ?? legacy
    // Older caches may predate shared fields. Only cached fields can contain
    // pending work; marking absent fields dirty would upload store defaults.
    try {
      return new Set(Object.keys(selectSharedState(cache ? JSON.parse(cache).state : null)) as (keyof SharedState)[])
    } catch { return new Set() }
  }
  try { return new Set(JSON.parse(saved).filter((key: keyof SharedState) => SHARED_KEYS.includes(key))) }
  catch { return new Set(SHARED_KEYS) }
}
export function persistPending(access: CoupleAccess, keys: Set<keyof SharedState>) {
  localStorage.setItem(keyFor(access) + ':pending', JSON.stringify(Array.from(keys)))
}
// The last values these local edits were based on, retained across logout/restart.
export function readSyncBase(access: CoupleAccess): Partial<SharedState> {
  try { return selectSharedState(JSON.parse(localStorage.getItem(keyFor(access) + ':base') ?? 'null')) }
  catch { return {} }
}
export function persistSyncBase(access: CoupleAccess, base: Partial<SharedState>) {
  localStorage.setItem(keyFor(access) + ':base', JSON.stringify(base))
}
export const coupleStorage: StateStorage = {
  getItem: () => {
    if (!scope || typeof localStorage === 'undefined') return null
    const saved = localStorage.getItem(keyFor(scope))
    if (saved !== null) return saved
    // Preserve the original cache. Import it only into the verified legacy household.
    const owner = localStorage.getItem('sema-legacy-cache-owner')
    if (scope.stateId !== 'sema' || (owner && owner !== scope.coupleId)) return null
    const legacy = localStorage.getItem('semacalendar-v1')
    if (legacy) localStorage.setItem('sema-legacy-cache-owner', scope.coupleId)
    return legacy
  },
  setItem: (_name, value) => {
    if (scope && typeof localStorage !== 'undefined') localStorage.setItem(keyFor(scope), value)
  },
  // Logout does not delete potentially unsynchronized work.
  removeItem: () => {},
}
