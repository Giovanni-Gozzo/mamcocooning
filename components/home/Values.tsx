import { DOODLES } from '@/components/ui/doodles'
import { FloatingDoodles, type DoodleSpec } from '@/components/ui/FloatingDoodles'
import { Reveal } from '@/components/ui/Reveal'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { VALUES } from '@/lib/site'

const DOODLE_TINTS = ['text-terracotta', 'text-sage-deep', 'text-honey', 'text-blush'] as const

const BACKGROUND_DOODLES: readonly DoodleSpec[] = [
  { name: 'kite', className: 'right-[-4%] top-[26%] hidden w-14 xl:block', color: 'text-sage/40', tilt: 10 },
  { name: 'ball', className: 'left-[-5%] bottom-[18%] hidden w-14 xl:block', color: 'text-clay/70', tilt: -6, delay: '-3s' },
]

export function Values() {
  return (
    <section className="relative mx-auto mt-28 max-w-6xl px-6">
      <FloatingDoodles doodles={BACKGROUND_DOODLES} />

      <SectionTitle
        eyebrow="Notre façon de faire"
        title="Ce qui change vraiment, au quotidien"
        body="Pas de grands discours : quatre engagements concrets que vous constaterez dès la première semaine."
      />

      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {VALUES.map((value, index) => {
          const Doodle = DOODLES[value.doodle]
          const tint = DOODLE_TINTS[index % DOODLE_TINTS.length]

          return (
            <Reveal key={value.title} delay={index * 0.08}>
              <article className="group relative h-full overflow-hidden rounded-[2rem] bg-sand/70 p-8 ring-1 ring-clay/40 transition-all duration-500 hover:-translate-y-1.5 hover:bg-sand hover:shadow-[0_28px_60px_-34px_rgba(56,45,40,0.7)]">
                <span
                  aria-hidden
                  className="absolute -top-8 -right-6 block size-36 opacity-[0.09] transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6"
                >
                  <Doodle className={`size-full ${tint}`} />
                </span>
                <span aria-hidden className="block size-12">
                  <Doodle className={`size-full ${tint}`} />
                </span>
                <h3 className="mt-4 text-xl">{value.title}</h3>
                <p className="mt-2.5 leading-relaxed text-ink-soft">{value.body}</p>
              </article>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
