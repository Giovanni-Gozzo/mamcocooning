'use client'

import { motion, useReducedMotion } from 'motion/react'

interface SplitTextProps {
  readonly text: string
  readonly className?: string
  readonly delay?: number
}

/** Animates a headline word by word, so it "settles" rather than just appears. */
export function SplitText({ text, className, delay = 0 }: SplitTextProps) {
  const prefersReducedMotion = useReducedMotion()
  const words = text.split(' ')

  if (prefersReducedMotion) return <span className={className}>{text}</span>

  return (
    <span>
      {words.map((word, index) => (
        <motion.span
          // Words repeat inside a headline, so the index is part of the key.
          key={`${word}-${index}`}
          // The class goes on each word: a gradient clipped to text only paints
          // the box it is declared on, and every word is its own box here.
          className={`inline-block whitespace-pre ${className ?? ''}`}
          initial={{ opacity: 0, y: '0.45em' }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.7,
            delay: delay + index * 0.055,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {word}
          {index < words.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </span>
  )
}
