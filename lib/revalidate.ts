/** Pages that show photos, refreshed whenever the gallery changes. */
import { revalidatePath } from 'next/cache'

const PHOTO_PAGES = ['/', '/galerie', '/programmes'] as const

export function revalidatePublicPages(): void {
  for (const path of PHOTO_PAGES) revalidatePath(path)
}
