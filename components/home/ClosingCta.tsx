import { ButtonLink } from '@/components/ui/Button'
import { CloudLayer } from '@/components/ui/CloudLayer'
import { FloatingDoodles, type DoodleSpec } from '@/components/ui/FloatingDoodles'
import { Reveal } from '@/components/ui/Reveal'
import { SITE } from '@/lib/site'

const CTA_DOODLES: readonly DoodleSpec[] = [
  { name: 'balloon', className: 'left-[6%] top-[14%] hidden w-12 sm:block', color: 'text-cream/45', tilt: -8 },
  { name: 'star', className: 'right-[9%] top-[18%] w-6', color: 'text-honey/70', tilt: 10, delay: '-2s' },
  { name: 'star', className: 'left-[16%] bottom-[16%] w-5', color: 'text-cream/50', tilt: -12, delay: '-4s' },
  { name: 'teddy', className: 'right-[5%] bottom-[10%] hidden w-16 sm:block', color: 'text-cream/30', tilt: 8, delay: '-1s' },
]

export function ClosingCta() {
  return (
    <section className="mx-auto mt-28 max-w-6xl px-6">
      <Reveal>
        <div className="grain relative overflow-hidden rounded-[2.75rem] bg-terracotta px-8 py-16 text-center sm:px-14 sm:py-20">
          <CloudLayer className="h-[55%] opacity-35" />
          <FloatingDoodles doodles={CTA_DOODLES} />
          <div
            aria-hidden
            className="animate-blob-drift absolute -top-24 -left-20 size-80 bg-honey/40 blur-3xl"
          />
          <div
            aria-hidden
            className="animate-blob-drift absolute -right-24 -bottom-28 size-96 bg-blush/40 blur-3xl"
            style={{ animationDelay: '-9s' }}
          />

          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-[clamp(1.9rem,4.5vw,3rem)] leading-tight text-cream">
              Venez voir, c&rsquo;est encore mieux en vrai
            </h2>
            <p className="mt-5 text-[1.05rem] leading-relaxed text-cream/85">
              Un coup de fil suffit : on convient d&rsquo;un moment qui vous arrange, on vous fait
              entrer, et votre enfant découvre les lieux à son rythme.
            </p>

            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <ButtonLink
                href={`tel:${SITE.phoneHref}`}
                className="bg-cream! text-terracotta-deep! hover:bg-sand!"
              >
                {SITE.phone}
              </ButtonLink>
              <ButtonLink
                href="/contact"
                variant="secondary"
                className="bg-transparent! text-cream! ring-cream/40! hover:bg-cream/10!"
              >
                Où nous trouver
              </ButtonLink>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
