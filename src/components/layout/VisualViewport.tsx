'use client'

import { useEffect } from 'react'

/** Track the visible area without resizing/remounting the app or its drafts. */
export function VisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const root = document.documentElement
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // Pinch zoom is an accessibility action, not a keyboard resize.
        if (viewport.scale !== 1) return
        root.style.setProperty('--visual-height', `${viewport.height}px`)
        root.style.setProperty('--visual-top', `${viewport.offsetTop}px`)
        const editing = document.activeElement?.matches('input, textarea, [contenteditable="true"]')
        root.toggleAttribute('data-keyboard-open', !!editing && window.innerHeight - viewport.height > 120)
        if (editing) (document.activeElement as HTMLElement)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
      })
    }
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    update()
    return () => {
      cancelAnimationFrame(frame)
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
      root.style.removeProperty('--visual-height')
      root.style.removeProperty('--visual-top')
      root.removeAttribute('data-keyboard-open')
    }
  }, [])
  return null
}
