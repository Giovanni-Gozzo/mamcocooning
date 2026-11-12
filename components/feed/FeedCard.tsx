import { PhotoMosaic } from './PhotoMosaic'
import { feedText, formatFeedDate } from '@/lib/feed-format'
import { describeMedia } from '@/lib/media'
import type { FeedItem } from '@/lib/types'

interface FeedCardProps {
  readonly item: FeedItem
  readonly onOpenPhoto: (index: number) => void
}

/** One publication: its date, its text, its photos and videos. */
export function FeedCard({ item, onOpenPhoto }: FeedCardProps) {
  const text = feedText(item)

  return (
    <article className="rounded-[2rem] bg-sand/70 p-5 ring-1 ring-clay/45 sm:p-7">
      <time dateTime={item.createdAt} className="text-sm font-semibold text-ink-soft">
        {item.kind === 'memories' ? 'Souvenirs de la MAM' : formatFeedDate(item.createdAt)}
      </time>

      {text !== null && (
        <p className="mt-3 text-lg leading-relaxed whitespace-pre-line text-ink">{text}</p>
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
