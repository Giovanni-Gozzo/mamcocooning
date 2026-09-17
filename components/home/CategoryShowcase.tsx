import Image from 'next/image'
import Link from 'next/link'
import { FloatingJungle, type JungleSpec } from '@/components/ui/FloatingJungle'
import { Reveal } from '@/components/ui/Reveal'
import { SectionTitle } from '@/components/ui/SectionTitle'
import type { CategoryWithCount } from '@/lib/types'

const SHOWCASE_JUNGLE: readonly JungleSpec[] = [
  { name: 'hibiscus', className: 'left-[-4%] top-[8%] hidden w-14 xl:block', color: 'text-hibiscus/45', tilt: -10 },
  { name: 'fern', className: 'right-[-4%] top-[34%] hidden w-16 xl:block', color: 'text-jungle/25', tilt: 8, delay: '-3s' },
  { name: 'elephant', className: 'left-[-5%] bottom-[12%] hidden w-16 xl:block', color: 'text-sage/50', tilt: 6, delay: '-5s' },
]

interface CategoryShowcaseProps {
  readonly categories: readonly CategoryWithCount[]
}

/**
 * Homepage preview of the activities. The list comes straight from the photos
 * that exist, so a new kind of activity appears here on its own.
 */
export function CategoryShowcase({ categories }: CategoryShowcaseProps) {
  if (categories.length === 0) return null

  return (
    <section className="relative mx-auto mt-28 max-w-6xl px-6">
      <FloatingJungle items={SHOWCASE_JUNGLE} />

      <SectionTitle
        eyebrow="Leurs activités"
        title="Ce qu'ils ont fait ces derniers temps"
        body="Ces catégories se créent toutes seules à partir des photos publiées. Ce que vous voyez ici, c'est ce qu'ils ont vraiment vécu."
      />

      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category, index) => (
          <Reveal key={category.slug} delay={Math.min(index, 3) * 0.05}>
            <Link
              href={`/galerie?categorie=${category.slug}`}
              className="group relative flex h-64 flex-col justify-end overflow-hidden rounded-[2rem] p-6 ring-1 ring-clay/40"
            >
              {category.coverUrl !== null ? (
                <Image
                  src={category.coverUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 bg-sand" />
              )}

              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-ink/88 via-ink/35 to-transparent transition-opacity duration-500 group-hover:from-ink/92"
              />

              <div className="relative">
                <span aria-hidden className="text-2xl drop-shadow">
                  {category.emoji}
                </span>
                <h3 className="mt-2 text-xl text-cream">{category.label}</h3>
                <p className="mt-1 text-sm text-cream/75">
                  {category.photoCount} photo{category.photoCount > 1 ? 's' : ''}
                </p>
              </div>

              <span
                aria-hidden
                className="absolute top-5 right-5 grid size-9 translate-y-2 place-items-center rounded-full bg-cream/90 text-ink opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"
              >
                →
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
