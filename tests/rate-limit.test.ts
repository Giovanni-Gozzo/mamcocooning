import { describe, expect, test } from 'vitest'
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit'

const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 8

describe('checkRateLimit', () => {
  test('allows the first attempt and reports the remaining budget', () => {
    const result = checkRateLimit('first-attempt')

    expect(result.isAllowed).toBe(true)
    expect(result.remaining).toBe(MAX_ATTEMPTS - 1)
  })

  test('blocks once the maximum number of attempts is reached', () => {
    const key = 'blocked-key'
    for (let index = 0; index < MAX_ATTEMPTS; index += 1) checkRateLimit(key)

    const result = checkRateLimit(key)

    expect(result.isAllowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterSeconds).toBeGreaterThan(0)
  })

  test('lets attempts through again once the window has slid past', () => {
    const key = 'sliding-key'
    const start = 1_000_000
    for (let index = 0; index < MAX_ATTEMPTS; index += 1) checkRateLimit(key, start)

    expect(checkRateLimit(key, start).isAllowed).toBe(false)
    expect(checkRateLimit(key, start + WINDOW_MS + 1).isAllowed).toBe(true)
  })

  test('tracks each key independently', () => {
    const key = 'noisy-key'
    for (let index = 0; index < MAX_ATTEMPTS; index += 1) checkRateLimit(key)

    expect(checkRateLimit(key).isAllowed).toBe(false)
    expect(checkRateLimit('quiet-key').isAllowed).toBe(true)
  })

  test('resetRateLimit clears the history for a key', () => {
    const key = 'reset-key'
    for (let index = 0; index < MAX_ATTEMPTS; index += 1) checkRateLimit(key)
    expect(checkRateLimit(key).isAllowed).toBe(false)

    resetRateLimit(key)

    expect(checkRateLimit(key).isAllowed).toBe(true)
  })
})
