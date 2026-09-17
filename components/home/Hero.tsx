'use client'

import Image from 'next/image'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { ButtonLink } from '@/components/ui/Button'
import { CloudDivider } from '@/components/ui/CloudDivider'
import { CloudLayer } from '@/components/ui/CloudLayer'
import { FloatingDoodles, type DoodleSpec } from '@/components/ui/FloatingDoodles'
import { FloatingJungle, type JungleSpec } from '@/components/ui/FloatingJungle'
import { Magnetic } from '@/components/ui/Magnetic'
import { SplitText } from '@/components/ui/SplitText'
import { HOUSE_TOUR, SITE } from '@/lib/site'
import { useRichMotion } from '@/lib/use-rich-motion'

const PARALLAX_RANGE_PX = 900

/** Toys in the page gutters. Hidden below lg, where there are no gutters. */
const HERO_DOODLES: readonly DoodleSpec[] = [
  { name: 'star', className: 'left-[2.5%] top-[26%] hidden w-7 lg:block', color: 'text-honey/75', tilt: -8 },
  { name: 'teddy', className: 'left-[1.5%] top-[44%] hidden w-16 lg:block', color: 'text-clay', tilt: -10, delay: '-4s' },
  { name: 'blocks', className: 'left-[3%] bottom-[16%] hidden w-12 lg:block', color: 'text-sage/55', tilt: 5, delay: '-1s' },
  { name: 'balloon', className: 'right-[2%] top-[18%] hidden w-11 lg:block', color: 'text-blush', tilt: 6, delay: '-2s' },
  { name: 'rattle', className: 'right-[1.5%] top-[48%] hidden w-11 lg:block', color: 'text-blush/85', tilt: -14, delay: '-5s' },
  { name: 'star', className: 'right-[3.5%] bottom-[20%] hidden w-5 lg:block', color: 'text-terracotta/45', tilt: 12, delay: '-3s' },
]

/** Foliage anchored to the bottom corners, as if the page grew out of it. */
const HERO_JUNGLE: readonly JungleSpec[] = [
  { name: 'monstera', className: 'left-[-2%] bottom-[-6%] w-24 sm:w-32', color: 'text-jungle/25', tilt: -12 },
  { name: 'palmLeaf', className: 'left-[6%] bottom-[-8%] hidden w-28 sm:block', color: 'text-leaf/30', tilt: 8, delay: '-3s' },
  { name: 'fern', className: 'right-[-1%] bottom-[-4%] w-20 sm:w-24', color: 'text-jungle/20', tilt: 10, delay: '-5s' },
  { name: 'hibiscus', className: 'right-[9%] bottom-[2%] hidden w-12 sm:block', color: 'text-hibiscus/45', tilt: -6, delay: '-2s' },
]

const CARDS = [
  { stop: HOUSE_TOUR[0], className: 'col-span-7 row-span-4' },
  { stop: HOUSE_TOUR[3], className: 'col-span-5 row-span-3' },
  { stop: HOUSE_TOUR[1], className: 'col-span-5 row-span-3' },
  { stop: HOUSE_TOUR[5], className: 'col-span-7 row-span-2' },
] as const

export function Hero() {
  const prefersReducedMotion = useReducedMotion()
  const isRichMotion = useRichMotion()

  // Mapped from absolute scroll pixels rather than a target's progress: an
  // element-relative range degenerates on short viewports and can fade the hero
  // out before the visitor has scrolled at all.
  const { scrollY } = useScroll()
  const contentY = useSpring(useTransform(scrollY, [0, PARALLAX_RANGE_PX], [0, 70]), {
    stiffness: 90,
    damping: 24,
  })
  const contentOpacity = useTransform(scrollY, [0, PARALLAX_RANGE_PX], [1, 0])

  return (
    <section
      className="grain relative overflow-hidden px-6 pt-32 pb-10 sm:pt-36 lg:pb-14"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#c6dff0_0%,#dbe9f0_22%,#f0e9e0_52%,var(--color-cream)_88%)]" />
        <CloudLayer className="h-[52%]" />
        <div className="animate-blob-drift absolute -bottom-20 -left-32 size-[26rem] bg-terracotta-soft/35 blur-[120px]" />
        <div
          className="animate-blob-drift absolute -right-32 -bottom-24 size-[28rem] bg-sage-soft/40 blur-[120px]"
          style={{ animationDelay: '-11s' }}
        />
      </div>

      <FloatingJungle items={HERO_JUNGLE} className="-z-10" />
      <FloatingDoodles doodles={HERO_DOODLES} className="-z-10" />

      <motion.div
        style={isRichMotion ? { y: contentY, opacity: contentOpacity } : undefined}
        className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16"
      >
        <div>
          <motion.span
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full bg-cream/80 px-3.5 py-2 text-[0.66rem] font-bold tracking-[0.06em] text-terracotta-deep uppercase ring-1 ring-clay/60 backdrop-blur sm:px-4 sm:text-xs sm:tracking-[0.14em]"
          >
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-sage opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-sage-deep" />
            </span>
            {SITE.address.city} · de 0 à 3 ans
          </motion.span>

          <h1 className="mt-6 text-[clamp(2.6rem,7vw,4.6rem)] leading-[1.02]">
            <SplitText text="Un cocon pour" delay={0.05} />
            <br />
            <SplitText text="grandir" delay={0.22} className="text-gradient-warm" />{' '}
            <SplitText text="en douceur" delay={0.32} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="mt-7 max-w-xl text-[1.1rem] leading-relaxed text-ink-soft"
          >
            Deux assistantes maternelles agréées, une vraie maison avec jardin, et un petit
            groupe où chacun a sa place. Ici, votre enfant est attendu — pas juste gardé.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.58 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Magnetic>
              <ButtonLink href={`tel:${SITE.phoneHref}`}>Appelez-nous</ButtonLink>
            </Magnetic>
            <Magnetic>
              <ButtonLink href="/galerie" variant="secondary">
                Voir leurs journées
              </ButtonLink>
            </Magnetic>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.72 }}
            className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-ink-soft"
          >
            {['Agréées par le Département', 'Jardin clos et sécurisé', 'Photos chaque semaine'].map(
              (item) => (
                <li key={item} className="flex items-center gap-2">
                  <span aria-hidden className="text-sage-deep">
                    ✓
                  </span>
                  {item}
                </li>
              ),
            )}
          </motion.ul>
        </div>

        <div className="grid aspect-[5/6] grid-cols-12 grid-rows-6 gap-3 sm:gap-4">
          {CARDS.map((card, index) => (
            <FloatingCard key={card.stop.image} card={card} index={index} />
          ))}
        </div>
      </motion.div>

      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.7 }}
        className="mx-auto mt-10 flex max-w-6xl justify-center lg:justify-start"
      >
        <motion.span
          animate={{ y: [0, 9, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-2 text-xs font-semibold tracking-[0.18em] text-ink-faint uppercase"
        >
          Faites défiler
          <span className="h-9 w-px bg-gradient-to-b from-clay to-transparent" />
        </motion.span>
      </motion.div>

      <div className="absolute inset-x-0 bottom-0">
        <CloudDivider className="text-cream" />
      </div>
    </section>
  )
}

interface FloatingCardProps {
  readonly card: (typeof CARDS)[number]
  readonly index: number
}

function FloatingCard({ card, index }: FloatingCardProps) {
  const prefersReducedMotion = useReducedMotion()
  const isRichMotion = useRichMotion()

  return (
    <motion.figure
      className={`group relative overflow-hidden rounded-[2rem] shadow-[0_24px_60px_-30px_rgba(56,45,40,0.6)] ring-1 ring-cream/60 ${card.className}`}
      initial={{ opacity: 0, y: 40, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.12 + index * 0.09, ease: [0.22, 1, 0.36, 1] }}
      whileHover={prefersReducedMotion ? undefined : { y: -8, transition: { duration: 0.35 } }}
    >
      <Image
        src={card.stop.image}
        alt={card.stop.title}
        fill
        sizes="(max-width: 1024px) 45vw, 26vw"
        className="object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07]"
        priority={index < 2}
      />
      <figcaption className="absolute inset-x-0 bottom-0 translate-y-1 bg-gradient-to-t from-ink/80 to-transparent px-4 pt-10 pb-3 text-[0.78rem] font-semibold text-cream opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
        {card.stop.title}
      </figcaption>
    </motion.figure>
  )
}
