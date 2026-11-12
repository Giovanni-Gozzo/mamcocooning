import type { Metadata } from 'next'
import { LoginForm } from '@/components/admin/LoginForm'
import { LogoutButton } from '@/components/admin/LogoutButton'
import { PhotoManager } from '@/components/admin/PhotoManager'
import { PostComposer } from '@/components/admin/PostComposer'
import { SetupPanel } from '@/components/admin/SetupPanel'
import { SiteImagesManager } from '@/components/admin/SiteImagesManager'
import { isAuthenticated } from '@/lib/auth'
import {
  isAdminConfigured,
  isBlobConfigured,
  isDatabaseConfigured,
  missingAdminConfig,
} from '@/lib/env'
import { listPhotos } from '@/lib/photos'
import { listSiteImages } from '@/lib/site-images'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Espace privé',
  robots: { index: false, follow: false },
}

export default async function AdminPage() {
  const isLoggedIn = await isAuthenticated()

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-[80vh] items-center px-6 pt-32 pb-16">
        <LoginForm isConfigured={isAdminConfigured()} />
      </div>
    )
  }

  const [photos, siteImages] = await Promise.all([
    listPhotos({ limit: 400 }),
    listSiteImages(),
  ])

  const canUpload = isDatabaseConfigured() && isBlobConfigured()

  return (
    <div className="px-6 pt-32 pb-16 sm:pt-40">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-ink-faint uppercase">
              Espace privé
            </p>
            <h1 className="mt-2 text-4xl">Bonjour Sigrid 👋</h1>
            <p className="mt-2 leading-relaxed text-ink-soft">
              {photos.length} photo{photos.length > 1 ? 's' : ''} et vidéo
              {photos.length > 1 ? 's' : ''} en ligne.
            </p>
          </div>
          <LogoutButton />
        </div>

        <div className="mt-10">
          <PostComposer isReady={canUpload} />
        </div>

        {!canUpload && (
          <p className="mt-6 rounded-2xl bg-honey/20 px-5 py-4 text-sm leading-relaxed ring-1 ring-honey/40">
            L&rsquo;envoi de photos sera actif dès que la base de données et le stockage seront
            configurés. Les détails sont en bas de page.
          </p>
        )}

        <section className="mt-16">
          <h2 className="text-2xl">Photos de la page d&rsquo;accueil</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Chaque pièce de la visite de la maison, et les portraits de l&rsquo;équipe. Touchez une
            photo pour la voir en entier, ou remplacez-la : la page d&rsquo;accueil se met à jour
            toute seule.
          </p>
          <div className="mt-7">
            <SiteImagesManager images={siteImages} isReady={canUpload} />
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl">Les photos et vidéos des publications</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Touchez une photo pour la voir en entier. Vous pouvez retirer du site celles qui ne
            doivent plus y être.
          </p>
          <div className="mt-7">
            <PhotoManager photos={photos} isReady={canUpload} />
          </div>
        </section>

        <div className="mt-16">
          <SetupPanel missing={missingAdminConfig()} />
        </div>
      </div>
    </div>
  )
}
