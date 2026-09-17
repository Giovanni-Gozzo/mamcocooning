import type { Metadata, Viewport } from 'next'
import { Fraunces, Nunito } from 'next/font/google'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ScrollProgress } from '@/components/ui/ScrollProgress'
import { env } from '@/lib/env'
import { SITE } from '@/lib/site'
import './globals.css'

// Only the weights actually used: the optical-size and soft/wonk axes tripled
// the file for no visible difference.
const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  weight: ['600', '700'],
})

const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nunito',
  weight: ['400', '600', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: `${SITE.name} — Maison d’Assistantes Maternelles à ${SITE.address.city}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    'MAM',
    'maison d’assistantes maternelles',
    'assistante maternelle',
    SITE.address.city,
    'garde d’enfants',
    'Vaucluse',
  ],
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
}

export const viewport: Viewport = {
  themeColor: '#fdf8f2',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

/**
 * Local-business markup. This is what lets Google show the MAM with its
 * address, hours and phone number directly in the results, and what ties the
 * site to the Google Business Profile.
 */
const localBusinessJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ChildCare',
  '@id': `${env.siteUrl}/#organisation`,
  name: SITE.name,
  alternateName: 'MAM Cocooning',
  description: SITE.description,
  telephone: SITE.phoneHref,
  url: env.siteUrl,
  image: `${env.siteUrl}/img/logo-mam-cocooning.png`,
  logo: `${env.siteUrl}/img/logo-mam-cocooning.png`,
  address: {
    '@type': 'PostalAddress',
    streetAddress: SITE.address.street,
    postalCode: SITE.address.postalCode,
    addressLocality: SITE.address.city,
    addressRegion: 'Vaucluse',
    addressCountry: 'FR',
  },
  areaServed: SITE.areaServed.map((city) => ({ '@type': 'City', name: city })),
  audience: {
    '@type': 'PeopleAudience',
    suggestedMinAge: 0,
    suggestedMaxAge: 3,
  },
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '07:30',
    closes: '18:30',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${nunito.variable}`}>
      <body className="antialiased">
        <script
          type="application/ld+json"
          // Static, author-controlled payload — no user input reaches this.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[70] focus:rounded-full focus:bg-terracotta focus:px-5 focus:py-3 focus:font-semibold focus:text-cream"
        >
          Aller au contenu
        </a>
        <ScrollProgress />
        <Header />
        <main id="contenu">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
