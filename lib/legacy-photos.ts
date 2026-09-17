/**
 * Photos committed to the repository. They keep the gallery alive before the
 * database is configured, and can be imported into it from the admin panel.
 */
import manifest from '@/data/legacy-photos.json'
import type { Photo } from './types'

export const LEGACY_PHOTOS: readonly Photo[] = manifest as readonly Photo[]
