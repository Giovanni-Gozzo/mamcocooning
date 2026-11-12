/**
 * The fixed photos of the site — the house tour and the team portraits.
 *
 * Their defaults ship with the repository (lib/site.ts). Sigrid can replace
 * any of them from /admin; a replacement is stored in `site_images` and wins
 * over the default. Without a database the defaults are simply shown.
 */
import { getSql, requireSql } from './db'
import { HOUSE_TOUR, TEAM, type TeamMember, type TourStop } from './site'
import { toSlug } from './taxonomy'

export type SiteImageGroup = 'maison' | 'equipe'

export interface SiteImageSlot {
  readonly id: string
  readonly label: string
  readonly group: SiteImageGroup
  readonly defaultUrl: string | null
}

export interface SiteImage extends SiteImageSlot {
  readonly url: string | null
  readonly isCustom: boolean
}

const POSTGRES_UNDEFINED_TABLE = '42P01'

const tourSlotId = (stop: TourStop): string => `maison-${toSlug(stop.title)}`
const teamSlotId = (member: TeamMember): string => `equipe-${toSlug(member.name)}`

export const SITE_IMAGE_SLOTS: readonly SiteImageSlot[] = [
  ...HOUSE_TOUR.map((stop) => ({
    id: tourSlotId(stop),
    label: stop.title,
    group: 'maison' as const,
    defaultUrl: stop.image,
  })),
  ...TEAM.map((member) => ({
    id: teamSlotId(member),
    label: `Portrait de ${member.name}`,
    group: 'equipe' as const,
    defaultUrl: member.photoUrl,
  })),
]

export function isKnownSlot(id: string): boolean {
  return SITE_IMAGE_SLOTS.some((slot) => slot.id === id)
}

function isMissingTable(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === POSTGRES_UNDEFINED_TABLE
  )
}

/** Replacements chosen in /admin, by slot id. Empty when none or no database. */
export async function getSiteImageOverrides(): Promise<ReadonlyMap<string, string>> {
  const sql = getSql()
  if (sql === null) return new Map()

  try {
    const rows = (await sql.query('select slot, url from site_images')) as {
      slot: string
      url: string
    }[]
    return new Map(rows.map((row) => [row.slot, row.url]))
  } catch (error) {
    // Before "Initialiser la base" the table does not exist yet: defaults apply.
    if (!isMissingTable(error)) console.error('[site-images] lecture impossible', error)
    return new Map()
  }
}

export function applyToHouseTour(overrides: ReadonlyMap<string, string>): readonly TourStop[] {
  return HOUSE_TOUR.map((stop) => ({ ...stop, image: overrides.get(tourSlotId(stop)) ?? stop.image }))
}

export function applyToTeam(overrides: ReadonlyMap<string, string>): readonly TeamMember[] {
  return TEAM.map((member) => ({
    ...member,
    photoUrl: overrides.get(teamSlotId(member)) ?? member.photoUrl,
  }))
}

/** Every fixed photo with what is currently shown, for the admin panel. */
export async function listSiteImages(): Promise<readonly SiteImage[]> {
  const overrides = await getSiteImageOverrides()
  return SITE_IMAGE_SLOTS.map((slot) => {
    const custom = overrides.get(slot.id)
    return { ...slot, url: custom ?? slot.defaultUrl, isCustom: custom !== undefined }
  })
}

/** Stores a replacement and returns the URL it replaced, if it was a custom one. */
export async function setSiteImage(slot: string, url: string): Promise<string | null> {
  const sql = requireSql()
  const previous = (await sql.query('select url from site_images where slot = $1', [slot])) as {
    url: string
  }[]
  await sql.query(
    `insert into site_images (slot, url) values ($1, $2)
     on conflict (slot) do update set url = excluded.url, updated_at = now()`,
    [slot, url],
  )
  return previous[0]?.url ?? null
}

/** Goes back to the original photo and returns the custom URL that was removed. */
export async function resetSiteImage(slot: string): Promise<string | null> {
  const rows = (await requireSql().query(
    'delete from site_images where slot = $1 returning url',
    [slot],
  )) as { url: string }[]
  return rows[0]?.url ?? null
}
