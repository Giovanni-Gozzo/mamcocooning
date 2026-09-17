/**
 * Private mode.
 *
 * While SITE_PRIVATE is on, every public page shows a holding notice instead of
 * the site. The gallery carries recognisable photographs of children, so it
 * stays closed until the parental image-rights consents are signed.
 *
 * Anyone holding a valid admin session sees the real site, so Sigrid can review
 * it exactly as visitors eventually will.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, isValidSessionToken } from '@/lib/session'

/** Reachable even in private mode, so the owner can always get back in. */
const ALWAYS_OPEN = ['/admin', '/api/auth', '/bientot']

function isPrivateMode(): boolean {
  return process.env.SITE_PRIVATE === 'true'
}

export async function middleware(request: NextRequest) {
  if (!isPrivateMode()) return NextResponse.next()

  const { pathname } = request.nextUrl
  if (ALWAYS_OPEN.some((prefix) => pathname.startsWith(prefix))) return NextResponse.next()

  if (await isValidSessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next()
  }

  const holding = request.nextUrl.clone()
  holding.pathname = '/bientot'
  holding.search = ''
  return NextResponse.rewrite(holding)
}

export const config = {
  // Everything except Next's own assets, the icons and the sitemap files.
  matcher: ['/((?!_next/static|_next/image|icon.png|apple-icon.png|robots.txt|sitemap.xml).*)'],
}
