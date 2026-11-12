import type { Metadata } from 'next'
import { Reveal } from '@/components/ui/Reveal'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { SITE, TEAM } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Contact et accès — Entraigues-sur-la-Sorgue (84320)',
  description: `Nous trouver au ${SITE.address.street}, ${SITE.address.postalCode} ${SITE.address.city}. Ouvert ${SITE.hours.days.toLowerCase()} de ${SITE.hours.time}.`,
  alternates: { canonical: '/contact' },
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
] as const

/** Every team member reachable by phone, each number clickable. */
const PHONES = TEAM.flatMap((member) =>
  member.phone === null ? [] : [{ name: member.name.split(' ')[0], ...member.phone }],
)

export default function ContactPage() {
  return (
    <div className="px-6 pt-36 pb-10 sm:pt-44">
      <div className="mx-auto max-w-6xl">
        <SectionTitle
          eyebrow="Contact"
          title="Passez nous voir"
          level="h1"
          body="Un appel, et on convient ensemble d'un moment pour vous faire visiter, enfant compris. Pas de formulaire, pas d'attente."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          <Reveal delay={0.1} className="order-last">
            <div className="block h-full rounded-[2rem] bg-sand/70 p-8 ring-1 ring-clay/40">
              <span aria-hidden className="text-3xl">
                📞
              </span>
              <h2 className="mt-4 text-xl">Nous appeler</h2>
              {PHONES.map((phone) => (
                <a
                  key={phone.href}
                  href={`tel:${phone.href}`}
                  className="mt-1 block leading-relaxed text-ink-soft underline-offset-4 hover:text-ink hover:underline"
                >
                  {phone.name} : <span className="font-semibold text-ink">{phone.display}</span>
                </a>
              ))}
              <p className="mt-1 leading-relaxed text-ink-soft">Réponse sous 24 h en semaine</p>
            </div>
          </Reveal>
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
              <Reveal key={detail.title} delay={index * 0.05}>
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
