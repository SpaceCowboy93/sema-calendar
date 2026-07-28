/**
 * C2 Room Header Configuration
 *
 * All headers use object-fit: cover — the botanical artwork fills the
 * entire header canvas. object-position places the natural cream paper
 * area of each composition behind the text column (left side).
 *
 * Asset dimensions for reference:
 *   finances  659×356  landscape 1.85:1
 *   us        671×356  landscape 1.88:1
 *   home      435×535  portrait  0.81:1  (covers by width; ~top half shows)
 *   planner   444×535  portrait  0.83:1  (covers by width; ~top half shows)
 *   shopping  440×535  portrait  0.82:1  (covers by width; ~top half shows)
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
  /**
   * CSS object-position for cover cropping.
   * Controls which part of the composition is visible in the header crop.
   * Text lives at top-left — position should keep cream paper there.
   */
  imageObjectPosition: string
}

export const C2_ROOM_HEADERS: Record<C2RoomId, C2RoomHeaderConfig> = {
  home: {
    src: '/assets/c2/botanical/home-header.webp',
    // Portrait — covers by width, ~top 47% of image shows.
    // Top of image: olive branches across upper edges, cream center-left.
    // Slight downward offset surfaces more of the botanical frame.
    imageObjectPosition: 'center 15%',
  },
  planner: {
    src: '/assets/c2/botanical/planner-header.webp',
    // Portrait — covers by width, ~top 48% shows.
    // Eucalyptus arches from upper-left and lower-right; top section
    // has the main arch with cream upper-right for the title.
    imageObjectPosition: 'center top',
  },
  shopping: {
    src: '/assets/c2/botanical/shopping-header.webp',
    // Portrait — covers by width, ~top 47% shows.
    // Olive clusters prominent at top corners; cream center is wide.
    imageObjectPosition: 'center top',
  },
  finances: {
    src: '/assets/c2/botanical/finances-header.webp',
    // Landscape 1.85:1 — near-perfect fit, minimal crop.
    // Horizontal olive branch composition; center keeps branches visible
    // at edges while cream paper shows at top-left for the title.
    imageObjectPosition: 'center center',
  },
  us: {
    src: '/assets/c2/botanical/us-header.webp',
    // Landscape 1.88:1 — near-perfect fit, minimal crop.
    // Pink poppies at bottom; top anchor keeps cream/blush upper area
    // clear for the title and sign-out action.
    imageObjectPosition: 'center top',
  },
}
