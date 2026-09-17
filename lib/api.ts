/** Consistent JSON envelope for every route handler. */
import { NextResponse } from 'next/server'

export interface ApiSuccess<T> {
  readonly success: true
  readonly data: T
  readonly error: null
}

export interface ApiFailure {
  readonly success: false
  readonly data: null
  readonly error: string
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data, error: null } as const, init)
}

export function fail(message: string, status: number): NextResponse<ApiFailure> {
  return NextResponse.json({ success: false, data: null, error: message } as const, { status })
}

/** Turns an unknown thrown value into a message safe to show a visitor. */
export function toPublicMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.startsWith('Base de données')) return error.message
  return fallback
}

/** Best-effort client identity for rate limiting behind Vercel's proxy. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() ?? 'unknown'
}
