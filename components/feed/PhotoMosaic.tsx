import Image from 'next/image'
import type { Photo } from '@/lib/types'

/** At most this many tiles; the last one shows how many photos remain. */
const MAX_TILES = 4

interface PhotoMosaicProps {
  readonly photos: readonly Photo[]
  readonly onOpen: (index: number) => void
}

/** Layout per number of tiles, like a social feed: 1 big, 2 side by side, 3 = 1 + 2, 4 = grid. */
const LAYOUTS: Record<number, { grid: string; tiles: readonly string[] }> = {
  1: { grid: 'grid-cols-1', tiles: ['aspect-[4/3]'] },
  2: { grid: 'grid-cols-2', tiles: ['aspect-[3/4]', 'aspect-[3/4]'] },
  3: {
    grid: 'grid-cols-2',
    tiles: ['col-span-2 aspect-[16/9]', 'aspect-[4/3]', 'aspect-[4/3]'],
  },
  4: { grid: 'grid-cols-2', tiles: ['aspect-square', 'aspect-square', 'aspect-square', 'aspect-square'] },
}

export function PhotoMosaic({ photos, onOpen }: PhotoMosaicProps) {
  const shown = photos.slice(0, MAX_TILES)
  const hidden = photos.length - shown.length
  const layout = LAYOUTS[shown.length]
  if (layout === undefined) return null

  return (
    <div className={`grid gap-1.5 overflow-hidden rounded-[1.5rem] ${layout.grid}`}>
      {shown.map((photo, index) => {
        const isLast = index === shown.length - 1
        return (
          <button
            key={photo.id}
            type="button"
            onClick={() => onOpen(index)}
            aria-label={`Agrandir la photo : ${photo.alt}`}
            className={`group relative overflow-hidden bg-clay/30 focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-terracotta ${layout.tiles[index]}`}
          >
            <Image
              src={photo.url}
              alt={photo.alt}
              fill
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
            />
            {isLast && hidden > 0 && (
              <span className="absolute inset-0 grid place-items-center bg-ink/55 text-3xl font-bold text-cream">
                +{hidden}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
