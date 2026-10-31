import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '@/store/useAppStore'

afterEach(() => {
  vi.useRealTimers()
  useAppStore.setState({ currentUser: null, pillDoses: [] })
})

describe('daily pill checklist', () => {
  it('keeps profiles separate and allows undo', () => {
    useAppStore.setState({ currentUser: 'mateo', pillDoses: [] })
    useAppStore.getState().togglePillDose(1)
    useAppStore.setState({ currentUser: 'seval' })
    useAppStore.getState().togglePillDose(1)
    expect(useAppStore.getState().pillDoses).toHaveLength(2)
    useAppStore.getState().togglePillDose(1)
    expect(useAppStore.getState().pillDoses.map(d => d.userId)).toEqual(['mateo'])
  })

  it('starts a new checklist after local midnight while retaining yesterday', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 31, 23, 59))
    useAppStore.setState({ currentUser: 'mateo', pillDoses: [] })
    useAppStore.getState().togglePillDose(4)
    vi.setSystemTime(new Date(2026, 10, 1, 0, 0))
    useAppStore.getState().togglePillDose(4)
    expect(useAppStore.getState().pillDoses.map(d => d.date)).toEqual(['2026-10-31', '2026-11-01'])
  })
})
