/**
 * Daily Facebook sync, called by Vercel Cron (see vercel.json).
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; without that secret the
 * route refuses every call, so nobody else can trigger imports.
 */
import { fail, ok } from '@/lib/api'
import { hasBearerSecret } from '@/lib/bearer'
import { env, isFacebookConfigured } from '@/lib/env'
import { describeSyncFailure, syncFacebookPhotos } from '@/lib/facebook-sync'
import { revalidatePublicPages } from '@/lib/revalidate'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: Request) {
  if (!hasBearerSecret(request, env.cronSecret)) return fail('Accès refusé.', 401)
  // Not wired up yet: nothing to do, and no point flagging a daily error.
  if (!isFacebookConfigured()) return ok({ isEnabled: false })

  try {
    const report = await syncFacebookPhotos()
    if (report.imported > 0) revalidatePublicPages()
    return ok({ isEnabled: true, ...report })
  } catch (error) {
    console.error('[facebook] synchronisation planifiée échouée', error)
    const failure = describeSyncFailure(error)
    return fail(failure.message, failure.status)
  }
}
