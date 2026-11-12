/** Owner-triggered Facebook sync, from the "Récupérer les photos Facebook" button. */
import { clientKey, fail, ok } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import { describeSyncFailure, syncFacebookPhotos } from '@/lib/facebook-sync'
import { checkRateLimit } from '@/lib/rate-limit'
import { revalidatePublicPages } from '@/lib/revalidate'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: Request) {
  if (!(await isAuthenticated())) return fail('Connexion requise.', 401)

  const limit = checkRateLimit(`facebook-sync:${clientKey(request)}`)
  if (!limit.isAllowed) return fail('Trop de synchronisations d’affilée. Patientez un peu.', 429)

  try {
    const report = await syncFacebookPhotos()
    if (report.imported > 0) revalidatePublicPages()
    return ok(report)
  } catch (error) {
    console.error('[facebook] synchronisation manuelle échouée', error)
    const failure = describeSyncFailure(error)
    return fail(failure.message, failure.status)
  }
}
