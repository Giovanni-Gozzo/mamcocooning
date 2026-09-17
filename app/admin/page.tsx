import type { Metadata } from 'next'
import { LoginForm } from '@/components/admin/LoginForm'
import { LogoutButton } from '@/components/admin/LogoutButton'
import { PhotoManager } from '@/components/admin/PhotoManager'
import { SetupPanel } from '@/components/admin/SetupPanel'
import { UploadDropzone } from '@/components/admin/UploadDropzone'
import { isAuthenticated } from '@/lib/auth'
import {
  isAdminConfigured,
  isBlobConfigured,
  isDatabaseConfigured,
  missingAdminConfig,
} from '@/lib/env'
import { listAllCategories, listCategoriesWithCounts, listPhotos } from '@/lib/photos'

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

  const [categories, categoriesWithCounts, photos] = await Promise.all([
    listAllCategories(),
    listCategoriesWithCounts(),
    listPhotos({ limit: 400 }),
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
              {photos.length} photo{photos.length > 1 ? 's' : ''} en ligne, réparties dans{' '}
              {categoriesWithCounts.length} catégorie
              {categoriesWithCounts.length > 1 ? 's' : ''}.
            </p>
          </div>
          <LogoutButton />
        </div>

        <div className="mt-10">
          <UploadDropzone categories={categories} isReady={canUpload} />
        </div>

        {!canUpload && (
          <p className="mt-6 rounded-2xl bg-honey/20 px-5 py-4 text-sm leading-relaxed ring-1 ring-honey/40">
            L&rsquo;envoi de photos sera actif dès que la base de données et le stockage seront
            configurés. Les détails sont en bas de page.
          </p>
        )}

        <section className="mt-16">
          <h2 className="text-2xl">Les photos en ligne</h2>
          <p className="mt-2 leading-relaxed text-ink-soft">
            Si une photo n&rsquo;est pas dans la bonne catégorie, changez-la ici : le site se met à
            jour tout seul.
          </p>
          <div className="mt-7">
            <PhotoManager photos={photos} categories={categories} isReady={canUpload} />
          </div>
        </section>

        <div className="mt-16">
          <SetupPanel missing={missingAdminConfig()} isDatabaseReady={isDatabaseConfigured()} />
        </div>
      </div>
    </div>
  )
}
