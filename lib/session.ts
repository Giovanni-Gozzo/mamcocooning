/**
 * Session token handling, Edge-safe.
 *
 * Kept apart from `lib/auth.ts` because the middleware runs on the Edge runtime,
 * where `node:crypto` — used for password hashing — does not exist.
 */
import { SignJWT, jwtVerify } from 'jose'

export const SESSION_COOKIE = 'mc_session'
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30
const SESSION_SUBJECT = 'mam-cocooning-admin'

function readSecret(): string | null {
  const secret = process.env.SESSION_SECRET
  return secret !== undefined && secret.trim().length > 0 ? secret.trim() : null
}

function secretKey(): Uint8Array {
  const secret = readSecret()
  if (secret === null) {
    throw new Error('SESSION_SECRET manquant dans les variables d’environnement.')
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(SESSION_SUBJECT)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey())
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token || readSecret() === null) return false
  try {
    const { payload } = await jwtVerify(token, secretKey(), { subject: SESSION_SUBJECT })
    return payload.role === 'admin'
  } catch {
    return false
  }
}
