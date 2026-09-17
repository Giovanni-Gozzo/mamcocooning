'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CategoryFilter } from './CategoryFilter'
import { Lightbox } from './Lightbox'
import type { CategoryWithCount, Photo } from '@/lib/types'

const STAGGER_CAP = 12

interface GalleryGridProps {
  readonly photos: readonly Photo[]
  readonly categories: readonly CategoryWithCount[]
  readonly initialCategory?: string | null
}

export function GalleryGrid({ photos, categories, initialCategory = null }: GalleryGridProps) {
  const [activeSlug, setActiveSlug] = useState<string | null>(initialCategory)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const visiblePhotos = useMemo(
    () =>
      activeSlug === null
        ? photos
        : photos.filter((photo) => photo.categorySlug === activeSlug),
    [photos, activeSlug],
  )

  function selectCategory(slug: string | null) {
    setOpenIndex(null)
    setActiveSlug(slug)
  }

  if (photos.length === 0) {
    return (
      <p className="rounded-[2rem] bg-sand/70 px-8 py-16 text-center text-ink-soft ring-1 ring-clay/40">
        Les premières photos arrivent très bientôt.
      </p>
    )
  }

  return (
    <div>
      <CategoryFilter
        categories={categories}
        activeSlug={activeSlug}
        onChange={selectCategory}
        totalCount={photos.length}
      />

      <div
        className="mt-10 columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4"
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout">
          {visiblePhotos.map((photo, index) => (
            <motion.button
              key={photo.id}
              type="button"
              layout
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{
                duration: 0.55,
                delay: Math.min(index, STAGGER_CAP) * 0.035,
                ease: [0.22, 1, 0.36, 1],
              }}
              onClick={() => setOpenIndex(index)}
              className="group relative block w-full cursor-zoom-in overflow-hidden rounded-[1.4rem] bg-sand ring-1 ring-clay/35 transition-shadow duration-500 hover:shadow-[0_26px_55px_-30px_rgba(56,45,40,0.75)]"
              style={{ breakInside: 'avoid' }}
            >
              <Image
                src={photo.url}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="h-auto w-full transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                loading={index < 8 ? 'eager' : 'lazy'}
              />

              <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-ink/85 via-ink/40 to-transparent px-4 pt-12 pb-3.5 text-left text-[0.8rem] font-semibold text-cream opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                {photo.caption ?? photo.alt}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {visiblePhotos.length === 0 && (
        <p className="mt-10 rounded-[2rem] bg-sand/70 px-8 py-14 text-center text-ink-soft ring-1 ring-clay/40">
          Pas encore de photo dans cette catégorie.
        </p>
      )}

      <Lightbox
        photos={visiblePhotos}
        activeIndex={openIndex}
        onClose={() => setOpenIndex(null)}
        onNavigate={setOpenIndex}
      />
    </div>
  )
}
