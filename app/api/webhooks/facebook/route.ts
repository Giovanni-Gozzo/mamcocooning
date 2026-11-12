/**
 * Receives the posts of the Mam Cocooning Facebook page from Make
 * (scenario "Facebook Pages › Watch posts" → "HTTP › Make a request").
 *
 * Make must send `Authorization: Bearer $FACEBOOK_WEBHOOK_SECRET` and the
 * fields id, message, full_picture and (optionally) images — as a form
 * (application/x-www-form-urlencoded, which Make escapes on its own) or as
 * JSON. `images` may be a list or one string of URLs separated by commas or
 * line breaks; `full_picture` is used when no other image is given.
 *
 * The answer comes right away; downloading, cleaning and sorting the photos
 * continue in the background so Make never times out.
 */
import { after } from 'next/server'
import { z } from 'zod'
import { fail, ok } from '@/lib/api'
import { hasBearerSecret } from '@/lib/bearer'
import { env, isBlobConfigured, isDatabaseConfigured } from '@/lib/env'
import { importIncomingImages, triageIncomingPost } from '@/lib/facebook-sync'
import { revalidatePublicPages } from '@/lib/revalidate'

export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_MESSAGE_LENGTH = 20_000

const UrlListSchema = z
  .union([z.string(), z.array(z.string())])
  .nullish()
  .transform((value) => {
    if (value === null || value === undefined) return []
    const list = Array.isArray(value) ? value : value.split(/[\s,]+/)
    return list.map((url) => url.trim()).filter((url) => url.length > 0)
  })

const PayloadSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String).pipe(z.string().trim().min(1).max(200)),
  message: z.string().max(MAX_MESSAGE_LENGTH).nullish(),
  images: UrlListSchema,
  full_picture: z.string().nullish(),
})

/** Form fields or JSON, whichever Make was set up to send. */
async function readBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) return request.json().catch(() => null)
  const form = await request.formData().catch(() => null)
  return form === null ? null : Object.fromEntries(form.entries())
}

export async function POST(request: Request) {
  if (!hasBearerSecret(request, env.facebookWebhookSecret)) return fail('Accès refusé.', 401)
  if (!isDatabaseConfigured() || !isBlobConfigured()) {
    return fail('La base de données et le stockage doivent être configurés.', 503)
  }

  const parsed = PayloadSchema.safeParse(await readBody(request))
  if (!parsed.success) return fail('Contenu invalide : il faut au moins "id".', 400)

  const { id, message, images, full_picture: fullPicture } = parsed.data
  const imageUrls = images.length > 0 ? images : fullPicture ? [fullPicture] : []
  const verdict = triageIncomingPost({ postId: id, message: message ?? undefined, imageUrls })

  if (verdict.status === 'ignored') return ok({ status: 'ignored', reason: verdict.reason })

  after(async () => {
    const report = await importIncomingImages(verdict.images)
    console.info(`[facebook] post ${id} : ${report.imported} photo(s) importée(s), ${report.failed} en échec`)
    if (report.imported > 0) revalidatePublicPages()
  })

  return ok({ status: 'accepted', photos: verdict.images.length }, { status: 202 })
}
