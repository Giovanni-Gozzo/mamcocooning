'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { HOUSE_TOUR } from '@/lib/site'

const SCROLL_STEP_RATIO = 0.82

/** The rail is inset, and scroll-snap aligns cards to that inset, not to 0. */
function scrollInset(rail: HTMLElement): number {
  return Number.parseFloat(getComputedStyle(rail).scrollPaddingLeft) || 0
}

export function HouseTour() {
  const railRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  /** Reads real card positions: the rail is padded, so an average width lies. */
  const syncFromScroll = useCallback(() => {
    const rail = railRef.current
    if (rail === null) return

    const cards = [...rail.querySelectorAll('figure')]
    const target = rail.scrollLeft + scrollInset(rail)
    const nearest = cards.reduce(
      (best, card, index) =>
        Math.abs(card.offsetLeft - target) < best.distance
          ? { index, distance: Math.abs(card.offsetLeft - target) }
          : best,
      { index: 0, distance: Number.POSITIVE_INFINITY },
    )

    setActiveIndex(nearest.index)
    setCanScrollLeft(rail.scrollLeft > 8)
    setCanScrollRight(rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 8)
  }, [])

  useEffect(() => {
    syncFromScroll()
  }, [syncFromScroll])

  function scrollByStep(direction: -1 | 1) {
    const rail = railRef.current
    if (rail === null) return
    rail.scrollBy({ left: direction * rail.clientWidth * SCROLL_STEP_RATIO, behavior: 'smooth' })
  }

  function scrollToIndex(index: number) {
    const rail = railRef.current
    const card = rail?.querySelectorAll('figure')[index]
    if (rail === null || card === undefined) return

    rail.scrollTo({ left: card.offsetLeft - scrollInset(rail), behavior: 'smooth' })
  }

  return (
    <section className="mt-28 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6">
        <SectionTitle
          eyebrow="La visite"
          title="Entrez, c'est ici que ça se passe"
          body="Neuf pièces pensées pour les tout-petits, photographiées telles qu'elles sont un jour ordinaire."
        />
      </div>

      <div className="relative mt-12">
        <div
          ref={railRef}
          onScroll={syncFromScroll}
          tabIndex={0}
          role="group"
          aria-label="Visite de la maison, faites défiler horizontalement"
          className="no-scrollbar flex snap-x snap-mandatory scroll-pl-6 gap-5 overflow-x-auto scroll-smooth px-6 pb-4 lg:scroll-pl-[max(1.5rem,calc((100vw-72rem)/2))] lg:px-[max(1.5rem,calc((100vw-72rem)/2))]"
        >
          {HOUSE_TOUR.map((stop, index) => (
            <motion.figure
              key={stop.image}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.7, delay: Math.min(index, 3) * 0.07 }}
              className="group relative w-[78vw] shrink-0 snap-start sm:w-[46vw] lg:w-[30rem]"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-sand ring-1 ring-clay/40">
                <Image
                  src={stop.image}
                  alt={stop.title}
                  fill
                  sizes="(max-width: 640px) 78vw, (max-width: 1024px) 46vw, 30rem"
                  className="object-cover transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                />
                <span className="absolute top-4 left-4 rounded-full bg-cream/90 px-3 py-1 text-xs font-bold tracking-wider text-terracotta-deep backdrop-blur">
                  {String(index + 1).padStart(2, '0')} / {HOUSE_TOUR.length}
                </span>
              </div>
              <figcaption className="px-1 pt-5">
                <h3 className="text-xl">{stop.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{stop.body}</p>
              </figcaption>
            </motion.figure>
          ))}
        </div>

        <div className="mx-auto mt-8 flex max-w-6xl items-center justify-between gap-6 px-6">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Aller à une pièce">
            {HOUSE_TOUR.map((stop, index) => (
              <button
                key={stop.image}
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                aria-label={stop.title}
                onClick={() => scrollToIndex(index)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  index === activeIndex ? 'w-10 bg-terracotta' : 'w-4 bg-clay hover:bg-blush'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <RailButton
              direction="left"
              disabled={!canScrollLeft}
              onClick={() => scrollByStep(-1)}
            />
            <RailButton
              direction="right"
              disabled={!canScrollRight}
              onClick={() => scrollByStep(1)}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

interface RailButtonProps {
  readonly direction: 'left' | 'right'
  readonly disabled: boolean
  readonly onClick: () => void
}

function RailButton({ direction, disabled, onClick }: RailButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="grid size-11 place-items-center rounded-full bg-sand text-ink ring-1 ring-clay/60 transition-all duration-300 hover:bg-terracotta hover:text-cream hover:ring-terracotta disabled:pointer-events-none disabled:opacity-35"
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
