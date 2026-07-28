'use client'

import Image from 'next/image'

export type SeMaRoomHeaderProps = {
  /**
   * 'static'   — shows eyebrow + title + optional subtitle + optional date.
   * 'greeting' — shows greeting line + optional subtitle + optional date.
   * Defaults to 'static'.
   */
  mode?: 'static' | 'greeting'

  /** Small-caps muted line above the title (static mode). */
  eyebrow?: string

  /**
   * Page title in static mode. Accepts ReactNode so callers can embed
   * line breaks via <br /> without special-casing.
   */
  title?: React.ReactNode

  /** Personalized greeting line (greeting mode). */
  greeting?: string

  /** Muted line below title / greeting. */
  subtitle?: string

  /** Date string rendered below subtitle. */
  dateLabel?: string

  /** Path to the room header image (served from /public). */
  imageSrc?: string

  /** Alt text — pass "" for purely decorative images. */
  imageAlt?: string

  /**
   * Fine-grained CSS positioning for the image within the header.
   * All values are CSS strings (e.g. "0", "-20px", "auto").
   * Defaults position the image in the upper-right corner.
   */
  imagePosition?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
    /** CSS width of the image element. */
    width?: string
    /** Constrain the image further if needed. */
    maxWidth?: string
  }

  /**
   * Max-width of the text column. Use this to stop text from running
   * under the image on narrow viewports.
   * Defaults to '62%' when an imageSrc is provided, '100%' otherwise.
   */
  textMaxWidth?: string

  /** Right-aligned slot — e.g. Sign Out button. */
  action?: React.ReactNode

  className?: string
}

/**
 * SeMaRoomHeader — shared presentational header for all C2 rooms.
 *
 * Pure display component: no store reads, no Living Moment logic,
 * no generated SVG, no Framer Motion in this foundation version.
 * Callers own all data derivation and pass fully-resolved strings.
 */
export function SeMaRoomHeader({
  mode = 'static',
  eyebrow,
  title,
  greeting,
  subtitle,
  dateLabel,
  imageSrc,
  imageAlt = '',
  imagePosition,
  textMaxWidth,
  action,
  className,
}: SeMaRoomHeaderProps) {
  const pos = imagePosition ?? {}
  const resolvedTextMaxWidth = textMaxWidth ?? (imageSrc ? '62%' : '100%')

  return (
    <header
      className={['relative overflow-hidden', className].filter(Boolean).join(' ')}
      style={{
        paddingInline: 20,
        paddingTop: 'clamp(48px, 7vh, 64px)',
        paddingBottom: 'clamp(26px, 4vh, 36px)',
      }}
    >
      {/* Decorative room image — positioned absolute, behind text */}
      {imageSrc && (
        <div
          aria-hidden="true"
          className="pointer-events-none select-none"
          style={{
            position: 'absolute',
            top:      pos.top      ?? '0',
            right:    pos.right    ?? '0',
            bottom:   pos.bottom   ?? 'auto',
            left:     pos.left     ?? 'auto',
            width:    pos.width    ?? '55%',
            maxWidth: pos.maxWidth ?? '260px',
            zIndex: 0,
          }}
        >
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes="(max-width: 480px) 55vw, 260px"
            style={{ objectFit: 'contain', objectPosition: 'top right' }}
            priority
          />
        </div>
      )}

      {/* Text column — sits above image via z-index */}
      <div
        className="flex items-start justify-between relative"
        style={{ zIndex: 1 }}
      >
        <div style={{ maxWidth: resolvedTextMaxWidth, minWidth: 0 }}>

          {/* ── Static mode ── */}
          {mode === 'static' && (
            <>
              {eyebrow && (
                <p
                  className="font-medium tracking-widest uppercase"
                  style={{
                    fontSize: 11,
                    color: '#9B9590',
                    marginBottom: 10,
                    lineHeight: 1.4,
                  }}
                >
                  {eyebrow}
                </p>
              )}

              {title && (
                <h1
                  style={{
                    fontFamily: 'var(--font-playfair)',
                    fontWeight: 600,
                    fontSize: 'clamp(2rem, 8vw, 2.75rem)',
                    lineHeight: 1.1,
                    color: 'var(--bj-charcoal)',
                    letterSpacing: '-0.015em',
                    marginBottom: subtitle || dateLabel ? 14 : 0,
                  }}
                >
                  {title}
                </h1>
              )}
            </>
          )}

          {/* ── Greeting mode ── */}
          {mode === 'greeting' && greeting && (
            <h1
              className="text-3xl leading-snug text-gray-900"
              style={{
                fontFamily: 'var(--font-playfair)',
                fontWeight: 600,
                marginBottom: subtitle || dateLabel ? 8 : 0,
              }}
            >
              {greeting}
            </h1>
          )}

          {/* Subtitle — shared between modes */}
          {subtitle && (
            <p
              className="text-sm"
              style={{ color: '#6B6458', marginBottom: dateLabel ? 4 : 0 }}
            >
              {subtitle}
            </p>
          )}

          {/* Date label — shared between modes */}
          {dateLabel && (
            <p className="text-xs text-gray-400">
              {dateLabel}
            </p>
          )}
        </div>

        {/* Right-side action slot */}
        {action && (
          <div className="ml-3 mt-1 shrink-0" style={{ zIndex: 1 }}>
            {action}
          </div>
        )}
      </div>
    </header>
  )
}
