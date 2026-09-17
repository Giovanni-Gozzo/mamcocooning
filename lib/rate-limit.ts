/**
 * Minimal in-memory sliding-window limiter. Serverless instances each keep their
 * own window, which is enough to blunt password guessing on a single-admin site.
 */
const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 8
const MAX_TRACKED_KEYS = 500

const attempts = new Map<string, readonly number[]>()

export interface RateLimitResult {
  readonly isAllowed: boolean
  readonly remaining: number
  readonly retryAfterSeconds: number
}

export function checkRateLimit(key: string, now = Date.now()): RateLimitResult {
  const windowStart = now - WINDOW_MS
  const previous = attempts.get(key) ?? []
  const recent = previous.filter((timestamp) => timestamp > windowStart)

  if (recent.length >= MAX_ATTEMPTS) {
    const oldest = recent[0] ?? now
    return {
      isAllowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
    }
  }

  if (attempts.size > MAX_TRACKED_KEYS) attempts.clear()
  attempts.set(key, [...recent, now])

  return {
    isAllowed: true,
    remaining: MAX_ATTEMPTS - recent.length - 1,
    retryAfterSeconds: 0,
  }
}

/** Called after a successful login so a legitimate user is not kept throttled. */
export function resetRateLimit(key: string): void {
  attempts.delete(key)
}
