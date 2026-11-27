import { afterEach, describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import {
  ACCESS_COOKIE,
  accessToken,
  gateEnabled,
  isPublicPath,
  safeEqual,
  safeNext,
} from './access-gate';
import { proxy } from '../proxy';
import { GET as unlockGET, POST as unlockPOST } from '../app/api/unlock/route';

describe('gateEnabled', () => {
  it('is off when TC_ACCESS_KEY is unset, empty or whitespace', () => {
    expect(gateEnabled({})).toBe(false);
    expect(gateEnabled({ TC_ACCESS_KEY: '' })).toBe(false);
    expect(gateEnabled({ TC_ACCESS_KEY: '   \n\t' })).toBe(false);
  });
  it('is on when TC_ACCESS_KEY has content', () => {
    expect(gateEnabled({ TC_ACCESS_KEY: 'some-key' })).toBe(true);
  });
});

describe('isPublicPath', () => {
  it.each([
    '/unlock', '/api/unlock', '/_next/static/chunks/a.js', '/_next/image', '/favicon.ico',
    '/manifest.json', '/robots.txt', '/sitemap.xml', '/icon-192.png', '/apple-icon.png',
    '/opengraph-image', '/twitter-image', '/logo-white.svg', '/llms.txt', '/fonts/a.woff2',
  ])('%s is public', (p) => expect(isPublicPath(p)).toBe(true));

  it.each([
    '/', '/search', '/stays', '/settings', '/book', '/book/confirm', '/history',
    '/api/search', '/api/book/complete', '/api/book/prebook', '/api/duffel', '/api/chat',
    '/api/search.json', '/unlock/extra', '/api/unlock2',
  ])('%s is protected', (p) => expect(isPublicPath(p)).toBe(false));
});

describe('accessToken', () => {
  it('is deterministic 64-char hex', async () => {
    const a = await accessToken('k1');
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await accessToken('k1')).toBe(a);
  });
  it('differs for different keys', async () => {
    expect(await accessToken('k1')).not.toBe(await accessToken('k2'));
  });
});

describe('safeEqual', () => {
  it('compares strings', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('safeNext', () => {
  it('keeps same-origin paths', () => {
    expect(safeNext('/')).toBe('/');
    expect(safeNext('/search?x=1')).toBe('/search?x=1');
  });
  it.each(['//evil.com', 'https://evil.com', '/\\evil', '', undefined])('rejects %s', (raw) => {
    expect(safeNext(raw)).toBe('/');
  });
});

const ORIGINAL_KEY = process.env.TC_ACCESS_KEY;
afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.TC_ACCESS_KEY;
  else process.env.TC_ACCESS_KEY = ORIGINAL_KEY;
});

const TEST_KEY = 'test-only-key';
const req = (path: string, cookie?: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(new URL(path, 'http://localhost:3000'), {
    ...init,
    headers: { ...(cookie ? { cookie: `${ACCESS_COOKIE}=${cookie}` } : {}), ...(init?.headers as Record<string, string> | undefined) },
  });
const passes = (res: Response) => res.headers.get('x-middleware-next') === '1';

describe('proxy', () => {
  it('passes everything when the gate is off', async () => {
    delete process.env.TC_ACCESS_KEY;
    expect(passes(await proxy(req('/api/search')))).toBe(true);
    expect(passes(await proxy(req('/api/book/complete')))).toBe(true);
    process.env.TC_ACCESS_KEY = '   ';
    expect(passes(await proxy(req('/search')))).toBe(true);
  });

  it('returns 401 JSON for /api/* without a cookie', async () => {
    process.env.TC_ACCESS_KEY = TEST_KEY;
    const res = await proxy(req('/api/search'));
    expect(res.status).toBe(401);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ error: 'locked' });
  });

  it('redirects pages to /unlock with next', async () => {
    process.env.TC_ACCESS_KEY = TEST_KEY;
    const res = await proxy(req('/search'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/unlock?next=%2Fsearch');
    const withQuery = await proxy(req('/search?from=DXB&to=LHR'));
    expect(new URL(withQuery.headers.get('location')!).searchParams.get('next')).toBe('/search?from=DXB&to=LHR');
  });

  it('rejects a wrong cookie and passes the right one', async () => {
    process.env.TC_ACCESS_KEY = TEST_KEY;
    expect((await proxy(req('/api/book/complete', 'nope'))).status).toBe(401);
    expect((await proxy(req('/api/search', await accessToken('other')))).status).toBe(401);
    const good = await accessToken(TEST_KEY);
    expect(passes(await proxy(req('/api/search', good)))).toBe(true);
    expect(passes(await proxy(req('/search', good)))).toBe(true);
  });

  it('lets /unlock and static assets through', async () => {
    process.env.TC_ACCESS_KEY = TEST_KEY;
    expect(passes(await proxy(req('/unlock')))).toBe(true);
    expect(passes(await proxy(req('/api/unlock')))).toBe(true);
    expect(passes(await proxy(req('/manifest.json')))).toBe(true);
  });
});

const post = (body: Record<string, string>, json = false) =>
  new NextRequest('http://localhost:3000/api/unlock', {
    method: 'POST',
    headers: { 'content-type': json ? 'application/json' : 'application/x-www-form-urlencoded' },
    body: json ? JSON.stringify(body) : new URLSearchParams(body).toString(),
  });

describe('/api/unlock', () => {
  it('GET is 405', () => {
    expect(unlockGET().status).toBe(405);
  });

  it('is 404 when the gate is off', async () => {
    delete process.env.TC_ACCESS_KEY;
    expect((await unlockPOST(post({ key: 'x' }))).status).toBe(404);
  });

  it('sets the cookie and redirects 303 to a safe next on success', async () => {
    process.env.TC_ACCESS_KEY = TEST_KEY;
    const res = await unlockPOST(post({ key: TEST_KEY, next: '/search?x=1' }));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost:3000/search?x=1');
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`${ACCESS_COOKIE}=${await accessToken(TEST_KEY)}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=lax/i);
    expect(cookie).toMatch(/Max-Age=15552000/);
  });

  it('accepts JSON and drops an unsafe next', async () => {
    process.env.TC_ACCESS_KEY = TEST_KEY;
    const res = await unlockPOST(post({ key: TEST_KEY, next: '//evil.com' }, true));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('redirects to /unlock?error=1 without a cookie on a wrong key', async () => {
    process.env.TC_ACCESS_KEY = TEST_KEY;
    const res = await unlockPOST(post({ key: 'wrong', next: '/stays' }));
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost:3000/unlock?error=1&next=%2Fstays');
    expect(res.headers.get('set-cookie')).toBeNull();
    const empty = await unlockPOST(post({ key: '' }));
    expect(empty.headers.get('set-cookie')).toBeNull();
  });
});

describe('isPublicPath metadata names are matched whole', () => {
  it.each(['/iconic', '/manifesto', '/icons-of-travel', '/opengraph-images-admin'])('%s stays locked', (p) => {
    expect(isPublicPath(p)).toBe(false);
  });
  it.each(['/icon', '/icon.png', '/icon1', '/icon/small', '/apple-icon.png', '/manifest', '/manifest.webmanifest', '/opengraph-image', '/twitter-image.png'])('%s is public', (p) => {
    expect(isPublicPath(p)).toBe(true);
  });
});
