import type { Metadata } from 'next';
import { safeNext } from '@/lib/access-gate';

export const metadata: Metadata = {
  title: 'Unlock · TravelCheckpoint',
  robots: { index: false, follow: false },
};

const COLORS = { bg: '#06060a', card: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.06)', accent: '#35c6ad', text: '#ffffff', sub: 'rgba(255,255,255,0.64)' };

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = safeNext(first(params.next) ?? '/');
  const hasError = first(params.error) === '1';

  return (
    <main style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <form
        method="post"
        action="/api/unlock"
        style={{ width: '100%', maxWidth: '360px', background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '20px 16px' }}
      >
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, color: COLORS.text, marginBottom: '6px' }}>
          TravelCheckpoint is locked
        </h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: COLORS.sub, marginBottom: '16px' }}>
          Enter the access key to use this device.
        </p>
        <label
          htmlFor="key"
          style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600, color: COLORS.sub, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}
        >
          Access key
        </label>
        <input
          id="key"
          name="key"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? 'unlock-error' : undefined}
          style={{ width: '100%', padding: '12px', borderRadius: '10px', border: `1px solid ${hasError ? '#EF4444' : 'rgba(255,255,255,0.12)'}`, background: 'rgba(255,255,255,0.04)', color: COLORS.text, fontFamily: 'var(--font-sans)', fontSize: '16px' }}
        />
        <input type="hidden" name="next" value={next} />
        {hasError && (
          <p id="unlock-error" role="alert" style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#F87171', marginTop: '8px' }}>
            That key didn&apos;t work. Try again.
          </p>
        )}
        <button
          type="submit"
          style={{ width: '100%', marginTop: '16px', padding: '12px', borderRadius: '10px', border: 'none', background: COLORS.accent, color: '#06060a', fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}
        >
          Unlock
        </button>
      </form>
    </main>
  );
}
