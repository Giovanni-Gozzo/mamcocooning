import type { Metadata } from 'next'
import { FeedList } from '@/components/feed/FeedList'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { listFeed } from '@/lib/feed'
import { listCategoriesWithCounts } from '@/lib/photos'

export const revalidate = 120

export const metadata: Metadata = {
  title: 'Actualités : la vie à la MAM au jour le jour',
  description:
    'Les dernières nouvelles de la MAM Cocooning : ateliers, sorties, activités d’éveil et petits moments du quotidien, en photos.',
  alternates: { canonical: '/actualites' },
}

interface NewsPageProps {
  readonly searchParams: Promise<{ categorie?: string }>
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const [{ categorie }, categories] = await Promise.all([searchParams, listCategoriesWithCounts()])

  // The first page must already be scoped, otherwise a shared ?categorie=… link
  // renders every publication behind an active filter.
  const requested = categories.find((category) => category.slug === categorie)
  const firstPage = await listFeed({ categorySlug: requested?.slug })

  return (
    <div className="grain relative overflow-hidden px-6 pt-36 pb-10 sm:pt-44">
      <div
        aria-hidden
        className="animate-blob-drift pointer-events-none absolute -top-20 right-0 -z-10 size-96 bg-sage-soft/60 blur-[100px]"
      />

      <div className="mx-auto max-w-6xl">
        <SectionTitle
          eyebrow="Actualités"
          title="La vie à la MAM, au jour le jour"
          level="h1"
          body="Ateliers, sorties, découvertes : ce que les enfants ont vécu ces derniers jours. Touchez une activité pour ne voir qu’elle."
        />

        <div className="mt-14">
          <FeedList
            initialPage={firstPage}
            categories={categories}
            initialCategory={requested?.slug ?? null}
          />
        </div>
      </div>
    </div>
  )
}
