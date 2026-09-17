import type { Metadata } from 'next'
import Image from 'next/image'
import { ButtonLink } from '@/components/ui/Button'
import { Reveal } from '@/components/ui/Reveal'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { SITE, TEAM, type TeamMember } from '@/lib/site'

export const metadata: Metadata = {
  title: 'L’équipe',
  description:
    'Sigrid Gozzo et Julie Delannoy, assistantes maternelles agréées de la MAM Cocooning à Entraigues-sur-la-Sorgue.',
}

export default function TeamPage() {
  return (
    <div className="grain relative overflow-hidden px-6 pt-36 pb-10 sm:pt-44">
      <div
        aria-hidden
        className="animate-blob-drift pointer-events-none absolute top-10 -left-24 -z-10 size-96 bg-terracotta-soft/60 blur-[100px]"
      />

      <div className="mx-auto max-w-5xl">
        <SectionTitle
          eyebrow="Qui accueille votre enfant"
          title="Deux professionnelles, un même soin"
          level="h1"
          body="Une MAM, c'est avant tout des personnes. Voici celles à qui vous confierez votre enfant chaque matin."
        />

        <div className="mt-16 grid gap-10 sm:grid-cols-2 sm:gap-8">
          {TEAM.map((member, index) => (
            <Reveal key={member.name} delay={index * 0.12}>
              <MemberCard member={member} />
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-20 rounded-[2.5rem] bg-sage-soft/60 px-8 py-12 text-center ring-1 ring-sage/25">
            <h2 className="text-2xl">Une question sur nos agréments ?</h2>
            <p className="mx-auto mt-3 max-w-xl leading-relaxed text-ink-soft">
              Nos agréments, nos formations et nos attestations de premiers secours sont
              consultables sur place, et nous répondons volontiers à toutes vos questions.
            </p>
            <div className="mt-8">
              <ButtonLink href={`tel:${SITE.phoneHref}`}>Appelez-nous</ButtonLink>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  )
}

function MemberCard({ member }: { readonly member: TeamMember }) {
  return (
    <article className="group flex h-full flex-col items-center rounded-[2.5rem] bg-sand/70 p-8 text-center ring-1 ring-clay/40 transition-all duration-500 hover:-translate-y-1.5 hover:bg-sand hover:shadow-[0_30px_65px_-40px_rgba(56,45,40,0.8)]">
      <div className="relative size-40 overflow-hidden rounded-full ring-4 ring-cream">
        {member.photoUrl !== null ? (
          <Image
            src={member.photoUrl}
            alt={`Portrait de ${member.name}`}
            fill
            sizes="10rem"
            className="object-cover transition-transform duration-[900ms] group-hover:scale-105"
          />
        ) : (
          <div
            aria-hidden
            className="grid size-full place-items-center bg-gradient-to-br from-blush to-terracotta-soft font-display text-4xl font-semibold text-terracotta-deep"
          >
            {member.initials}
          </div>
        )}
      </div>

      <h2 className="mt-6 text-2xl">{member.name}</h2>
      <p className="mt-1 text-sm font-semibold tracking-wide text-terracotta-deep uppercase">
        {member.role}
      </p>
      <p className="mt-1 text-sm text-ink-faint">{member.since}</p>
      <p className="mt-5 leading-relaxed text-ink-soft">{member.bio}</p>
    </article>
  )
}
