'use client'

import { useEffect, useState } from 'react'

export function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** Keep the new iPhone controls out of existing Android/desktop screens. */
export function useIOSDevice() {
  const [ios, setIOS] = useState(false)
  useEffect(() => { setIOS(isIOSDevice()) }, [])
  return ios
}
