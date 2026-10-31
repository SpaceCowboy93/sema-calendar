'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { isIOSDevice } from './useIOSDevice'

const layers: HTMLElement[] = []
let unlock: (() => void) | undefined

/** One lock and focus owner across nested sheets and confirmation dialogs. */
export function useModalInteraction(open: boolean, ref: RefObject<HTMLElement>, onClose: () => void) {
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const panel = ref.current
    if (!open || !panel) return
    const previous = document.activeElement as HTMLElement | null
    if (!layers.length) {
      // Page stacking contexts can put fixed shell controls above inline editors.
      // Scope their suppression to iOS; other platforms keep existing behavior.
      if (isIOSDevice()) document.documentElement.setAttribute('data-ios-modal-open', '')
      const targets = [document.body, ...document.querySelectorAll<HTMLElement>('main')]
      const saved = targets.map(el => el.style.overflow)
      targets.forEach(el => { el.style.overflow = 'hidden' })
      unlock = () => targets.forEach((el, i) => { el.style.overflow = saved[i] })
    }
    layers.push(panel)
    const selector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusable = () => Array.from(panel.querySelectorAll<HTMLElement>(selector)).filter(el => !el.closest('[hidden], [aria-hidden="true"]'))
    // Focus the panel, not an input: opening a sheet must not summon the keyboard.
    panel.focus({ preventScroll: true })
    const keydown = (event: KeyboardEvent) => {
      if (layers[layers.length - 1] !== panel || event.defaultPrevented) return
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return }
      if (event.key !== 'Tab') return
      const items = focusable()
      const first = items[0]
      const last = items[items.length - 1]
      if (!first) { event.preventDefault(); panel.focus(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        event.preventDefault(); last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        event.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('keydown', keydown)
      layers.splice(layers.indexOf(panel), 1)
      if (!layers.length) {
        unlock?.(); unlock = undefined
        document.documentElement.removeAttribute('data-ios-modal-open')
      }
      if (previous?.isConnected && (!layers.length || layers[layers.length - 1].contains(previous))) previous.focus({ preventScroll: true })
    }
  }, [open, ref])
}
