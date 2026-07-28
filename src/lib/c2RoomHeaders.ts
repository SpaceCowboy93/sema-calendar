/**
 * C2 Room Header Configuration
 *
 * Single source of truth for botanical artwork paths and object-position
 * for each room header. Images live in /public/assets/c2/botanical/.
 *
 * imageObjectPosition: CSS object-position string to tune which part of
 * the landscape composition is shown on narrow mobile viewports.
 */

export type C2RoomId =
  | 'home'
  | 'planner'
  | 'shopping'
  | 'finances'
  | 'us'

export type C2RoomHeaderConfig = {
  /** Path to the botanical artwork (served from /public). */
  src: string
  /**
   * CSS object-position for background-cover cropping on mobile.
   * Tune per room to keep the main botanical elements visible.
   */
  imageObjectPosition: string
}

export const C2_ROOM_HEADERS: Record<C2RoomId, C2RoomHeaderConfig> = {
  home: {
    src:                 '/assets/c2/botanical/home-header.webp',
    // White flowers bottom-left, olive branches top-right — centered crop works well
    imageObjectPosition: 'center center',
  },
  planner: {
    src:                 '/assets/c2/botanical/planner-header.webp',
    // Eucalyptus sweeping down from top-center — anchor to top
    imageObjectPosition: 'center top',
  },
  shopping: {
    src:                 '/assets/c2/botanical/shopping-header.webp',
    // Olive clusters concentrated top-right corner
    imageObjectPosition: 'right top',
  },
  finances: {
    src:                 '/assets/c2/botanical/finances-header.webp',
    // Horizontal olive branch arrangement, bottom-left composition
    imageObjectPosition: 'left bottom',
  },
  us: {
    src:                 '/assets/c2/botanical/us-header.webp',
    // Pink poppies on the right, soft blush left — anchor right
    imageObjectPosition: 'right center',
  },
}
