/** Pages that show photos, refreshed whenever the gallery changes. */
import { revalidatePath } from 'next/cache'

const PHOTO_PAGES = ['/', '/actualites', '/programmes'] as const

export function revalidatePublicPages(): void {
  for (const path of PHOTO_PAGES) revalidatePath(path)
}

/** Pages showing the house tour or the team portraits. */
export function revalidateSiteImagePages(): void {
  revalidatePath('/')
  revalidatePath('/equipe')
}
