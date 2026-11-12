import Image from 'next/image'
import Link from 'next/link'
import { ButtonLink } from '@/components/ui/Button'
import { FloatingJungle, type JungleSpec } from '@/components/ui/FloatingJungle'
import { Reveal } from '@/components/ui/Reveal'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { PlayBadge } from '@/components/ui/PlayBadge'
import { feedText, formatFeedDate } from '@/lib/feed-format'
import { describeMedia, thumbnailUrl } from '@/lib/media'
import type { FeedItem } from '@/lib/types'

const NEWS_JUNGLE: readonly JungleSpec[] = [
  { name: 'hibiscus', className: 'left-[-4%] top-[8%] hidden w-14 xl:block', color: 'text-hibiscus/45', tilt: -10 },
  { name: 'fern', className: 'right-[-4%] top-[34%] hidden w-16 xl:block', color: 'text-jungle/25', tilt: 8, delay: '-3s' },
  { name: 'elephant', className: 'left-[-5%] bottom-[12%] hidden w-16 xl:block', color: 'text-sage/50', tilt: 6, delay: '-5s' },
]

interface LatestNewsProps {
  readonly items: readonly FeedItem[]
}

/** Homepage preview of the latest publications, each linking to the full feed. */
export function LatestNews({ items }: LatestNewsProps) {
  if (items.length === 0) return null

  return (
    <section className="relative mx-auto mt-28 max-w-6xl px-6">
      <FloatingJungle items={NEWS_JUNGLE} />

      <SectionTitle
        eyebrow="Les dernières nouvelles"
        title="Ce qu'ils ont vécu ces derniers jours"
        body="Ateliers, sorties, petites découvertes : la MAM au jour le jour, racontée par l'équipe."
      />

      <div className="mt-14 grid gap-5 md:grid-cols-3">
        {items.map((item, index) => {
          const cover = item.photos[0]
          const text = feedText(item)

          return (
            <Reveal key={item.id} delay={index * 0.06}>
              <Link
                href="/actualites"
                className="group flex h-full flex-col overflow-hidden rounded-[2rem] bg-sand/70 ring-1 ring-clay/45 transition-all duration-500 hover:-translate-y-1 hover:ring-terracotta/40"
              >
                <div className="relative aspect-[4/3] bg-clay/30">
                  {cover !== undefined && (
                    <Image
                      src={thumbnailUrl(cover)}
                      alt={cover.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                    />
                  )}
                  {cover?.mediaType === 'video' && <PlayBadge />}
                  {(item.photos.length > 1 || cover?.mediaType === 'video') && (
                    <span className="absolute right-3 bottom-3 rounded-full bg-ink/70 px-2.5 py-1 text-xs font-bold text-cream">
                      {describeMedia(item.photos)}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <span className="text-xs font-semibold text-ink-soft">
                    {item.kind === 'memories' ? 'Souvenirs' : formatFeedDate(item.createdAt)}
                  </span>
                  {text !== null && (
                    <p className="mt-3 line-clamp-3 leading-relaxed text-ink">{text}</p>
                  )}
                </div>
              </Link>
            </Reveal>
          )
        })}
      </div>

      <div className="mt-12 text-center">
        <ButtonLink href="/actualites">Toutes les actualités</ButtonLink>
      </div>
    </section>
  )
}
