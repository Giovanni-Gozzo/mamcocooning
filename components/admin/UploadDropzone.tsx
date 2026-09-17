'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Category, Photo } from '@/lib/types'

type UploadState = 'pending' | 'sending' | 'done' | 'error'

interface UploadItem {
  readonly key: string
  readonly fileName: string
  readonly previewUrl: string
  readonly state: UploadState
  readonly photo: Photo | null
  readonly error: string | null
}

interface UploadDropzoneProps {
  readonly categories: readonly Category[]
  readonly isReady: boolean
}

function labelFor(categories: readonly Category[], slug: string): string {
  const match = categories.find((category) => category.slug === slug)
  return match === undefined ? slug : `${match.emoji} ${match.label}`
}

export function UploadDropzone({ categories, isReady }: UploadDropzoneProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [items, setItems] = useState<readonly UploadItem[]>([])

  function updateItem(key: string, patch: Partial<UploadItem>) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    )
  }

  async function uploadOne(item: UploadItem, file: File) {
    updateItem(item.key, { state: 'sending' })

    try {
      const body = new FormData()
      body.append('file', file)

      const response = await fetch('/api/photos', { method: 'POST', body })
      const payload = await response.json()

      if (!response.ok || payload.success !== true) {
        updateItem(item.key, { state: 'error', error: payload.error ?? 'Envoi impossible.' })
        return
      }

      updateItem(item.key, { state: 'done', photo: payload.data.photo, error: null })
      router.refresh()
    } catch {
      updateItem(item.key, { state: 'error', error: 'Envoi impossible. Vérifiez votre réseau.' })
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (fileList === null || fileList.length === 0) return

    const files = Array.from(fileList)
    const created = files.map((file, index) => ({
      key: `${Date.now()}-${index}-${file.name}`,
      fileName: file.name,
      previewUrl: URL.createObjectURL(file),
      state: 'pending' as UploadState,
      photo: null,
      error: null,
    }))

    setItems((current) => [...created, ...current])

    // Sequential: each upload waits on Gemini, and the free tier is rate limited.
    for (const [index, item] of created.entries()) {
      const file = files[index]
      if (file !== undefined) await uploadOne(item, file)
    }
  }

  return (
    <section>
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          if (isReady) void handleFiles(event.dataTransfer.files)
        }}
        className={`relative rounded-[2.5rem] border-2 border-dashed p-10 text-center transition-all duration-400 sm:p-14 ${
          isDragging
            ? 'border-terracotta bg-terracotta-soft/40'
            : 'border-clay bg-sand/50 hover:border-terracotta/50'
        } ${isReady ? '' : 'pointer-events-none opacity-50'}`}
      >
        <motion.span
          aria-hidden
          animate={isDragging ? { scale: 1.15, rotate: 8 } : { scale: 1, rotate: 0 }}
          className="inline-block text-5xl"
        >
          📸
        </motion.span>

        <h2 className="mt-5 text-2xl">Ajouter des photos</h2>
        <p className="mx-auto mt-2 max-w-md leading-relaxed text-ink-soft">
          Glissez vos photos ici, ou appuyez sur le bouton. Chaque photo est rangée automatiquement
          dans la bonne catégorie.
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-7 rounded-full bg-terracotta px-8 py-4 text-base font-semibold text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-terracotta-deep"
        >
          Choisir des photos
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
          multiple
          className="sr-only"
          onChange={(event) => {
            void handleFiles(event.target.files)
            event.target.value = ''
          }}
        />

        <p className="mt-5 text-xs text-ink-faint">
          JPEG, PNG, WebP ou HEIC · 15 Mo maximum par photo
        </p>
      </div>

      <AnimatePresence>
        {items.length > 0 && (
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-6 flex flex-col gap-3"
          >
            {items.map((item) => (
              <motion.li
                key={item.key}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 rounded-3xl bg-sand/70 p-3 ring-1 ring-clay/40"
              >
                <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-clay/40">
                  {/* Local object URL, so next/image optimisation is skipped. */}
                  <Image
                    src={item.previewUrl}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.fileName}</p>

                  {item.state === 'sending' && (
                    <p className="mt-1 text-sm text-ink-soft">Envoi et analyse en cours…</p>
                  )}
                  {item.state === 'pending' && (
                    <p className="mt-1 text-sm text-ink-faint">En attente…</p>
                  )}
                  {item.state === 'done' && item.photo !== null && (
                    <p className="mt-1 text-sm text-sage-deep">
                      Rangée dans {labelFor(categories, item.photo.categorySlug)}
                    </p>
                  )}
                  {item.state === 'error' && (
                    <p className="mt-1 text-sm font-semibold text-terracotta-deep">{item.error}</p>
                  )}
                </div>

                <span aria-hidden className="shrink-0 text-xl">
                  {item.state === 'done' ? '✅' : item.state === 'error' ? '⚠️' : '⏳'}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>
  )
}
