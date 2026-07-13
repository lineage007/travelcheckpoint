'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';

const C = { bg: '#06060a', card: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.06)', accent: '#8B5CF6', text: '#ffffff', sub: 'rgba(255,255,255,0.4)' };

interface BookingResult {
  bookingId: string; status: string; hotelConfirmationCode: string; hotelName: string;
  checkin: string; checkout: string; price: number | null; currency: string;
  refundableTag: string; lastFreeCancellationDate: string; sandbox: boolean;
}

function ConfirmInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working');
  const [result, setResult] = useState<BookingResult | null>(null);
  const [detail, setDetail] = useState('');
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    (async () => {
      await Promise.resolve();
      const tid = params.get('tid');
      const pid = params.get('pid');
      let ctx: { prebookId?: string; transactionId?: string; holder?: Record<string, string>; hotel?: string } | null = null;
      try { ctx = JSON.parse(window.sessionStorage.getItem('tc_booking_finalize') || 'null'); } catch { /* ignore */ }

      const prebookId = pid || ctx?.prebookId;
      const transactionId = tid || ctx?.transactionId;
      if (!prebookId || !transactionId || !ctx?.holder?.email) {
        setState('failed');
        setDetail('Missing booking context. If you were charged, the payment reference is safe — contact support with the payment email.');
        return;
      }

      try {
        const res = await fetch('/api/book/complete', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prebookId, transactionId, holder: ctx!.holder }),
        });
        const data = await res.json();
        if (!res.ok || !data.bookingId) {
          setState('failed');
          setDetail(data.detail || 'The booking could not be finalized.');
          return;
        }
        setResult(data);
        setState('done');
        window.sessionStorage.removeItem('tc_booking_finalize');
        window.sessionStorage.removeItem('tc_pending_booking');
        try {
          const past = JSON.parse(window.localStorage.getItem('tc_bookings') || '[]');
          window.localStorage.setItem('tc_bookings', JSON.stringify([{ ...data, bookedAt: new Date().toISOString() }, ...past].slice(0, 50)));
        } catch { /* ignore */ }
      } catch {
        setState('failed');
        setDetail('Network error while finalizing. Do not retry payment — check your email or LiteAPI dashboard before booking again.');
      }
    })();
  }, [params]);

  const fmt = (d: string) => d ? new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Outfit', 'DM Sans', system-ui, sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ maxWidth: '480px', width: '100%' }}>
        {state === 'working' && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: '16px', fontWeight: 700, color: C.text, marginBottom: '6px' }}>Finalizing your booking…</div>
            <div style={{ fontSize: '13px', color: C.sub }}>Payment received — confirming the reservation with the hotel. Don&apos;t close this page.</div>
          </div>
        )}
        {state === 'done' && result && (
          <div style={{ background: C.card, border: '1px solid rgba(34,197,94,0.25)', borderRadius: '16px', padding: '28px' }}>
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <CheckCircle2 size={40} color="#22C55E" style={{ marginBottom: '8px' }} />
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: '20px', fontWeight: 700, color: C.text }}>{result.status === 'CONFIRMED' ? 'Booking confirmed' : `Booking ${result.status?.toLowerCase() || 'received'}`}</div>
              {result.sandbox && <div style={{ marginTop: '6px', fontSize: '11px', color: '#FBBF24' }}>Sandbox test booking — no real reservation or charge.</div>}
            </div>
            <div style={{ display: 'grid', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}><span style={{ color: C.sub }}>Hotel</span><span style={{ color: C.text, fontWeight: 600, textAlign: 'right' }}>{result.hotelName || '—'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.sub }}>Dates</span><span style={{ color: C.text }}>{fmt(result.checkin)} → {fmt(result.checkout)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.sub }}>Total</span><span style={{ color: C.text, fontFamily: "'JetBrains Mono'", fontWeight: 700 }}>{result.currency} {result.price?.toLocaleString()}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.sub }}>Booking ID</span><span style={{ color: C.text, fontFamily: "'JetBrains Mono'" }}>{result.bookingId}</span></div>
              {result.hotelConfirmationCode && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.sub }}>Hotel confirmation</span><span style={{ color: C.text, fontFamily: "'JetBrains Mono'" }}>{result.hotelConfirmationCode}</span></div>}
              {result.refundableTag && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.sub }}>Cancellation</span><span style={{ color: result.refundableTag === 'RFN' ? '#34D399' : '#FBBF24' }}>{result.refundableTag === 'RFN' ? `Refundable${result.lastFreeCancellationDate ? ` until ${fmt(result.lastFreeCancellationDate)}` : ''}` : 'Non-refundable'}</span></div>}
            </div>
            <button onClick={() => router.push('/')} style={{ width: '100%', marginTop: '20px', background: C.accent, color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>Done</button>
          </div>
        )}
        {state === 'failed' && (
          <div style={{ background: C.card, border: '1px solid rgba(239,68,68,0.25)', borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
            <XCircle size={40} color="#EF4444" style={{ marginBottom: '8px' }} />
            <div style={{ fontFamily: "'Space Grotesk'", fontSize: '18px', fontWeight: 700, color: C.text, marginBottom: '8px' }}>Booking not completed</div>
            <div style={{ fontSize: '13px', color: C.sub, marginBottom: '18px' }}>{detail}</div>
            <button onClick={() => router.push('/')} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 18px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>Back to search</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#06060a' }} />}>
      <ConfirmInner />
    </Suspense>
  );
}
