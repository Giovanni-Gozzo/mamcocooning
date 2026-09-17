import Image from 'next/image'
import type { Photo } from '@/lib/types'

interface PhotoMarqueeProps {
  readonly photos: readonly Photo[]
}

/** Endless horizontal rail. The list is doubled so the loop has no seam. */
export function PhotoMarquee({ photos }: PhotoMarqueeProps) {
  if (photos.length === 0) return null

  const loop = [...photos, ...photos]

  return (
    <section aria-hidden className="mt-28 overflow-hidden py-4">
      <div className="animate-marquee flex w-max gap-4 hover:[animation-play-state:paused]">
        {loop.map((photo, index) => (
          <div
            key={`${photo.id}-${index}`}
            className="relative h-48 w-64 shrink-0 overflow-hidden rounded-[1.5rem] bg-sand ring-1 ring-clay/40 sm:h-60 sm:w-80"
          >
            <Image
              src={photo.url}
              alt=""
              fill
              sizes="20rem"
              className="object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
