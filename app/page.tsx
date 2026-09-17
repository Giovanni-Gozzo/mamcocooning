import { CategoryShowcase } from '@/components/home/CategoryShowcase'
import { ClosingCta } from '@/components/home/ClosingCta'
import { Hero } from '@/components/home/Hero'
import { HouseTour } from '@/components/home/HouseTour'
import { PhotoMarquee } from '@/components/home/PhotoMarquee'
import { Stats } from '@/components/home/Stats'
import { Values } from '@/components/home/Values'
import { listCategoriesWithCounts, listPhotos } from '@/lib/photos'

export const revalidate = 300

export default async function HomePage() {
  const [categories, photos] = await Promise.all([
    listCategoriesWithCounts(),
    listPhotos({ limit: 14 }),
  ])

  return (
    <>
      <Hero />
      <Stats />
      <Values />
      <HouseTour />
      <CategoryShowcase categories={categories.slice(0, 6)} />
      <PhotoMarquee photos={photos} />
      <ClosingCta />
    </>
  )
}
