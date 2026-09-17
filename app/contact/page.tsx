import type { Metadata } from 'next'
import { Reveal } from '@/components/ui/Reveal'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Contact',
  description: `Nous trouver au ${SITE.address.street}, ${SITE.address.postalCode} ${SITE.address.city}. Ouvert ${SITE.hours.days.toLowerCase()} de ${SITE.hours.time}.`,
}

const DETAILS = [
  {
    icon: '📍',
    title: 'Nous trouver',
    lines: [SITE.address.street, `${SITE.address.postalCode} ${SITE.address.city}`],
    href: null,
  },
  {
    icon: '🕖',
    title: 'Horaires',
    lines: [SITE.hours.days, SITE.hours.time],
    href: null,
  },
  {
    icon: '📞',
    title: 'Nous appeler',
    lines: [SITE.phone, 'Réponse sous 24 h en semaine'],
    href: `tel:${SITE.phoneHref}`,
  },
] as const

export default function ContactPage() {
  return (
    <div className="px-6 pt-36 pb-10 sm:pt-44">
      <div className="mx-auto max-w-6xl">
        <SectionTitle
          eyebrow="Contact"
          title="Passez nous voir"
          level="h1"
          body="Le plus simple reste un appel : on convient ensemble d'un moment pour vous faire visiter, enfant compris."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {DETAILS.map((detail, index) => {
            const content = (
              <>
                <span aria-hidden className="text-3xl">
                  {detail.icon}
                </span>
                <h2 className="mt-4 text-xl">{detail.title}</h2>
                {detail.lines.map((line) => (
                  <p key={line} className="mt-1 leading-relaxed text-ink-soft">
                    {line}
                  </p>
                ))}
              </>
            )

            const className =
              'block h-full rounded-[2rem] bg-sand/70 p-8 ring-1 ring-clay/40 transition-all duration-500 hover:-translate-y-1.5 hover:bg-sand'

            return (
              <Reveal key={detail.title} delay={index * 0.08}>
                {detail.href === null ? (
                  <div className={className}>{content}</div>
                ) : (
                  <a href={detail.href} className={className}>
                    {content}
                  </a>
                )}
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={0.15}>
          <div className="mt-8 overflow-hidden rounded-[2.5rem] ring-1 ring-clay/50">
            <iframe
              title={`Plan d’accès à ${SITE.name}`}
              src={SITE.mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-[340px] w-full border-0 sm:h-[520px]"
            />
          </div>
        </Reveal>
      </div>
    </div>
  )
}
