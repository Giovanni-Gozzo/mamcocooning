import Link from 'next/link'
import { NAV_LINKS, SITE } from '@/lib/site'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="grain relative mt-24 overflow-hidden bg-sand pt-20 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div
        aria-hidden
        className="animate-blob-drift absolute -top-24 -right-20 size-72 bg-terracotta-soft/60 blur-3xl"
      />
      <div
        aria-hidden
        className="animate-blob-drift absolute -bottom-32 -left-16 size-80 bg-sage-soft/70 blur-3xl"
        style={{ animationDelay: '-8s' }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="font-display text-2xl font-semibold">
            Mam<span className="text-terracotta">Cocooning</span>
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-soft">{SITE.tagline}.</p>
        </div>

        <nav aria-label="Pages du site">
          <h2 className="text-xs font-bold tracking-[0.18em] text-ink-faint uppercase">Le site</h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm text-ink-soft transition-colors hover:text-terracotta-deep"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-xs font-bold tracking-[0.18em] text-ink-faint uppercase">Nous trouver</h2>
          <address className="mt-4 text-sm leading-relaxed text-ink-soft not-italic">
            {SITE.address.street}
            <br />
            {SITE.address.postalCode} {SITE.address.city}
            <br />
            <a
              href={`tel:${SITE.phoneHref}`}
              className="mt-2 inline-block font-semibold text-terracotta-deep hover:underline"
            >
              {SITE.phone}
            </a>
          </address>
        </div>

        <div>
          <h2 className="text-xs font-bold tracking-[0.18em] text-ink-faint uppercase">Horaires</h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            {SITE.hours.days}
            <br />
            <span className="font-semibold text-ink">{SITE.hours.time}</span>
          </p>
        </div>
      </div>

      <div className="relative mx-auto mt-14 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-clay/50 px-6 pt-6 text-xs text-ink-faint sm:flex-row">
        <p>
          © {year} {SITE.name} · Site créé par Giovanni Gozzo
        </p>
        <Link href="/admin" className="transition-colors hover:text-terracotta-deep">
          Espace privé
        </Link>
      </div>
    </footer>
  )
}
