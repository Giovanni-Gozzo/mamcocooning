'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Lightbox, type LightboxPhoto } from '@/components/gallery/Lightbox'
import { ImagePreparationError, prepareImageForUpload, readApiResponse } from '@/lib/client-image'
import type { SiteImage, SiteImageGroup } from '@/lib/site-images'

interface SiteImagesManagerProps {
  readonly images: readonly SiteImage[]
  readonly isReady: boolean
}

const GROUPS: readonly { id: SiteImageGroup; title: string }[] = [
  { id: 'maison', title: 'La visite de la maison, pièce par pièce' },
  { id: 'equipe', title: 'L’équipe' },
]

/** The fixed photos of the site: view them whole, replace them, or restore the original. */
export function SiteImagesManager({ images, isReady }: SiteImagesManagerProps) {
  const router = useRouter()
  const [busySlot, setBusySlot] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const viewable: readonly (LightboxPhoto & { slot: string })[] = images.flatMap((image) =>
    image.url === null
      ? []
      : [{ id: image.id, slot: image.id, url: image.url, alt: image.label, caption: image.label }],
  )

  async function send(slot: string, init: () => Promise<RequestInit>, fallback: string) {
    setBusySlot(slot)
    setError(null)
    try {
      const response = await fetch(`/api/admin/site-images/${slot}`, await init())
      const result = await readApiResponse<unknown>(response, fallback)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    } catch (caught) {
      setError(
        caught instanceof ImagePreparationError
          ? caught.message
          : `${fallback} Vérifiez votre connexion internet.`,
      )
    } finally {
      setBusySlot(null)
    }
  }

  function replace(slot: string, file: File | undefined) {
    if (file === undefined) return
    void send(
      slot,
      async () => {
        const body = new FormData()
        body.set('file', await prepareImageForUpload(file))
        return { method: 'POST', body }
      },
      'Remplacement impossible.',
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

      {GROUPS.map((group) => (
        <div key={group.id} className="mt-8 first:mt-0">
          <h3 className="text-lg">{group.title}</h3>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images
              .filter((image) => image.group === group.id)
              .map((image) => {
                const isBusy = busySlot === image.id
                const viewIndex = viewable.findIndex((entry) => entry.slot === image.id)
                return (
                  <li
                    key={image.id}
                    className="overflow-hidden rounded-[1.75rem] bg-sand/70 ring-1 ring-clay/40"
                  >
                    {image.url !== null ? (
                      <button
                        type="button"
                        onClick={() => setOpenIndex(viewIndex)}
                        aria-label={`Voir en entier : ${image.label}`}
                        className="relative block aspect-[4/3] w-full bg-clay/30"
                      >
                        <Image
                          src={image.url}
                          alt={image.label}
                          fill
                          sizes="(max-width: 640px) 100vw, 33vw"
                          className="object-cover"
                        />
                        <span className="absolute top-3 left-3 flex flex-col items-start gap-1">
                          {image.isInHero && (
                            <span className="rounded-full bg-honey px-3 py-1 text-[0.7rem] font-bold text-ink">
                              Aussi en haut de l’accueil
                            </span>
                          )}
                          {image.isCustom && (
                            <span className="rounded-full bg-sage px-3 py-1 text-[0.7rem] font-bold text-cream">
                              Photo modifiée
                            </span>
                          )}
                        </span>
                      </button>
                    ) : (
                      <div className="grid aspect-[4/3] place-items-center bg-clay/30 text-sm text-ink-soft">
                        Pas encore de photo
                      </div>
                    )}

                    <div className="p-4">
                      <p className="font-semibold text-ink">{image.label}</p>
                      <div className="mt-3 flex gap-2">
                        <label
                          className={`flex-1 cursor-pointer rounded-xl bg-ink px-3 py-2.5 text-center text-sm font-semibold text-cream ${!isReady || isBusy ? 'pointer-events-none opacity-50' : ''}`}
                        >
                          {isBusy ? 'Envoi…' : image.url === null ? 'Ajouter' : 'Remplacer'}
                          <input
                            type="file"
                            accept="image/*,.heic,.heif"
                            className="sr-only"
                            disabled={!isReady || isBusy}
                            onChange={(event) => {
                              replace(image.id, event.target.files?.[0])
                              event.target.value = ''
                            }}
                          />
                        </label>
                        {image.isCustom && (
                          <button
                            type="button"
                            disabled={!isReady || isBusy}
                            onClick={() =>
                              void send(image.id, async () => ({ method: 'DELETE' }), 'Opération impossible.')
                            }
                            className="flex-1 rounded-xl bg-cream px-3 py-2.5 text-sm font-semibold text-ink ring-1 ring-clay/60 disabled:opacity-50"
                          >
                            Remettre l&rsquo;originale
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
          </ul>
        </div>
      ))}

      <Lightbox
        photos={viewable}
        activeIndex={openIndex}
        onClose={() => setOpenIndex(null)}
        onNavigate={setOpenIndex}
      />
    </div>
  )
}
