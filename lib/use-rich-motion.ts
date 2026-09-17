'use client'

import { useEffect, useState } from 'react'

/**
 * True only on a wide screen whose owner has not asked for reduced motion.
 *
 * Scroll-linked effects are driven from JavaScript, so on a phone they always
 * trail the finger by a frame or two. They are a pointer-device luxury; small
 * screens get the layout without them.
 *
 * Starts false so the server and the first client render agree.
 */
export function useRichMotion(): boolean {
  const [isRich, setIsRich] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px) and (prefers-reduced-motion: no-preference)')
    setIsRich(query.matches)

    const handleChange = (event: MediaQueryListEvent) => setIsRich(event.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  return isRich
}
