'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { FeedCard } from './FeedCard'
import { Lightbox } from '@/components/gallery/Lightbox'
import { FEED_PAGE_SIZE } from '@/lib/feed-format'
import type { FeedItem, FeedPage } from '@/lib/types'

interface FeedListProps {
  readonly initialPage: FeedPage
}

interface OpenPhoto {
  readonly itemId: string
  readonly index: number
}

async function fetchFeedPage(offset: number): Promise<FeedPage> {
  const params = new URLSearchParams({ limit: String(FEED_PAGE_SIZE), offset: String(offset) })

  const response = await fetch(`/api/feed?${params}`)
  const payload = await response.json()
  if (!response.ok || payload.success !== true) {
    throw new Error(payload.error ?? 'Chargement impossible.')
  }
  return payload.data as FeedPage
}

export function FeedList({ initialPage }: FeedListProps) {
  const [items, setItems] = useState<readonly FeedItem[]>(initialPage.items)
  const [hasMore, setHasMore] = useState(initialPage.hasMore)
  const [openPhoto, setOpenPhoto] = useState<OpenPhoto | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openItem = items.find((item) => item.id === openPhoto?.itemId)

  async function load(offset: number) {
    setIsLoading(true)
    setError(null)
    try {
      const page = await fetchFeedPage(offset)
      setItems((current) => (offset === 0 ? page.items : [...current, ...page.items]))
      setHasMore(page.hasMore)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Chargement impossible.')
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div>
      {error !== null && (
        <p
          role="alert"
          className="mx-auto mt-8 max-w-2xl rounded-2xl bg-terracotta/12 px-4 py-3 text-sm font-semibold text-terracotta-deep"
        >
          {error}
        </p>
      )}

      <ol
        aria-busy={isLoading}
        className={`mx-auto mt-10 flex max-w-2xl flex-col gap-6 transition-opacity ${isLoading ? 'opacity-60' : ''}`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((item) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <FeedCard
                item={item}
                onOpenPhoto={(index) => setOpenPhoto({ itemId: item.id, index })}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>

      {items.length === 0 && !isLoading && (
        <p className="mx-auto mt-10 max-w-2xl rounded-[2rem] bg-sand/60 px-8 py-12 text-center text-ink-soft ring-1 ring-clay/40">
          Pas encore de nouvelles ici. Revenez bientôt !
        </p>
      )}

      {hasMore && (
        <div className="mt-10 text-center">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void load(items.length)}
            className="rounded-full bg-ink px-7 py-3.5 font-semibold text-cream transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {isLoading ? 'Chargement…' : 'Voir les nouvelles plus anciennes'}
          </button>
        </div>
      )}

      <Lightbox
        photos={openItem?.photos ?? []}
        activeIndex={openItem === undefined ? null : (openPhoto?.index ?? null)}
        onClose={() => setOpenPhoto(null)}
        onNavigate={(index) =>
          setOpenPhoto((current) => (current === null ? null : { ...current, index }))
        }
      />
    </div>
  )
}
