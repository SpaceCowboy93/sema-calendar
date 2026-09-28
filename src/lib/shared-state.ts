import type { AppState } from '@/store/useAppStore'

export const SHARED_KEYS = [
  'events', 'todos', 'moods', 'loveNotes', 'wishlistItems', 'countdowns', 'memories',
  'goals', 'partnerNotes', 'shoppingLists', 'monthlyIncome', 'budgetItems',
  'savingsGoals', 'financeMonths', 'savingsTransactions', 'focusActivities',
  'focusCarryOver', 'boomBoomCount',
] as const satisfies readonly (keyof AppState)[]
export type SharedState = Pick<AppState, typeof SHARED_KEYS[number]>

/** Never import session identity, methods or UI state from JSON/cache/database. */
export function selectSharedState(value: unknown): Partial<SharedState> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const key of SHARED_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue
    const entry = source[key]
    if (key === 'monthlyIncome' || key === 'boomBoomCount') {
      if (typeof entry === 'number' && Number.isFinite(entry)) result[key] = entry
    } else if (key === 'focusCarryOver') {
      if (typeof entry === 'boolean') result[key] = entry
    } else if (Array.isArray(entry)) {
      const idKey = key === 'financeMonths' ? 'key' : 'id'
      if (entry.every(item => item && typeof item === 'object' && typeof item[idKey] === 'string')) result[key] = entry
    }
  }
  return result as Partial<SharedState>
}
