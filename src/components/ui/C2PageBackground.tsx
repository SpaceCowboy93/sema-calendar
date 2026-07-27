'use client'

/**
 * C2 Botanical Journal — shared static page background.
 *
 * Warm cream (#FDFAF5) base + soft daylight layers.
 * Felt more than seen. No blobs, no animation, no grain.
 */
export function C2PageBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[-1]"
      style={{ background: '#FDFAF5' }}
    >
      {/* Primary warm light — upper right, morning sun through window */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '80%', height: '65%',
        background: 'radial-gradient(ellipse at 88% 0%, rgba(201,169,110,0.07) 0%, rgba(201,169,110,0.03) 40%, transparent 68%)',
        pointerEvents: 'none',
      }} />
      {/* Secondary warm fill — upper left, softer reflection */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: '55%', height: '40%',
        background: 'radial-gradient(ellipse at 10% 0%, rgba(232,196,184,0.045) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />
      {/* Very faint bottom warmth — paper edge shadow */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '30%',
        background: 'linear-gradient(to top, rgba(180,160,130,0.028) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />
    </div>
  )
}
