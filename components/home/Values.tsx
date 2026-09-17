import { Reveal } from '@/components/ui/Reveal'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { VALUES } from '@/lib/site'

export function Values() {
  return (
    <section className="mx-auto mt-28 max-w-6xl px-6">
      <SectionTitle
        eyebrow="Notre façon de faire"
        title="Ce qui change vraiment, au quotidien"
        body="Pas de grands discours : quatre engagements concrets que vous constaterez dès la première semaine."
      />

      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {VALUES.map((value, index) => (
          <Reveal key={value.title} delay={index * 0.08}>
            <article className="group relative h-full overflow-hidden rounded-[2rem] bg-sand/70 p-8 ring-1 ring-clay/40 transition-all duration-500 hover:-translate-y-1.5 hover:bg-sand hover:shadow-[0_28px_60px_-34px_rgba(56,45,40,0.7)]">
              <span
                aria-hidden
                className="absolute -top-10 -right-6 text-[7rem] opacity-[0.07] transition-transform duration-700 group-hover:scale-110 group-hover:rotate-6"
              >
                {value.icon}
              </span>
              <span aria-hidden className="text-3xl">
                {value.icon}
              </span>
              <h3 className="mt-4 text-xl">{value.title}</h3>
              <p className="mt-2.5 leading-relaxed text-ink-soft">{value.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
