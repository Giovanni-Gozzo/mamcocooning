/**
 * Public listing, optionally scoped to one category. New photos and videos are
 * added through publications (see /api/admin/posts).
 */
import { z } from 'zod'
import { fail, ok } from '@/lib/api'
import { listPhotos } from '@/lib/photos'

export const runtime = 'nodejs'

const QuerySchema = z.object({
  category: z.string().trim().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).max(10_000).optional(),
})

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const parsed = QuerySchema.safeParse({
    category: params.get('category') ?? undefined,
    limit: params.get('limit') ?? undefined,
    offset: params.get('offset') ?? undefined,
  })

  if (!parsed.success) return fail('Paramètres de recherche invalides.', 400)

  const photos = await listPhotos({
    categorySlug: parsed.data.category,
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  })
  return ok({ photos })
}
