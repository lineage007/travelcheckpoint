'use client';

import { useEffect } from 'react';
import Link from 'next/link';

// Route-level boundary for /search. The results screen renders partially-filled
// provider data while a search streams in, so an error here should degrade to a
// retry card rather than taking down the app shell.
export default function SearchError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('TravelCheckpoint search error:', error);
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', background: '#06060a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '420px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
          This search couldn’t be displayed
        </div>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', lineHeight: 1.5, color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
          One of the providers returned something the results screen couldn’t render. Run the search again, or start a new one.
        </p>
        {error.digest && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginBottom: '20px' }}>
            ref {error.digest}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => reset()}
            style={{ background: '#35c6ad', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            Try again
          </button>
          <Link href="/"
            style={{ background: 'rgba(255,255,255,0.04)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 18px', fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
            Back to search
          </Link>
        </div>
      </div>
    </div>
  );
}
