'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, useInView, useReducedMotion } from 'motion/react'
import { STATS } from '@/lib/site'

const COUNT_DURATION_S = 1.6

export function Stats() {
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="grid gap-px overflow-hidden rounded-[2.5rem] bg-clay/50 ring-1 ring-clay/50 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat, index) => (
          <div key={stat.label} className="bg-cream px-7 py-9 text-center sm:text-left">
            <p className="font-display text-[2.6rem] leading-none font-semibold text-terracotta">
              <Counter target={stat.value} delay={index * 0.1} />
              {stat.suffix}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/** Counts up to its target the first time it scrolls into view. */
function Counter({ target, delay }: { readonly target: number; readonly delay: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })
  const prefersReducedMotion = useReducedMotion()
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!isInView) return

    if (prefersReducedMotion) {
      setValue(target)
      return
    }

    const controls = animate(0, target, {
      duration: COUNT_DURATION_S,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setValue(Math.round(latest)),
    })

    return () => controls.stop()
  }, [isInView, target, delay, prefersReducedMotion])

  return <span ref={ref}>{value}</span>
}
