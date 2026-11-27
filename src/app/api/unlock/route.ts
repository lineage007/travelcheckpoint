import { NextResponse, type NextRequest } from 'next/server';
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  accessToken,
  gateEnabled,
  safeEqual,
  safeNext,
} from '../../../lib/access-gate'; // relative so vitest resolves it without an alias config

// Never logs the submitted key, the configured key or the token.

async function readFields(request: NextRequest): Promise<{ key: string; next: string }> {
  const type = request.headers.get('content-type') ?? '';
  try {
    if (type.includes('application/json')) {
      const body = (await request.json()) as { key?: unknown; next?: unknown };
      return {
        key: typeof body.key === 'string' ? body.key : '',
        next: typeof body.next === 'string' ? body.next : '',
      };
    }
    const form = await request.formData();
    const key = form.get('key');
    const next = form.get('next');
    return {
      key: typeof key === 'string' ? key : '',
      next: typeof next === 'string' ? next : '',
    };
  } catch {
    return { key: '', next: '' };
  }
}

export async function POST(request: NextRequest) {
  if (!gateEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { key, next } = await readFields(request);
  const dest = safeNext(next);
  const expected = await accessToken(process.env.TC_ACCESS_KEY!.trim());
  const submitted = await accessToken(key.trim());

  if (key.trim().length > 0 && safeEqual(submitted, expected)) {
    const res = NextResponse.redirect(new URL(dest, request.url), 303);
    res.cookies.set(ACCESS_COOKIE, expected, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: ACCESS_COOKIE_MAX_AGE,
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }

  const fail = new URL('/unlock', request.url);
  fail.searchParams.set('error', '1');
  fail.searchParams.set('next', dest);
  const res = NextResponse.redirect(fail, 303);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
}
