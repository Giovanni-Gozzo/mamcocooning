/**
 * Daily Facebook sync, called by Vercel Cron (see vercel.json).
 *
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; without that secret the
 * route refuses every call, so nobody else can trigger imports.
 */
import { timingSafeEqual } from 'node:crypto'
import { fail, ok } from '@/lib/api'
import { env, isFacebookConfigured } from '@/lib/env'
import { describeSyncFailure, syncFacebookPhotos } from '@/lib/facebook-sync'
import { revalidatePublicPages } from '@/lib/revalidate'

export const runtime = 'nodejs'
export const maxDuration = 300

function isAuthorizedCron(request: Request): boolean {
  const secret = env.cronSecret
  if (secret === null) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(request.headers.get('authorization') ?? '')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return fail('Accès refusé.', 401)
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
