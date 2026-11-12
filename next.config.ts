import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next regenerates AGENTS.md/CLAUDE.md on every build; the repo keeps its own.
  agentRules: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.public.blob.vercel-storage.com' }],
    formats: ['image/avif', 'image/webp'],
  },
  async redirects() {
    return [
      // The photo gallery became the news feed; ?categorie= is carried over.
      { source: '/galerie', destination: '/actualites', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/programme.html', destination: '/programmes', permanent: true },
      { source: '/as.html', destination: '/equipe', permanent: true },
      { source: '/contact.html', destination: '/contact', permanent: true },
    ]
  },
}

export default nextConfig
