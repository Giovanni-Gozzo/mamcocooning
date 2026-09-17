import type { Metadata } from 'next'
import Link from 'next/link'
import { CloudLayer } from '@/components/ui/CloudLayer'
import { DOODLES } from '@/components/ui/doodles'
import { FloatingDoodles, type DoodleSpec } from '@/components/ui/FloatingDoodles'
import { Reveal } from '@/components/ui/Reveal'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { ButtonLink } from '@/components/ui/Button'
import { DAY_MOMENTS } from '@/lib/site'
import { listCategoriesWithCounts } from '@/lib/photos'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Nos journées',
  description:
    'Le déroulé d’une journée à la MAM Cocooning, de l’accueil du matin aux retrouvailles du soir, et les activités d’éveil proposées.',
}

const PAGE_DOODLES: readonly DoodleSpec[] = [
  { name: 'kite', className: 'right-[3%] top-[12%] hidden w-14 lg:block', color: 'text-sage/40', tilt: 12 },
  { name: 'ball', className: 'left-[2%] top-[46%] hidden w-14 lg:block', color: 'text-clay/70', tilt: -8, delay: '-3s' },
  { name: 'star', className: 'right-[5%] top-[62%] hidden w-6 lg:block', color: 'text-honey/60', tilt: 8, delay: '-5s' },
]

export default async function ProgrammesPage() {
  const categories = await listCategoriesWithCounts()

  return (
    <div className="relative overflow-hidden px-6 pt-36 pb-10 sm:pt-44">
      <CloudLayer className="h-[28%] opacity-50" />
      <FloatingDoodles doodles={PAGE_DOODLES} />

      <div className="relative mx-auto max-w-6xl">
        <SectionTitle
          eyebrow="Une journée type"
          title="Un rythme clair, jamais rigide"
          level="h1"
          body="Les repères rassurent les tout-petits. Voici le fil de la journée — adapté à chacun, en particulier aux plus jeunes."
        />

        <ol className="relative mt-16 ml-4 border-l-2 border-dashed border-clay pl-8 sm:ml-8 sm:pl-12">
          {DAY_MOMENTS.map((moment, index) => {
            const Doodle = DOODLES[moment.doodle]

            return (
              <Reveal key={moment.time} delay={index * 0.06} direction="right">
                <li className="group relative pb-12 last:pb-0">
                  <span
                    aria-hidden
                    className="absolute top-1 -left-[2.7rem] grid size-8 place-items-center rounded-full bg-terracotta text-[0.7rem] font-bold text-cream ring-4 ring-cream sm:-left-[3.7rem]"
                  >
                    {index + 1}
                  </span>
                  <div className="flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-bold tracking-widest text-terracotta-deep uppercase">
                        {moment.time}
                      </p>
                      <h3 className="mt-1.5 text-2xl">{moment.title}</h3>
                      <p className="mt-2 max-w-xl leading-relaxed text-ink-soft">{moment.body}</p>
                    </div>
                    <span
                      aria-hidden
                      className="mt-1 hidden size-14 shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6 sm:block"
                    >
                      <Doodle className="size-full text-clay" />
                    </span>
                  </div>
                </li>
              </Reveal>
            )
          })}
        </ol>
      </div>

      {categories.length > 0 && (
        <div className="relative mx-auto mt-24 max-w-6xl">
          <SectionTitle
            eyebrow="Les ateliers"
            title="Les activités qu'ils pratiquent"
            body="Cette liste se construit à partir des photos publiées : elle reflète ce qui se fait réellement, semaine après semaine."
          />

          <div className="mt-12 flex flex-wrap justify-center gap-3">
            {categories.map((category, index) => (
              <Reveal key={category.slug} delay={Math.min(index, 8) * 0.05}>
                <Link
                  href={`/galerie?categorie=${category.slug}`}
                  className="group flex items-center gap-3 rounded-full bg-sand px-5 py-3.5 ring-1 ring-clay/50 transition-all duration-400 hover:-translate-y-1 hover:bg-shell hover:ring-terracotta/40"
                >
                  <span
                    aria-hidden
                    className="text-xl transition-transform duration-500 group-hover:scale-125 group-hover:rotate-12"
                  >
                    {category.emoji}
                  </span>
                  <span className="font-semibold">{category.label}</span>
                  <span className="text-sm text-ink-faint">{category.photoCount}</span>
                </Link>
              </Reveal>
            ))}
          </div>

          <div className="mt-12 text-center">
            <ButtonLink href="/galerie">Voir toutes les photos</ButtonLink>
          </div>
        </div>
      )}
    </div>
  )
}
