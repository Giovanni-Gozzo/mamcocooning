import type { Metadata } from 'next'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Bientôt en ligne',
  robots: { index: false, follow: false },
}

export default function HoldingPage() {
  return (
    <div className="grain relative flex min-h-[85vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,#c6dff0_0%,#dbe9f0_30%,var(--color-cream)_80%)]"
      />

      <span aria-hidden className="text-5xl">
        🌿
      </span>

      <h1 className="mt-6 text-[clamp(2rem,6vw,3.2rem)] leading-tight">
        Mam<span className="text-terracotta">Cocooning</span>
      </h1>

      <p className="mt-5 max-w-md text-[1.05rem] leading-relaxed text-ink-soft">
        Notre nouveau site arrive très bientôt. En attendant, le plus simple reste
        de nous appeler : on répond, et on vous fait visiter.
      </p>

      <a
        href={`tel:${SITE.phoneHref}`}
        className="mt-9 inline-flex items-center rounded-full bg-terracotta px-8 py-4 text-lg font-semibold text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-terracotta-deep"
      >
        {SITE.phone}
      </a>

      <address className="mt-8 text-sm leading-relaxed text-ink-soft not-italic">
        {SITE.address.street}
        <br />
        {SITE.address.postalCode} {SITE.address.city}
        <br />
        <span className="mt-2 inline-block">
          {SITE.hours.days} · {SITE.hours.time}
        </span>
      </address>
    </div>
  )
}
