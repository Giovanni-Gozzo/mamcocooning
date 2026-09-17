'use client'

import Image from 'next/image'
import { useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Photo } from '@/lib/types'

interface LightboxProps {
  readonly photos: readonly Photo[]
  readonly activeIndex: number | null
  readonly onClose: () => void
  readonly onNavigate: (index: number) => void
}

export function Lightbox({ photos, activeIndex, onClose, onNavigate }: LightboxProps) {
  const photo = activeIndex === null ? undefined : photos[activeIndex]

  const goTo = useCallback(
    (offset: number) => {
      if (activeIndex === null || photos.length === 0) return
      onNavigate((activeIndex + offset + photos.length) % photos.length)
    },
    [activeIndex, photos.length, onNavigate],
  )

  useEffect(() => {
    if (photo === undefined) return

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') goTo(1)
      if (event.key === 'ArrowLeft') goTo(-1)
    }

    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [photo, goTo, onClose])

  return (
    <AnimatePresence>
      {photo !== undefined && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={photo.alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/92 p-4 backdrop-blur-md"
        >
          <motion.figure
            key={photo.id}
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="relative flex max-h-full w-full max-w-4xl flex-col"
          >
            <div
              className="relative w-full overflow-hidden rounded-[1.75rem] bg-ink-soft/20"
              style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
            >
              <Image
                src={photo.url}
                alt={photo.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 56rem"
                className="object-contain"
                priority
              />
            </div>

            <figcaption className="mt-4 px-1 text-center text-sm text-cream/85">
              {photo.caption ?? photo.alt}
            </figcaption>
          </motion.figure>

          <LightboxButton label="Fermer" onClick={onClose} className="top-4 right-4">
            <path d="M6 6l12 12M18 6L6 18" />
          </LightboxButton>

          {photos.length > 1 && (
            <>
              <LightboxButton
                label="Photo précédente"
                onClick={(event) => {
                  event.stopPropagation()
                  goTo(-1)
                }}
                className="top-1/2 left-3 -translate-y-1/2 sm:left-6"
              >
                <path d="M15 5l-7 7 7 7" />
              </LightboxButton>
              <LightboxButton
                label="Photo suivante"
                onClick={(event) => {
                  event.stopPropagation()
                  goTo(1)
                }}
                className="top-1/2 right-3 -translate-y-1/2 sm:right-6"
              >
                <path d="M9 5l7 7-7 7" />
              </LightboxButton>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface LightboxButtonProps {
  readonly label: string
  readonly onClick: (event: React.MouseEvent) => void
  readonly className: string
  readonly children: React.ReactNode
}

function LightboxButton({ label, onClick, className, children }: LightboxButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute z-10 grid size-11 place-items-center rounded-full bg-cream/15 text-cream ring-1 ring-cream/25 backdrop-blur transition-colors hover:bg-cream/30 ${className}`}
    >
      <span className="sr-only">{label}</span>
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
      >
        {children}
      </svg>
    </button>
  )
}
