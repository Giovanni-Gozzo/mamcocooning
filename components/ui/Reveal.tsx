'use client'

import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

const OFFSETS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 28 },
  down: { x: 0, y: -28 },
  left: { x: 28, y: 0 },
  right: { x: -28, y: 0 },
  none: { x: 0, y: 0 },
}

interface RevealProps {
  readonly children: ReactNode
  readonly delay?: number
  readonly direction?: Direction
  readonly className?: string
}

/** Fades and lifts its children into view the first time they are scrolled to. */
export function Reveal({ children, delay = 0, direction = 'up', className }: RevealProps) {
  const prefersReducedMotion = useReducedMotion()
  const offset = prefersReducedMotion ? OFFSETS.none : OFFSETS[direction]

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, x: 0, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
