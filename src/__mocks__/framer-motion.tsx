/**
 * Framer Motion mock for Vitest.
 *
 * Renders plain HTML elements instead of animated ones so tests are stable
 * and fast.  Real accessibility attributes (role, aria-*) are forwarded.
 */

import React from 'react'
import { vi } from 'vitest'

type AnyProps = Record<string, unknown>

// Generic pass-through that strips framer-motion-specific props
function stripMotionProps(props: AnyProps) {
  const {
    initial, animate, exit, transition, variants, whileTap, whileHover, whileFocus,
    layout, layoutId, drag, dragConstraints, dragElastic,
    onAnimationStart, onAnimationComplete,
    ...rest
  } = props
  void initial; void animate; void exit; void transition; void variants
  void whileTap; void whileHover; void whileFocus; void layout; void layoutId
  void drag; void dragConstraints; void dragElastic
  void onAnimationStart; void onAnimationComplete
  return rest
}

function createMotionComponent(tag: string) {
  return React.forwardRef<HTMLElement, AnyProps>(function MotionComponent(props, ref) {
    return React.createElement(tag, { ...stripMotionProps(props), ref })
  })
}

export const motion = new Proxy({} as Record<string, ReturnType<typeof createMotionComponent>>, {
  get(_target, prop: string) {
    return createMotionComponent(prop)
  },
})

export function AnimatePresence({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export const useAnimation = vi.fn(() => ({
  start:  vi.fn(),
  stop:   vi.fn(),
  set:    vi.fn(),
  mount:  vi.fn(),
}))

export const useInView   = vi.fn(() => [null, false])
export const useScroll   = vi.fn(() => ({ scrollX: { get: vi.fn() }, scrollY: { get: vi.fn() } }))
export const useTransform = vi.fn(() => ({ get: vi.fn() }))
export const useSpring   = vi.fn((v: unknown) => v)

const framerMotion = { motion, AnimatePresence, useAnimation, useInView, useScroll, useTransform, useSpring }
export default framerMotion
