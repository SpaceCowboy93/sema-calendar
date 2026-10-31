import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { useRef } from 'react'
import { useModalInteraction } from '@/hooks/useModalInteraction'
import { VisualViewport } from '@/components/layout/VisualViewport'

it.each([
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', true],
  ['Mozilla/5.0 (Linux; Android 15; Samsung)', false],
])('scopes modal shell suppression to iOS: %s', (userAgent, ios) => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'userAgent')
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: userAgent })
  try {
    const { rerender, unmount } = render(<Modal open close={() => {}} />)
    expect(document.documentElement.hasAttribute('data-ios-modal-open')).toBe(ios)
    rerender(<Modal open close={() => {}}><Modal open close={() => {}} /></Modal>)
    rerender(<Modal open close={() => {}} />)
    expect(document.documentElement.hasAttribute('data-ios-modal-open')).toBe(ios)
    unmount()
    expect(document.documentElement).not.toHaveAttribute('data-ios-modal-open')
  } finally {
    if (original) Object.defineProperty(navigator, 'userAgent', original)
    else Reflect.deleteProperty(navigator, 'userAgent')
  }
})

function Modal({ open, close, children }: { open: boolean; close: () => void; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useModalInteraction(open, ref, close)
  return open ? <div ref={ref} tabIndex={-1} data-testid="panel"><input aria-label="Draft" /><button>Save</button>{children}</div> : null
}

it('nested modals keep the page locked and only the top layer handles Escape', () => {
  const outer = vi.fn(), inner = vi.fn()
  const trigger = document.createElement('button')
  document.body.append(trigger); trigger.focus()
  const { rerender, unmount } = render(<Modal open close={outer} />)
  const parent = screen.getByTestId('panel')
  expect(parent).toHaveFocus()
  rerender(<Modal open close={outer}><Modal open close={inner} /></Modal>)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(inner).toHaveBeenCalledOnce()
  expect(outer).not.toHaveBeenCalled()
  rerender(<Modal open close={outer} />)
  expect(document.body.style.overflow).toBe('hidden')
  expect(parent).toHaveFocus()
  unmount()
  expect(document.body.style.overflow).toBe('')
  expect(trigger).toHaveFocus()
  trigger.remove()
})

it('keyboard geometry preserves draft values, resets on dismissal and ignores pinch zoom', async () => {
  const viewport = Object.assign(new EventTarget(), { height: 350, offsetTop: 12, scale: 1 })
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
  const { unmount } = render(<><VisualViewport /><input aria-label="Note" defaultValue="Do not lose me" /></>)
  screen.getByLabelText('Note').focus()
  await act(async () => { viewport.dispatchEvent(new Event('resize')); await new Promise(resolve => requestAnimationFrame(resolve)) })
  expect(document.documentElement.style.getPropertyValue('--visual-height')).toBe('350px')
  expect(document.documentElement).toHaveAttribute('data-keyboard-open')
  viewport.scale = 2; viewport.height = 200
  await act(async () => { viewport.dispatchEvent(new Event('resize')); await new Promise(resolve => requestAnimationFrame(resolve)) })
  expect(document.documentElement.style.getPropertyValue('--visual-height')).toBe('350px')
  viewport.scale = 1; viewport.height = innerHeight; viewport.offsetTop = 0
  await act(async () => { viewport.dispatchEvent(new Event('resize')); await new Promise(resolve => requestAnimationFrame(resolve)) })
  expect(document.documentElement).not.toHaveAttribute('data-keyboard-open')
  expect(screen.getByLabelText('Note')).toHaveValue('Do not lose me')
  unmount()
  expect(document.documentElement.style.getPropertyValue('--visual-height')).toBe('')
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: undefined })
})
