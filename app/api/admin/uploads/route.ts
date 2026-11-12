/**
 * Hands the browser a short-lived token to send a photo or video straight to
 * storage, bypassing the 4.5 MB request limit of functions. Owner only, and
 * only into incoming/, where lib/publications.ts picks the files up.
 */
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { fail } from '@/lib/api'
import { isAuthenticated } from '@/lib/auth'
import { env } from '@/lib/env'
import { MAX_UPLOAD_BYTES } from '@/lib/image'
import { INCOMING_PREFIX } from '@/lib/publications'
import { MAX_VIDEO_BYTES } from '@/lib/video'

export const runtime = 'nodejs'

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif',
  'video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/3gpp',
]

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null
  if (body === null) return fail('Requête invalide.', 400)

  try {
    const result = await handleUpload({
      body,
      request,
      token: env.blobToken ?? undefined,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await isAuthenticated())) throw new Error('Connexion requise.')
        if (!pathname.startsWith(INCOMING_PREFIX)) throw new Error('Emplacement refusé.')
        return {
          allowedContentTypes: ALLOWED_TYPES,
          maximumSizeInBytes: Math.max(MAX_UPLOAD_BYTES, MAX_VIDEO_BYTES),
          addRandomSuffix: true,
        }
      },
      // Processing is triggered by the admin page itself, which knows the publication.
      onUploadCompleted: async () => undefined,
    })
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Envoi refusé.'
    return fail(message, message === 'Connexion requise.' ? 401 : 400)
  }
}
