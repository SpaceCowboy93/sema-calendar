import { type SharedState } from './shared-state'

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

// JSON object order is not significant (Postgres JSONB may reorder properties).
export function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, i) => sameValue(value, b[i]))
  }
  if (isObject(a) && isObject(b)) {
    const keys = Object.keys(a)
    return keys.length === Object.keys(b).length && keys.every(key =>
      Object.prototype.hasOwnProperty.call(b, key) && sameValue(a[key], b[key]))
  }
  return false
}

function mergeValue(base: unknown, local: unknown, remote: unknown): unknown {
  if (sameValue(local, base)) return remote
  if (sameValue(remote, base) || sameValue(local, remote)) return local
  if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
    // Includes shopping-list items and finance months, without changing their schema.
    const idKey = ['id', 'key'].find(key => [base, local, remote].every(items =>
      items.every(item => isObject(item) && typeof item[key] === 'string') &&
      new Set(items.map(item => item[key])).size === items.length))
    if (idKey) {
      const index = (items: Record<string, unknown>[]) => new Map(items.map(item => [item[idKey], item]))
      const b = index(base), l = index(local), r = index(remote)
      return Array.from(new Set([...r.keys(), ...l.keys()]))
        .map(id => mergeValue(b.get(id), l.get(id), r.get(id)))
        .filter(value => value !== undefined)
    }
  }
  if (isObject(base) && isObject(local) && isObject(remote)) {
    const result: Record<string, unknown> = {}
    for (const key of new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])) {
      // Independent changes to one record both advance its modification metadata.
      const value = key === 'updatedAt' && typeof local[key] === 'string' && typeof remote[key] === 'string' &&
        Number.isFinite(Date.parse(local[key])) && Number.isFinite(Date.parse(remote[key]))
        ? (Date.parse(local[key]) > Date.parse(remote[key]) ? local[key] : remote[key])
        : mergeValue(base[key], local[key], remote[key])
      if (value !== undefined) Object.defineProperty(result, key, { value, enumerable: true, configurable: true, writable: true })
    }
    return result
  }
  // Includes edit/delete races and pending legacy caches with no known baseline.
  throw new Error('Conflicting shared-state edit')
}

export function rebaseSharedState(
  base: Partial<SharedState>, local: Partial<SharedState>, remote: Partial<SharedState>,
  pending: Set<keyof SharedState>,
) {
  const state = { ...remote }
  const conflicts: (keyof SharedState)[] = []
  for (const key of pending) {
    try { Object.assign(state, { [key]: mergeValue(base[key], local[key], remote[key]) }) }
    catch { conflicts.push(key) }
  }
  return { state, conflicts }
}
