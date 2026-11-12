import { ClosingCta } from '@/components/home/ClosingCta'
import { Hero } from '@/components/home/Hero'
import { HouseTour } from '@/components/home/HouseTour'
import { LatestNews } from '@/components/home/LatestNews'
import { Stats } from '@/components/home/Stats'
import { Values } from '@/components/home/Values'
import { listFeed } from '@/lib/feed'
import { listCategoriesWithCounts } from '@/lib/photos'
import { applyToHouseTour, getSiteImageOverrides } from '@/lib/site-images'

const HOME_NEWS_COUNT = 3

export const revalidate = 300

export default async function HomePage() {
  const [categories, news, overrides] = await Promise.all([
    listCategoriesWithCounts(),
    listFeed({ limit: HOME_NEWS_COUNT }),
    getSiteImageOverrides(),
  ])
  const stops = applyToHouseTour(overrides)

  return (
    <>
      <Hero stops={stops} />
      <Stats />
      <Values />
      <HouseTour stops={stops} />
      <LatestNews items={news.items} categories={categories} />
      <ClosingCta />
    </>
  )
}
