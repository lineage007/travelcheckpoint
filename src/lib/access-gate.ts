/**
 * Optional access gate (security review finding 1).
 *
 * Completely inert unless `TC_ACCESS_KEY` is set to a non-empty value. When it
 * is set, `src/proxy.ts` requires the `tc_access` cookie on every non-public
 * path; `/api/unlock` issues that cookie after checking the key.
 *
 * Pure helpers only: no Next.js imports, Web Crypto for hashing, so this runs
 * in the proxy runtime, route handlers and vitest alike.
 */

export const ACCESS_COOKIE = 'tc_access';
export const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days, in seconds

export function gateEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return typeof env.TC_ACCESS_KEY === 'string' && env.TC_ACCESS_KEY.trim().length > 0;
}

const PUBLIC_EXACT: ReadonlySet<string> = new Set([
  '/unlock',
  '/api/unlock',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
]);

// Next.js metadata files (icon, apple-icon, opengraph-image, twitter-image, manifest),
// matched as a whole name plus an optional variant or extension, so a page such as
// /iconic or /manifesto stays locked.
const PUBLIC_PATTERNS: readonly RegExp[] = [
  /^\/_next\//,
  /^\/manifest(?:\.[a-z]+)?$/i,
  /^\/(?:icon|apple-icon|opengraph-image|twitter-image)(?:[-.\d/][^/]*)?$/i,
];

const STATIC_EXT =
  /\.(?:png|jpe?g|svg|webp|ico|gif|txt|xml|json|webmanifest|js|css|map|woff2?)$/i;

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (PUBLIC_PATTERNS.some((re) => re.test(pathname))) return true;
  // Static assets are public, but never anything under /api/ (e.g. /api/search.json).
  if (!pathname.startsWith('/api/') && STATIC_EXT.test(pathname)) return true;
  return false;
}

export async function accessToken(key: string): Promise<string> {
  const data = new TextEncoder().encode('tc-access-v1:' + key);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time for equal-length inputs; length mismatch returns false early (tokens are fixed-length hex). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Same-origin relative path only; anything else becomes "/". */
export function safeNext(raw: unknown): string {
  if (typeof raw !== 'string') return '/';
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  return raw;
}

/** True when the request carries a valid tc_access cookie for the configured key. */
export async function hasValidAccess(cookieValue: string | undefined, key: string): Promise<boolean> {
  if (!cookieValue) return false;
  return safeEqual(cookieValue, await accessToken(key));
}
