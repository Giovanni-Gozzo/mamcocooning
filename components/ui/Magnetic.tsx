'use client'

import { type ReactNode, useRef } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'

const PULL_STRENGTH = 0.28
const SPRING = { stiffness: 220, damping: 18, mass: 0.6 }

interface MagneticProps {
  readonly children: ReactNode
  readonly className?: string
}

/** Nudges its child toward the cursor — a small "alive" cue on pointer devices. */
export function Magnetic({ children, className }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const x = useSpring(useMotionValue(0), SPRING)
  const y = useSpring(useMotionValue(0), SPRING)

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    if (prefersReducedMotion || event.pointerType !== 'mouse') return
    const bounds = ref.current?.getBoundingClientRect()
    if (bounds === undefined) return
    x.set((event.clientX - (bounds.left + bounds.width / 2)) * PULL_STRENGTH)
    y.set((event.clientY - (bounds.top + bounds.height / 2)) * PULL_STRENGTH)
  }

  function handleLeave() {
    x.set(0)
    y.set(0)
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x, y }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      {children}
    </motion.div>
  )
}
