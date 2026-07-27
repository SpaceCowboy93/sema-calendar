'use client'

/**
 * C2 Botanical Journal — shared static page background.
 *
 * Replaces AnimatedBackground on all main pages.
 * No blobs, no animation, no grain.
 * Just a warm ivory/cream base with a barely-perceptible
 * warm radial from the upper corner.
 */
export function C2PageBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[-1]"
      style={{ background: '#FDFAF5' }}
    >
      {/* Warm natural light — barely perceptible, upper-right origin */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '70%',
          height: '55%',
          background:
            'radial-gradient(ellipse at 90% 0%, rgba(201,169,110,0.055) 0%, transparent 62%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
