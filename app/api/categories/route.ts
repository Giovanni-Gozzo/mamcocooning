import { ok } from '@/lib/api'
import { listCategoriesWithCounts } from '@/lib/photos'

export const runtime = 'nodejs'
export const revalidate = 60

export async function GET() {
  return ok({ categories: await listCategoriesWithCounts() })
}
