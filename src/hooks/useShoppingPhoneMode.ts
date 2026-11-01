'use client'

import { useEffect, useState } from 'react'
import { isIOSDevice } from './useIOSDevice'

/** Include narrow laptop previews without changing existing Android behavior. */
export function useShoppingPhoneMode() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 767px)')
    const update = () => setEnabled(isIOSDevice()
      || (narrow.matches && !/Android/i.test(navigator.userAgent)))
    update()
    narrow.addEventListener('change', update)
    return () => narrow.removeEventListener('change', update)
  }, [])
  return enabled
}
