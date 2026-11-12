import { PhotoMosaic } from './PhotoMosaic'
import { feedText, formatFeedDate } from '@/lib/feed-format'
import { describeMedia } from '@/lib/media'
import type { CategoryWithCount, FeedItem } from '@/lib/types'

interface FeedCardProps {
  readonly item: FeedItem
  readonly category: Pick<CategoryWithCount, 'label' | 'emoji'> | undefined
  readonly onOpenPhoto: (index: number) => void
  readonly onSelectCategory: (slug: string) => void
}

/** One publication: date, activity, text, photos. */
export function FeedCard({ item, category, onOpenPhoto, onSelectCategory }: FeedCardProps) {
  const label = category?.label ?? 'Le quotidien'
  const text = feedText(item, label)

  return (
    <article className="rounded-[2rem] bg-sand/70 p-5 ring-1 ring-clay/45 sm:p-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <time dateTime={item.createdAt} className="text-sm font-semibold text-ink-soft">
          {item.kind === 'memories' ? 'Souvenirs de la MAM' : formatFeedDate(item.createdAt)}
        </time>
        <button
          type="button"
          onClick={() => onSelectCategory(item.categorySlug)}
          className="flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-xs font-bold text-ink ring-1 ring-clay/60 transition-colors hover:bg-shell hover:ring-terracotta/40"
        >
          <span aria-hidden>{category?.emoji ?? '✨'}</span>
          {label}
        </button>
      </header>

      {text !== null && (
        <p className="mt-4 text-lg leading-relaxed whitespace-pre-line text-ink">{text}</p>
      )}

      <div className="mt-5">
        <PhotoMosaic photos={item.photos} onOpen={onOpenPhoto} />
      </div>

      {item.photos.length > 1 && (
        <p className="mt-3 text-sm text-ink-faint">{describeMedia(item.photos)}</p>
      )}
    </article>
  )
}
