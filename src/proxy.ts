import { NextResponse, type NextRequest } from 'next/server';
import { ACCESS_COOKIE, gateEnabled, hasValidAccess, isPublicPath } from './lib/access-gate';

/**
 * Optional access gate. Does nothing unless TC_ACCESS_KEY is set.
 * See src/lib/access-gate.ts and the README "Access gate (optional)" section.
 */
export async function proxy(request: NextRequest) {
  if (!gateEnabled()) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const key = process.env.TC_ACCESS_KEY!.trim();
  if (await hasValidAccess(request.cookies.get(ACCESS_COOKIE)?.value, key)) {
    return NextResponse.next();
  }

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'locked' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = '/unlock';
  url.search = '';
  url.searchParams.set('next', pathname + search);
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
