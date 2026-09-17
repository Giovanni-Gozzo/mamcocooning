import type { MetadataRoute } from 'next'
import { env } from '@/lib/env'
import { NAV_LINKS } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return NAV_LINKS.map((link) => ({
    url: `${env.siteUrl}${link.href === '/' ? '' : link.href}`,
    lastModified,
    changeFrequency: link.href === '/galerie' ? 'weekly' : 'monthly',
    priority: link.href === '/' ? 1 : 0.8,
  }))
}
