'use client'

import Image from 'next/image'
import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CategoryFilter } from './CategoryFilter'
import { Lightbox } from './Lightbox'
import { GALLERY_PAGE_SIZE } from '@/lib/gallery'
import type { CategoryWithCount, Photo } from '@/lib/types'

const STAGGER_CAP = 6

interface GalleryGridProps {
  readonly initialPhotos: readonly Photo[]
  readonly categories: readonly CategoryWithCount[]
  readonly initialCategory?: string | null
}

function countFor(
  categories: readonly CategoryWithCount[],
  slug: string | null,
): number {
  if (slug === null) {
    return categories.reduce((total, category) => total + category.photoCount, 0)
  }
  return categories.find((category) => category.slug === slug)?.photoCount ?? 0
}

export function GalleryGrid({
  initialPhotos,
  categories,
  initialCategory = null,
}: GalleryGridProps) {
  const [photos, setPhotos] = useState<readonly Photo[]>(initialPhotos)
  const [activeSlug, setActiveSlug] = useState<string | null>(initialCategory)
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalForScope = countFor(categories, activeSlug)
  const hasMore = photos.length < totalForScope

  const fetchPage = useCallback(
    async (slug: string | null, offset: number): Promise<readonly Photo[] | null> => {
      const params = new URLSearchParams({
        limit: String(GALLERY_PAGE_SIZE),
        offset: String(offset),
      })
      if (slug !== null) params.set('category', slug)

      try {
        const response = await fetch(`/api/photos?${params}`)
        const payload = await response.json()

        if (!response.ok || payload.success !== true) {
          setError(payload.error ?? 'Chargement impossible.')
          return null
        }

        setError(null)
        return payload.data.photos as readonly Photo[]
      } catch {
        setError('Chargement impossible. Vérifiez votre connexion.')
        return null
      }
    },
    [],
  )

  async function selectCategory(slug: string | null) {
    if (slug === activeSlug) return

    setOpenIndex(null)
    setActiveSlug(slug)
    setIsLoading(true)

    const page = await fetchPage(slug, 0)
    if (page !== null) setPhotos(page)
    setIsLoading(false)
  }

  async function loadMore() {
    setIsLoading(true)

    const page = await fetchPage(activeSlug, photos.length)
    if (page !== null) setPhotos((current) => [...current, ...page])
    setIsLoading(false)
  }

  if (initialPhotos.length === 0) {
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
        onChange={(slug) => void selectCategory(slug)}
        totalCount={countFor(categories, null)}
      />

      <div className="mt-10 columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4" aria-live="polite">
        <AnimatePresence mode="popLayout">
          {photos.map((photo, index) => (
            <motion.button
              key={photo.id}
              type="button"
              layout
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{
                duration: 0.4,
                delay: Math.min(index % GALLERY_PAGE_SIZE, STAGGER_CAP) * 0.03,
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

      {photos.length === 0 && !isLoading && (
        <p className="mt-10 rounded-[2rem] bg-sand/70 px-8 py-14 text-center text-ink-soft ring-1 ring-clay/40">
          Pas encore de photo dans cette catégorie.
        </p>
      )}

      {error !== null && (
        <p
          role="alert"
          className="mt-8 rounded-2xl bg-terracotta/12 px-5 py-4 text-center text-sm font-semibold text-terracotta-deep"
        >
          {error}
        </p>
      )}

      {hasMore && (
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={isLoading}
            className="rounded-full bg-terracotta px-8 py-4 font-semibold text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-terracotta-deep disabled:pointer-events-none disabled:opacity-60"
          >
            {isLoading
              ? 'Chargement…'
              : `Voir plus de photos (${totalForScope - photos.length} restantes)`}
          </button>
        </div>
      )}

      <Lightbox
        photos={photos}
        activeIndex={openIndex}
        onClose={() => setOpenIndex(null)}
        onNavigate={setOpenIndex}
      />
    </div>
  )
}
