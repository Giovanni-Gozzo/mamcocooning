import type { Metadata } from 'next'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { GALLERY_PAGE_SIZE } from '@/lib/gallery'
import { listCategoriesWithCounts, listPhotos } from '@/lib/photos'

export const revalidate = 120

export const metadata: Metadata = {
  title: 'Galerie',
  description:
    'Les photos du quotidien à la MAM Cocooning : activités manuelles, éveil musical, motricité, jardinage et moments de vie.',
}

interface GalleryPageProps {
  readonly searchParams: Promise<{ categorie?: string }>
}

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const [{ categorie }, categories] = await Promise.all([searchParams, listCategoriesWithCounts()])

  // The first page must already be scoped, otherwise a shared /galerie?categorie=…
  // link renders every photo behind an active filter.
  const requested = categories.find((category) => category.slug === categorie)
  const photos = await listPhotos({
    categorySlug: requested?.slug,
    limit: GALLERY_PAGE_SIZE,
  })

  return (
    <div className="grain relative overflow-hidden px-6 pt-36 pb-10 sm:pt-44">
      <div
        aria-hidden
        className="animate-blob-drift pointer-events-none absolute -top-20 right-0 -z-10 size-96 bg-sage-soft/60 blur-[100px]"
      />

      <div className="mx-auto max-w-6xl">
        <SectionTitle
          eyebrow="Galerie"
          title="Leurs journées, en images"
          level="h1"
          body="Les photos sont triées automatiquement par activité. Cliquez sur une catégorie pour ne voir que celle-là."
        />

        <div className="mt-14">
          <GalleryGrid
            initialPhotos={photos}
            categories={categories}
            initialCategory={requested?.slug ?? null}
          />
        </div>
      </div>
    </div>
  )
}
