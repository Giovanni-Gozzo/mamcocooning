/**
 * One-click backend setup from the admin panel: create the tables, sync the
 * seed categories, and import the photos already committed to the repository.
 */
import { revalidatePath } from 'next/cache'
import { fail, ok, toPublicMessage } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import { isDatabaseConfigured, missingAdminConfig } from '@/lib/env'
import { runMigration } from '@/lib/migrate'
import { importLegacyPhotos } from '@/lib/photos'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET() {
  if (!(await isAuthenticated())) return fail('Connexion requise.', 401)
  return ok({ missing: missingAdminConfig() })
}

export async function POST() {
  if (!(await isAuthenticated())) return fail('Connexion requise.', 401)
  if (!isDatabaseConfigured()) {
    return fail('Ajoutez DATABASE_URL dans Vercel avant de lancer l’initialisation.', 503)
  }

  try {
    const migration = await runMigration()
    const imported = await importLegacyPhotos()

    revalidatePath('/')
    revalidatePath('/galerie')
    revalidatePath('/programmes')

    return ok({ ...migration, importedPhotos: imported })
  } catch (error) {
    console.error('[setup] échec', error)
    return fail(toPublicMessage(error, 'Initialisation impossible.'), 500)
  }
}
