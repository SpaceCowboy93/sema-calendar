/**
 * C2 Room Header Configuration
 *
 * Single source of truth for botanical artwork paths, fit mode, and
 * positioning for each room header.
 *
 * Asset dimensions:
 *   finances  659×356  landscape 1.85:1  → cover
 *   us        671×356  landscape 1.88:1  → cover
 *   home      435×535  portrait  0.81:1  → contain (right-anchored panel)
 *   planner   444×535  portrait  0.83:1  → contain (right-anchored panel)
 *   shopping  440×535  portrait  0.82:1  → contain (right-anchored panel)
 *
 * Portrait images use `contain` so the full artwork is visible as a
 * vertical panel on the right; the cream header background shows through
 * on the left, providing a natural text area without any gradient.
 *
 * Landscape images use `cover`; a soft left-to-right gradient overlay
 * is applied automatically to protect text legibility.
 */

export type C2RoomId =
  | 'home'
  | 'planner'
  | 'shopping'
  | 'finances'
  | 'us'

export type C2RoomHeaderConfig = {
  /** Botanical artwork path (served from /public). */
  src: string
  /** 'cover' for landscape images, 'contain' for portrait images. */
  imageObjectFit: 'cover' | 'contain'
  /**
   * CSS object-position.
   * cover:   which part stays visible when cropping.
   * contain: which edge/corner the artwork anchors to.
   */
  imageObjectPosition: string
}

export const C2_ROOM_HEADERS: Record<C2RoomId, C2RoomHeaderConfig> = {
  home: {
    src:                 '/assets/c2/botanical/home-header.webp',
    imageObjectFit:      'contain',
    // Portrait panel anchored bottom-right; flowers (bottom of image)
    // and olive frame (all edges) fully visible. Cream shows left for text.
    imageObjectPosition: 'right bottom',
  },
  planner: {
    src:                 '/assets/c2/botanical/planner-header.webp',
    imageObjectFit:      'contain',
    // Portrait panel anchored right-center; eucalyptus fills the image
    // evenly so centering vertically shows the full composition.
    imageObjectPosition: 'right center',
  },
  shopping: {
    src:                 '/assets/c2/botanical/shopping-header.webp',
    imageObjectFit:      'contain',
    // Portrait panel anchored top-right; olive clusters at the top
    // corners remain prominent and un-cropped.
    imageObjectPosition: 'right top',
  },
  finances: {
    src:                 '/assets/c2/botanical/finances-header.webp',
    imageObjectFit:      'cover',
    // Landscape 1.85:1 in ~1.77:1 container — minimal crop.
    // Olive branches are at the bottom; center keeps the cream top-left
    // clear for the title while showing branches at the bottom edge.
    imageObjectPosition: 'center center',
  },
  us: {
    src:                 '/assets/c2/botanical/us-header.webp',
    imageObjectFit:      'cover',
    // Landscape 1.88:1 in ~1.77:1 container — minimal crop.
    // Pink poppies anchor the bottom; anchoring top keeps the cream/blush
    // area visible at top-left where the title sits.
    imageObjectPosition: 'center top',
  },
}
