'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { ArrowLeft, Lock, Hotel } from 'lucide-react';

const C = { bg: '#06060a', card: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.06)', accent: '#8B5CF6', text: '#ffffff', sub: 'rgba(255,255,255,0.4)' };

// Set by the hotel card "Book now" button before navigating here.
interface PendingBooking {
  offerId: string; hotel: string; city: string; image?: string;
  checkin: string; checkout: string; adults: number; nights?: number;
  price?: number | null; totalPrice?: number | null; currency?: string; roomType?: string;
}

interface PrebookInfo {
  prebookId: string; transactionId: string | null; secretKey: string | null;
  price: number | null; currency: string; hotelName: string; checkin: string; checkout: string;
  roomName: string; boardName: string; refundableTag: string; sandbox: boolean; error?: string;
}

declare global {
  // Provided by the LiteAPI payment SDK script.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { LiteAPIPayment?: any }
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', padding: '12px 14px', color: C.text, fontSize: '14px',
  fontFamily: "'DM Sans', sans-serif", outline: 'none', minHeight: '44px',
};

export default function BookPage() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingBooking | null>(null);
  const [prebook, setPrebook] = useState<PrebookInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [holder, setHolder] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [sdkReady, setSdkReady] = useState(false);
  const [paymentMounted, setPaymentMounted] = useState(false);
  const paymentRef = useRef<HTMLDivElement>(null);

  // 1. Load the pending booking context and create the checkout session.
  // All state updates happen after an await so the effect body stays passive.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      let ctx: PendingBooking | null = null;
      try { ctx = JSON.parse(window.sessionStorage.getItem('tc_pending_booking') || 'null'); } catch { /* ignore */ }
      if (!ctx?.offerId) { setError('no-context'); return; }
      setPending(ctx);
      try {
        const saved = JSON.parse(window.localStorage.getItem('tc_booking_contact') || 'null');
        if (saved?.email) setHolder(saved);
      } catch { /* ignore */ }
      try {
        const res = await fetch('/api/book/prebook', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ offerId: ctx.offerId }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(data.error === 'offer-expired' ? 'offer-expired' : 'prebook-failed'); return; }
        setPrebook(data);
      } catch { if (!cancelled) setError('prebook-failed'); }
    })();
    return () => { cancelled = true; };
  }, []);

  const holderComplete = Boolean(holder.firstName.trim() && holder.lastName.trim() && /.+@.+\..+/.test(holder.email));

  // 2. User explicitly continues to payment — mounts LiteAPI's hosted element.
  const continueToPayment = () => {
    if (!prebook?.secretKey || !prebook.transactionId || !window.LiteAPIPayment || !paymentRef.current) {
      setError('payment-sdk-failed');
      return;
    }
    // The confirm page finishes the booking after the payment redirect; it needs
    // the guest details plus prebook/transaction ids.
    window.sessionStorage.setItem('tc_booking_finalize', JSON.stringify({
      prebookId: prebook.prebookId, transactionId: prebook.transactionId, holder,
      hotel: pending?.hotel, city: pending?.city, checkin: prebook.checkin || pending?.checkin, checkout: prebook.checkout || pending?.checkout,
    }));
    window.localStorage.setItem('tc_booking_contact', JSON.stringify(holder));

    const returnUrl = `${window.location.origin}/book/confirm?tid=${encodeURIComponent(prebook.transactionId)}&pid=${encodeURIComponent(prebook.prebookId)}`;
    try {
      const payment = new window.LiteAPIPayment({
        publicKey: prebook.sandbox ? 'sandbox' : 'live',
        appearance: { theme: 'flat' },
        options: { business: { name: 'TravelCheckpoint' } },
        targetElement: '#liteapi-payment',
        secretKey: prebook.secretKey,
        returnUrl,
      });
      payment.handlePayment();
      setPaymentMounted(true);
    } catch { setError('payment-sdk-failed'); }
  };

  const fmt = (d: string) => d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Outfit', 'DM Sans', system-ui, sans-serif" }}>
      <Script src="https://payment-wrapper.liteapi.travel/dist/liteAPIPayment.js?v=a1" onLoad={() => setSdkReady(true)} onError={() => setError('payment-sdk-failed')} />

      <div style={{ background: 'rgba(6,6,10,0.95)', borderBottom: `1px solid ${C.border}`, padding: '12px 16px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sub }} aria-label="Back"><ArrowLeft size={20} /></button>
          <span style={{ fontFamily: "'Space Grotesk'", fontSize: '16px', fontWeight: 700, color: C.text }}>Complete your booking</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: C.sub }}><Lock size={12} /> Secure payment</span>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '16px' }}>
        {error === 'no-context' && (
          <div style={{ background: C.card, borderRadius: '12px', padding: '32px', textAlign: 'center', marginTop: '24px' }}>
            <Hotel size={28} color={C.sub} style={{ marginBottom: '10px' }} />
            <p style={{ color: C.text, fontSize: '14px', marginBottom: '6px' }}>No booking in progress</p>
            <p style={{ color: C.sub, fontSize: '13px', marginBottom: '16px' }}>Start from a hotel search and tap “Book now” on a rate.</p>
            <button onClick={() => router.push('/')} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontWeight: 700, cursor: 'pointer' }}>New search</button>
          </div>
        )}
        {error === 'offer-expired' && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '16px', marginTop: '24px' }}>
            <div style={{ color: '#FBBF24', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>This rate expired</div>
            <div style={{ color: C.sub, fontSize: '12px', marginBottom: '12px' }}>Hotel offers are only held for a short time. Re-run the search to get a fresh price.</div>
            <button onClick={() => router.back()} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: '10px', padding: '9px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>Back to results</button>
          </div>
        )}
        {(error === 'prebook-failed' || error === 'payment-sdk-failed') && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '16px', marginTop: '24px' }}>
            <div style={{ color: '#FCA5A5', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{error === 'payment-sdk-failed' ? 'Payment form failed to load' : 'Could not start checkout'}</div>
            <div style={{ color: C.sub, fontSize: '12px' }}>Try again in a moment, or use the compare links to book externally.</div>
          </div>
        )}

        {!error && pending && (
          <>
            {/* Stay summary */}
            <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.14), rgba(6,182,212,0.08))', border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px', marginTop: '16px', marginBottom: '16px' }}>
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: '16px', fontWeight: 700, color: C.text }}>{prebook?.hotelName || pending.hotel}</div>
              <div style={{ fontSize: '12px', color: C.sub, marginTop: '4px' }}>
                {fmt(prebook?.checkin || pending.checkin)} → {fmt(prebook?.checkout || pending.checkout)} · {pending.adults} adult{pending.adults > 1 ? 's' : ''}
                {(prebook?.roomName || pending.roomType) ? ` · ${(prebook?.roomName || pending.roomType || '').toLowerCase()}` : ''}
                {prebook?.boardName ? ` · ${prebook.boardName}` : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '10px' }}>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: '22px', fontWeight: 800, color: C.text }}>
                  {prebook
                    ? `${prebook.currency} ${prebook.price?.toLocaleString()}`
                    : pending.totalPrice ? `${pending.currency || 'USD'} ${pending.totalPrice.toLocaleString()}` : ''}
                  {!prebook && <span style={{ fontSize: '12px', color: C.sub }}> confirming price…</span>}
                </span>
                <span style={{ fontSize: '11px', color: C.sub }}>total for stay</span>
                {prebook?.refundableTag === 'RFN'
                  ? <span style={{ fontSize: '11px', color: '#34D399' }}>· refundable</span>
                  : prebook?.refundableTag === 'NRFN' ? <span style={{ fontSize: '11px', color: '#FBBF24' }}>· non-refundable</span> : null}
              </div>
              {prebook?.sandbox && <div style={{ marginTop: '8px', fontSize: '11px', color: '#FBBF24', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '6px 9px', display: 'inline-block' }}>Sandbox mode — test booking, no real charge. Card 4242 4242 4242 4242 works here.</div>}
            </div>

            {/* Guest details */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '12px' }}>Guest details</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <input placeholder="First name" value={holder.firstName} onChange={e => setHolder(h => ({ ...h, firstName: e.target.value }))} style={inputStyle} autoComplete="given-name" />
                <input placeholder="Last name" value={holder.lastName} onChange={e => setHolder(h => ({ ...h, lastName: e.target.value }))} style={inputStyle} autoComplete="family-name" />
              </div>
              <input placeholder="Email (confirmation goes here)" type="email" value={holder.email} onChange={e => setHolder(h => ({ ...h, email: e.target.value }))} style={{ ...inputStyle, marginBottom: '10px' }} autoComplete="email" />
              <input placeholder="Phone (optional)" type="tel" value={holder.phone} onChange={e => setHolder(h => ({ ...h, phone: e.target.value }))} style={inputStyle} autoComplete="tel" />
            </div>

            {/* Payment */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ fontFamily: "'Space Grotesk'", fontSize: '14px', fontWeight: 700, color: C.text, marginBottom: '4px' }}>Payment</div>
              <div style={{ fontSize: '11px', color: C.sub, marginBottom: '12px' }}>Handled by LiteAPI&apos;s secure payment portal — card details never touch TravelCheckpoint.</div>
              {!prebook && <div style={{ height: '120px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', animation: 'shimmer 1.5s infinite' }} />}
              {prebook && !paymentMounted && (
                <button onClick={continueToPayment} disabled={!holderComplete || !sdkReady}
                  style={{ width: '100%', background: holderComplete && sdkReady ? C.accent : 'rgba(255,255,255,0.08)', color: holderComplete && sdkReady ? '#fff' : C.sub, border: 'none', borderRadius: '10px', padding: '13px', fontWeight: 700, cursor: holderComplete && sdkReady ? 'pointer' : 'default', fontSize: '14px', fontFamily: "'DM Sans', sans-serif" }}>
                  {holderComplete ? (sdkReady ? `Continue to payment — ${prebook.currency} ${prebook.price?.toLocaleString()}` : 'Loading payment portal…') : 'Fill in guest details to continue'}
                </button>
              )}
              <div id="liteapi-payment" ref={paymentRef} style={{ background: paymentMounted ? '#f6f6f8' : 'transparent', borderRadius: '10px', padding: paymentMounted ? '12px' : 0 }} />
            </div>
          </>
        )}
      </div>
      <style jsx global>{`@keyframes shimmer { 0% { opacity: 0.5; } 50% { opacity: 0.8; } 100% { opacity: 0.5; } }`}</style>
    </div>
  );
}
