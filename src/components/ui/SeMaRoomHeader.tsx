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

  /** Path to the botanical header image (served from /public). */
  imageSrc?: string

  /** Alt text — pass "" for purely decorative images. */
  imageAlt?: string

  /**
   * 'cover'   — landscape images: fills the full header, minimal crop.
   * 'contain' — portrait images: shows full artwork anchored to the right,
   *             cream background shows through on the left for text.
   * Defaults to 'cover'.
   */
  imageObjectFit?: 'cover' | 'contain'

  /**
   * CSS object-position.
   * cover:   tune which area stays visible when cropping (e.g. 'center top')
   * contain: controls anchor side/edge (e.g. 'right bottom')
   */
  imageObjectPosition?: string

  /** Right-aligned slot — e.g. Sign Out button. */
  action?: React.ReactNode

  className?: string
}

/**
 * SeMaRoomHeader — shared presentational header for all C2 rooms.
 *
 * Full-width botanical artwork fills the header as a background.
 * A soft left-side gradient ensures typography remains legible over
 * the watercolor paper composition.
 *
 * Pure display component: no store reads, no Living Moment logic,
 * no generated SVG, no Framer Motion.
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
  imageObjectFit = 'cover',
  imageObjectPosition,
  action,
  className,
}: SeMaRoomHeaderProps) {
  const defaultPosition = imageObjectFit === 'contain' ? 'right center' : 'center center'
  const resolvedPosition = imageObjectPosition ?? defaultPosition

  return (
    <header
      className={['relative overflow-hidden', className].filter(Boolean).join(' ')}
      style={{
        minHeight: 'clamp(200px, 50vw, 260px)',
        background: 'var(--bj-cream)',
      }}
    >
      {/* Botanical artwork */}
      {imageSrc && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none select-none"
        >
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            sizes="100vw"
            style={{
              objectFit: imageObjectFit,
              objectPosition: resolvedPosition,
            }}
            priority
          />

          {/*
           * Gradient overlay — only for cover (landscape) images where artwork
           * fills the full header and may overlap the text column.
           *
           * For contain (portrait) images, the cream background shows through
           * on the left naturally, so no gradient is needed.
           */}
          {imageObjectFit === 'cover' && (
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to right, rgba(253,250,245,0.88) 0%, rgba(253,250,245,0.60) 35%, rgba(253,250,245,0.20) 60%, transparent 80%)',
              }}
            />
          )}
        </div>
      )}

      {/* Text column — sits above artwork via z-index */}
      <div
        className="relative z-10 flex items-start justify-between"
        style={{
          paddingInline: 20,
          paddingTop: 'clamp(44px, 7vh, 60px)',
          paddingBottom: 'clamp(22px, 4vh, 32px)',
        }}
      >
        <div style={{ maxWidth: '62%', minWidth: 0 }}>

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
              className="leading-snug"
              style={{
                fontFamily: 'var(--font-playfair)',
                fontWeight: 600,
                fontSize: 'clamp(1.75rem, 7vw, 2.5rem)',
                color: 'var(--bj-charcoal)',
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
            <p className="text-xs" style={{ color: '#9B9590' }}>
              {dateLabel}
            </p>
          )}
        </div>

        {/* Right-side action slot */}
        {action && (
          <div className="ml-3 mt-1 shrink-0">
            {action}
          </div>
        )}
      </div>
    </header>
  )
}
