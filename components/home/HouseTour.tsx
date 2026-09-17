'use client'

import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { FloatingJungle, type JungleSpec } from '@/components/ui/FloatingJungle'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { HOUSE_TOUR } from '@/lib/site'

const SCENE_JUNGLE: readonly JungleSpec[] = [
  { name: 'monstera', className: 'left-[1%] bottom-[6%] hidden w-24 lg:block', color: 'text-jungle/20', tilt: -10 },
  { name: 'giraffe', className: 'left-[5%] top-[18%] hidden w-16 xl:block', color: 'text-honey/55', tilt: 6, delay: '-2s' },
  { name: 'palmLeaf', className: 'right-[1%] bottom-[8%] hidden w-24 lg:block', color: 'text-leaf/30', tilt: 12, delay: '-4s' },
  { name: 'monkey', className: 'right-[5%] top-[20%] hidden w-14 xl:block', color: 'text-clay', tilt: -8, delay: '-1s' },
]

/** Cards further than this from the active one are not rendered at all. */
const VISIBLE_NEIGHBOURS = 2
const SWIPE_THRESHOLD_PX = 60

interface CardTransform {
  readonly x: string
  readonly rotateY: number
  readonly z: number
  readonly scale: number
  readonly opacity: number
  readonly zIndex: number
}

/** Places a card on an arc around the viewer, based on its distance from centre. */
function transformFor(offset: number, isFlat: boolean): CardTransform {
  const distance = Math.abs(offset)
  const direction = Math.sign(offset)

  if (isFlat) {
    return {
      x: `${offset * 100}%`,
      rotateY: 0,
      z: 0,
      scale: 1,
      opacity: distance === 0 ? 1 : 0,
      zIndex: 10 - distance,
    }
  }

  return {
    x: `${direction * (38 + (distance - 1) * 26)}%`,
    rotateY: -direction * 34,
    z: -distance * 170,
    scale: 1 - distance * 0.08,
    opacity: 1 - distance * 0.22,
    zIndex: 10 - distance,
  }
}

/** Shortest signed distance between two cards on a loop, e.g. 8 -> 0 is +1. */
function wrappedOffset(index: number, activeIndex: number, total: number): number {
  const half = Math.floor(total / 2)
  return (((index - activeIndex + half + total) % total) - half)
}

export function HouseTour() {
  const [activeIndex, setActiveIndex] = useState(0)
  const prefersReducedMotion = useReducedMotion() ?? false
  const total = HOUSE_TOUR.length

  const goTo = useCallback((index: number) => setActiveIndex(((index % total) + total) % total), [total])

  const step = useCallback(
    (delta: number) => setActiveIndex((current) => (current + delta + total) % total),
    [total],
  )

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      const stage = document.getElementById('visite-scene')
      if (stage === null || !stage.contains(document.activeElement)) return
      if (event.key === 'ArrowRight') step(1)
      if (event.key === 'ArrowLeft') step(-1)
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [step])

  const activeStop = HOUSE_TOUR[activeIndex]

  return (
    <section className="relative mt-28 overflow-hidden">
      <FloatingJungle items={SCENE_JUNGLE} />

      <div className="mx-auto max-w-6xl px-6">
        <SectionTitle
          eyebrow="La visite"
          title="Entrez, c'est ici que ça se passe"
          body="Neuf pièces pensées pour les tout-petits, photographiées telles qu'elles sont un jour ordinaire."
        />
      </div>

      <div
        id="visite-scene"
        tabIndex={0}
        role="group"
        aria-roledescription="carrousel"
        aria-label="Visite de la maison"
        className="relative mx-auto mt-14 h-[clamp(17rem,42vw,26rem)] w-full max-w-5xl rounded-3xl outline-offset-8"
        style={{ perspective: '1500px', transformStyle: 'preserve-3d' }}
      >
        {HOUSE_TOUR.map((stop, index) => {
          const offset = wrappedOffset(index, activeIndex, total)
          if (Math.abs(offset) > VISIBLE_NEIGHBOURS) return null

          const placement = transformFor(offset, prefersReducedMotion)
          const isActive = offset === 0

          return (
            <motion.button
              key={stop.image}
              type="button"
              aria-label={isActive ? undefined : `Voir ${stop.title}`}
              aria-hidden={placement.opacity === 0}
              tabIndex={isActive ? -1 : 0}
              onClick={() => goTo(index)}
              drag={isActive ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.14}
              onDragEnd={(_event, info) => {
                if (info.offset.x < -SWIPE_THRESHOLD_PX) step(1)
                if (info.offset.x > SWIPE_THRESHOLD_PX) step(-1)
              }}
              animate={{
                x: placement.x,
                rotateY: placement.rotateY,
                z: placement.z,
                scale: placement.scale,
                opacity: placement.opacity,
              }}
              transition={{ type: 'spring', stiffness: 170, damping: 26, mass: 0.9 }}
              style={{
                zIndex: placement.zIndex,
                transformStyle: 'preserve-3d',
                cursor: isActive ? 'grab' : 'pointer',
              }}
              className="absolute top-0 left-1/2 h-full w-[76%] -translate-x-1/2 overflow-hidden rounded-[2rem] bg-sand shadow-[0_40px_80px_-40px_rgba(56,45,40,0.75)] ring-1 ring-clay/40 sm:w-[58%]"
            >
              <Image
                src={stop.image}
                alt={stop.title}
                fill
                sizes="(max-width: 640px) 76vw, 36rem"
                className="pointer-events-none object-cover"
                priority={index < 3}
                draggable={false}
              />

              <span
                aria-hidden
                className={`absolute inset-0 bg-ink/45 transition-opacity duration-500 ${
                  isActive ? 'opacity-0' : 'opacity-100'
                }`}
              />
            </motion.button>
          )
        })}
      </div>

      <div className="mx-auto mt-10 max-w-2xl px-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStop?.image}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
            aria-live="polite"
          >
            <h3 className="text-2xl">{activeStop?.title}</h3>
            <p className="mt-2 leading-relaxed text-ink-soft">{activeStop?.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-center gap-3 sm:gap-5">
          <StageButton direction="left" onClick={() => step(-1)} />

          <div className="flex flex-nowrap justify-center gap-1 sm:gap-1.5">
            {HOUSE_TOUR.map((stop, index) => (
              <button
                key={stop.image}
                type="button"
                aria-label={stop.title}
                aria-current={index === activeIndex}
                onClick={() => goTo(index)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  index === activeIndex
                    ? 'w-8 bg-terracotta sm:w-10'
                    : 'w-3 bg-clay hover:bg-blush sm:w-4'
                }`}
              />
            ))}
          </div>

          <StageButton direction="right" onClick={() => step(1)} />
        </div>
      </div>
    </section>
  )
}

interface StageButtonProps {
  readonly direction: 'left' | 'right'
  readonly onClick: () => void
}

function StageButton({ direction, onClick }: StageButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid size-11 shrink-0 place-items-center rounded-full bg-sand text-ink ring-1 ring-clay/60 transition-all duration-300 hover:bg-terracotta hover:text-cream hover:ring-terracotta"
    >
      <span className="sr-only">{direction === 'left' ? 'Pièce précédente' : 'Pièce suivante'}</span>
      <svg aria-hidden viewBox="0 0 24 24" fill="none" className="size-5">
        <path
          d={direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}
