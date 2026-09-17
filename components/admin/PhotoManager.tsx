'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Category, Photo } from '@/lib/types'

const LOW_CONFIDENCE_THRESHOLD = 0.6

interface PhotoManagerProps {
  readonly photos: readonly Photo[]
  readonly categories: readonly Category[]
  readonly isReady: boolean
}

/** Lets the owner correct Gemini's choice, or take a photo off the site. */
export function PhotoManager({ photos, categories, isReady }: PhotoManagerProps) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function moveToCategory(id: string, categorySlug: string) {
    setBusyId(id)
    setError(null)

    try {
      const response = await fetch(`/api/photos/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ categorySlug }),
      })
      const payload = await response.json()

      if (!response.ok || payload.success !== true) {
        setError(payload.error ?? 'Modification impossible.')
        return
      }

      router.refresh()
    } catch {
      setError('Modification impossible. Vérifiez votre réseau.')
    } finally {
      setBusyId(null)
    }
  }

  async function confirmRemoval(id: string) {
    setBusyId(id)
    setError(null)

    try {
      const response = await fetch(`/api/photos/${id}`, { method: 'DELETE' })
      const payload = await response.json()

      if (!response.ok || payload.success !== true) {
        setError(payload.error ?? 'Retrait impossible.')
        return
      }

      setPendingRemoval(null)
      router.refresh()
    } catch {
      setError('Retrait impossible. Vérifiez votre réseau.')
    } finally {
      setBusyId(null)
    }
  }

  if (photos.length === 0) {
    return (
      <p className="rounded-[2rem] bg-sand/60 px-8 py-12 text-center text-ink-soft ring-1 ring-clay/40">
        Aucune photo publiée pour l&rsquo;instant.
      </p>
    )
  }

  return (
    <div>
      {error !== null && (
        <p
          role="alert"
          className="mb-5 rounded-2xl bg-terracotta/12 px-4 py-3 text-sm font-semibold text-terracotta-deep"
        >
          {error}
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {photos.map((photo) => (
            <motion.li
              key={photo.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.35 }}
              className="overflow-hidden rounded-[1.75rem] bg-sand/70 ring-1 ring-clay/40"
            >
              <div className="relative aspect-[4/3] bg-clay/30">
                <Image
                  src={photo.url}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
                {photo.confidence !== null && photo.confidence < LOW_CONFIDENCE_THRESHOLD && (
                  <span className="absolute top-3 left-3 rounded-full bg-honey px-3 py-1 text-[0.7rem] font-bold text-ink">
                    À vérifier
                  </span>
                )}
              </div>

              <div className="p-4">
                <p className="line-clamp-2 text-sm leading-snug text-ink-soft">{photo.alt}</p>

                <label className="mt-4 block text-xs font-bold tracking-wider text-ink-faint uppercase">
                  Catégorie
                  <select
                    value={photo.categorySlug}
                    disabled={!isReady || busyId === photo.id}
                    onChange={(event) => void moveToCategory(photo.id, event.target.value)}
                    className="mt-1.5 w-full rounded-xl bg-cream px-3 py-2.5 text-sm font-semibold text-ink ring-1 ring-clay/60 outline-none focus:ring-2 focus:ring-terracotta disabled:opacity-50"
                  >
                    {categories.map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.emoji} {category.label}
                      </option>
                    ))}
                  </select>
                </label>

                {pendingRemoval === photo.id ? (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === photo.id}
                      onClick={() => void confirmRemoval(photo.id)}
                      className="flex-1 rounded-xl bg-terracotta px-3 py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
                    >
                      {busyId === photo.id ? 'Retrait…' : 'Confirmer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingRemoval(null)}
                      className="flex-1 rounded-xl bg-cream px-3 py-2.5 text-sm font-semibold text-ink ring-1 ring-clay/60"
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!isReady}
                    onClick={() => setPendingRemoval(photo.id)}
                    className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-faint transition-colors hover:bg-terracotta/10 hover:text-terracotta-deep disabled:opacity-40"
                  >
                    Retirer du site
                  </button>
                )}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}
