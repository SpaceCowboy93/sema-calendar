/**
 * C2 Room Header Configuration
 *
 * Single source of truth for placeholder paths, final asset paths,
 * image positioning and text-width for each room header.
 *
 * When approved C2 botanical images are supplied, update `finalSrc` for
 * each room and switch the SeMaRoomHeader imageSrc from placeholderSrc
 * to finalSrc. No other code needs to change.
 */

export type C2RoomId =
  | 'home'
  | 'planner'
  | 'shopping'
  | 'finances'
  | 'us'

export type C2RoomHeaderConfig = {
  /** Temporary layout placeholder — transparent PNG, zero visual weight. */
  placeholderSrc: string
  /** Final approved botanical image asset path (to be supplied by user). */
  finalSrc: string
  /** Max-width of the text column to keep it clear of the image. */
  textMaxWidth: string
  /** CSS positioning values for the image wrapper inside <header>. */
  imagePosition: {
    top?: string
    right?: string
    bottom?: string
    left?: string
    width?: string
    maxWidth?: string
  }
}

/**
 * Shared layout defaults.
 * All five rooms use the same positioning baseline.
 * Override individual rooms only when the approved artwork requires it.
 */
const DEFAULT_IMAGE_POSITION: C2RoomHeaderConfig['imagePosition'] = {
  top:      '0',
  right:    '0',
  width:    '55%',
  maxWidth: '260px',
}

export const C2_ROOM_HEADERS: Record<C2RoomId, C2RoomHeaderConfig> = {
  home: {
    placeholderSrc: '/images/headers/home-c2-placeholder.png',
    finalSrc:       '/images/headers/home-c2.webp',
    textMaxWidth:   '62%',
    imagePosition:  DEFAULT_IMAGE_POSITION,
  },
  planner: {
    placeholderSrc: '/images/headers/planner-c2-placeholder.png',
    finalSrc:       '/images/headers/planner-c2.webp',
    textMaxWidth:   '62%',
    imagePosition:  DEFAULT_IMAGE_POSITION,
  },
  shopping: {
    placeholderSrc: '/images/headers/shopping-c2-placeholder.png',
    finalSrc:       '/images/headers/shopping-c2.webp',
    textMaxWidth:   '62%',
    imagePosition:  DEFAULT_IMAGE_POSITION,
  },
  finances: {
    placeholderSrc: '/images/headers/finances-c2-placeholder.png',
    finalSrc:       '/images/headers/finances-c2.webp',
    textMaxWidth:   '62%',
    imagePosition:  DEFAULT_IMAGE_POSITION,
  },
  us: {
    placeholderSrc: '/images/headers/us-c2-placeholder.png',
    finalSrc:       '/images/headers/us-c2.webp',
    textMaxWidth:   '58%',
    imagePosition:  DEFAULT_IMAGE_POSITION,
  },
}
