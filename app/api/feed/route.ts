/** Public, paged news feed — used by the "Voir plus" button. */
import { z } from 'zod'
import { fail, ok } from '@/lib/api'
import { listFeed } from '@/lib/feed'

export const runtime = 'nodejs'

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).optional(),
  offset: z.coerce.number().int().min(0).max(10_000).optional(),
})

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const parsed = QuerySchema.safeParse({
    limit: params.get('limit') ?? undefined,
    offset: params.get('offset') ?? undefined,
  })
  if (!parsed.success) return fail('Paramètres de recherche invalides.', 400)

  const page = await listFeed({
    limit: parsed.data.limit,
    offset: parsed.data.offset,
  })
  return ok(page)
}
