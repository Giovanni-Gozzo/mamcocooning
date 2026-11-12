/**
 * One Facebook post per day on the site.
 *
 * Each new post takes the next free day: today if nothing came out today,
 * otherwise the day after the last one already planned. A burst of posts on
 * Monday therefore fills Monday, Tuesday, Wednesday, and quiet days catch up
 * the backlog. A post comes out at 8:00 (Paris time) on its day — or right
 * away when its day is today and 8:00 has passed.
 *
 * Its photos are dated at that moment, which is also what keeps them off the
 * public pages until then (see the `created_at <= now()` filters).
 */
import { nanoid } from 'nanoid'
import { requireSql } from './db'

const POST_ID_LENGTH = 12
/** Two posts arriving at the same instant may race for the same day: retry. */
const MAX_SLOT_ATTEMPTS = 3
const POSTGRES_UNIQUE_VIOLATION = '23505'

export interface NewScheduledPost {
  /** Stable id from the source, e.g. `fbpost:123_456`. Re-sending it is harmless. */
  readonly externalId: string
  readonly body: string | null
}

export interface ScheduledPost {
  readonly id: string
  /** ISO 8601 moment the post becomes visible on the site. */
  readonly publishAt: string
}

interface PostRow {
  id: string
  created_at: string | Date
}

const toScheduled = (row: PostRow): ScheduledPost => ({
  id: row.id,
  publishAt: new Date(row.created_at).toISOString(),
})

const INSERT_IN_NEXT_FREE_DAY = `
  with today as (select (now() at time zone 'Europe/Paris')::date as day),
       slot as (
         select greatest(
                  today.day,
                  coalesce((select max(publish_on) + 1 from posts where publish_on is not null), today.day)
                ) as day
           from today
       )
  insert into posts (id, external_id, body, source, publish_on, created_at)
  select $1, $2, $3, 'facebook', slot.day,
         greatest(now(), (slot.day + time '08:00') at time zone 'Europe/Paris')
    from slot
  on conflict (external_id) do nothing
  returning id, created_at`

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === POSTGRES_UNIQUE_VIOLATION
  )
}

export async function findPostByExternalId(externalId: string): Promise<ScheduledPost | null> {
  const rows = (await requireSql().query(
    'select id, created_at from posts where external_id = $1',
    [externalId],
  )) as PostRow[]
  const row = rows[0]
  return row === undefined ? null : toScheduled(row)
}

/** Creates the post in the next free day, or returns it if it already exists. */
export async function createScheduledPost(post: NewScheduledPost): Promise<ScheduledPost> {
  for (let attempt = 1; attempt <= MAX_SLOT_ATTEMPTS; attempt += 1) {
    try {
      const rows = (await requireSql().query(INSERT_IN_NEXT_FREE_DAY, [
        nanoid(POST_ID_LENGTH),
        post.externalId,
        post.body,
      ])) as PostRow[]
      const created = rows[0]
      if (created !== undefined) return toScheduled(created)

      // Already known (sent twice, or another run got there first).
      const existing = await findPostByExternalId(post.externalId)
      if (existing !== null) return existing
      throw new Error(`Publication ${post.externalId} introuvable après création.`)
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === MAX_SLOT_ATTEMPTS) throw error
    }
  }
  /* v8 ignore next */
  throw new Error('Inatteignable.')
}
