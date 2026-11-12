/** Checks `Authorization: Bearer <secret>` in constant time. No secret configured means no access. */
import { timingSafeEqual } from 'node:crypto'

export function hasBearerSecret(request: Request, secret: string | null): boolean {
  if (secret === null) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(request.headers.get('authorization') ?? '')
  return received.length === expected.length && timingSafeEqual(received, expected)
}
