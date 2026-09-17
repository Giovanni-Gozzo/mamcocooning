'use client'

import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

const OFFSETS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 20 },
  down: { x: 0, y: -20 },
  left: { x: 20, y: 0 },
  right: { x: -20, y: 0 },
  none: { x: 0, y: 0 },
}

/** Starts the reveal just before the element reaches the screen. */
const TRIGGER_MARGIN = '0px 0px 140px 0px'
const DURATION_S = 0.45

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
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: TRIGGER_MARGIN }}
      transition={{ duration: DURATION_S, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
