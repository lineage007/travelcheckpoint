'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { monetise } from '@/lib/affiliates';

const mono = "'JetBrains Mono', monospace";
const ACCENT = '#3B82F6';
const BG_DARK = '#0A1628';
const BG_CARD = '#0F1D32';
const BG_INPUT = '#162036';
const BORDER = '#1E2D45';
const TEXT_DIM = '#64748B';
const TEXT_MID = '#94A3B8';
const TEXT_LIGHT = '#E2E8F0';
const GOLD = '#F59E0B';
const GREEN = '#10B981';
const RED = '#EF4444';

interface LiteHotel {
  id: string;
  name: string;
  stars?: number;
  address?: string;
  image?: string;
  price?: number | null;
  currency?: string;
  roomType?: string;
  board?: string;
  freeCancellation?: boolean;
}

interface PointsRoom {
  hotel: string;
  chain?: string;
  location?: string;
  pointsPerNight: number;
  cashRate?: number;
  cashCurrency?: string;
  centsPerPoint?: number;
  roomType?: string;
  availability?: boolean;
  source?: string;
}

interface HotelLinks {
  [key: string]: { url: string; name: string; color: string };
}

interface StayPayload {
  liveHotels: LiteHotel[];
  pointsRooms: PointsRoom[];
  links: HotelLinks;
  statuses: Record<string, string>;
  city: string;
  checkin: string;
  checkout: string;
  adults: number;
}

function safeDate(raw: string | null, offsetDays: number) {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Date(Date.now() + offsetDays * 86400000).toISOString().split('T')[0];
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0];
}

function normalizeDestination(raw: string | null) {
  const value = (raw || 'DPS').trim();
  if (/^[A-Za-z]{3}$/.test(value)) return value.toUpperCase();
  return value.slice(0, 80);
}

function statusCopy(status?: string) {
  switch (status) {
    case 'live-rates': return { label: 'Live hotel rates', color: GREEN };
    case 'hotel-list-only': return { label: 'Hotel directory only', color: GOLD };
    case 'live': return { label: 'Live points rooms', color: GREEN };
    case 'missing-key': return { label: 'API key missing', color: GOLD };
    case 'unsupported-destination': return { label: 'Destination unsupported', color: GOLD };
    case 'no-results': return { label: 'No live results', color: TEXT_MID };
    case 'unavailable': return { label: 'Provider unavailable', color: RED };
    default: return { label: status || 'Fallback links', color: TEXT_MID };
  }
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.24)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px' }}>
      <div style={{ color: GOLD, fontSize: '12px', fontWeight: 800, marginBottom: '4px' }}>{title}</div>
      <div style={{ color: TEXT_MID, fontSize: '12px', lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

function StatusPill({ status }: { status?: string }) {
  const copy = statusCopy(status);
  return <span style={{ color: copy.color, background: `${copy.color}18`, border: `1px solid ${copy.color}35`, padding: '5px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: 800 }}>{copy.label}</span>;
}

function HotelCard({ hotel, checkin, checkout, adults, city }: { hotel: LiteHotel; checkin: string; checkout: string; adults: number; city: string }) {
  const bookingUrl = monetise(`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotel.name || city)}&checkin=${checkin}&checkout=${checkout}&group_adults=${adults}`);
  const hasPrice = typeof hotel.price === 'number' && hotel.price > 0;
  return (
    <article style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', overflow: 'hidden' }}>
      <div style={{ height: '136px', background: `linear-gradient(135deg, ${BG_INPUT}, ${BG_CARD})`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {hotel.image ? <div aria-label="Hotel image" style={{ width: '100%', height: '100%', backgroundImage: `url(${hotel.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }} /> : <span style={{ fontSize: '34px' }}>🏨</span>}
        {!!hotel.stars && <span style={{ position: 'absolute', top: '10px', right: '10px', color: GOLD, background: 'rgba(0,0,0,0.55)', borderRadius: '6px', padding: '3px 7px', fontSize: '11px' }}>{'★'.repeat(Math.min(5, hotel.stars))}</span>}
      </div>
      <div style={{ padding: '14px 15px' }}>
        <h3 style={{ color: TEXT_LIGHT, fontSize: '15px', margin: 0, lineHeight: 1.3 }}>{hotel.name || 'Hotel'}</h3>
        <p style={{ color: TEXT_DIM, fontSize: '12px', margin: '5px 0 10px', lineHeight: 1.4 }}>{hotel.address || city}</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {hotel.roomType && <span style={{ color: TEXT_MID, background: BG_INPUT, border: `1px solid ${BORDER}`, padding: '3px 7px', borderRadius: '6px', fontSize: '10px' }}>{hotel.roomType}</span>}
          {hotel.board && <span style={{ color: TEXT_MID, background: BG_INPUT, border: `1px solid ${BORDER}`, padding: '3px 7px', borderRadius: '6px', fontSize: '10px' }}>{hotel.board}</span>}
          {hotel.freeCancellation && <span style={{ color: GREEN, background: `${GREEN}12`, border: `1px solid ${GREEN}30`, padding: '3px 7px', borderRadius: '6px', fontSize: '10px' }}>Free cancellation</span>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '12px' }}>
          <div>
            <div style={{ color: hasPrice ? TEXT_LIGHT : TEXT_MID, fontFamily: mono, fontSize: '18px', fontWeight: 800 }}>{hasPrice ? `${hotel.currency || 'USD'} ${hotel.price!.toLocaleString()}` : 'Check live'}</div>
            <div style={{ color: TEXT_DIM, fontSize: '11px' }}>{hasPrice ? 'per night · LiteAPI' : 'rate unavailable from provider'}</div>
          </div>
          <a href={bookingUrl} target="_blank" rel="noreferrer" style={{ color: '#fff', background: ACCENT, borderRadius: '8px', padding: '9px 11px', fontSize: '12px', fontWeight: 800, textDecoration: 'none', whiteSpace: 'nowrap' }}>Compare →</a>
        </div>
      </div>
    </article>
  );
}

function PointsCard({ room }: { room: PointsRoom }) {
  return (
    <article style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '14px', padding: '14px 15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h3 style={{ color: TEXT_LIGHT, fontSize: '15px', margin: 0 }}>{room.hotel || 'Points hotel'}</h3>
          <p style={{ color: TEXT_DIM, fontSize: '12px', margin: '5px 0 0' }}>{room.chain || 'Hotel program'} · {room.location || 'Destination'}</p>
        </div>
        <span style={{ color: GOLD, background: `${GOLD}14`, border: `1px solid ${GOLD}35`, padding: '5px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 800 }}>POINTS</span>
      </div>
      <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div><div style={{ color: GOLD, fontFamily: mono, fontSize: '18px', fontWeight: 800 }}>{room.pointsPerNight?.toLocaleString() || '—'} pts</div><div style={{ color: TEXT_DIM, fontSize: '11px' }}>per night</div></div>
        <div><div style={{ color: TEXT_LIGHT, fontFamily: mono, fontSize: '18px', fontWeight: 800 }}>{room.centsPerPoint ? `${room.centsPerPoint} cpp` : '—'}</div><div style={{ color: TEXT_DIM, fontSize: '11px' }}>value score</div></div>
      </div>
      {room.roomType && <div style={{ color: TEXT_MID, fontSize: '12px', marginTop: '10px' }}>{room.roomType}</div>}
    </article>
  );
}

function StaysContent() {
  const searchParams = useSearchParams();
  const destination = normalizeDestination(searchParams.get('destination'));
  const cityParam = searchParams.get('city') || destination;
  const checkin = safeDate(searchParams.get('checkin'), 7);
  const rawCheckout = safeDate(searchParams.get('checkout'), 10);
  const checkout = rawCheckout <= checkin ? addDays(checkin, 3) : rawCheckout;
  const adults = Math.max(1, Math.min(9, parseInt(searchParams.get('adults') || searchParams.get('guests') || '2', 10) || 2));
  const [payload, setPayload] = useState<StayPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      fetch(`/api/liteapi?destination=${encodeURIComponent(destination)}&checkin=${checkin}&checkout=${checkout}&adults=${adults}`).then(r => r.json()),
      fetch(`/api/rooms?destination=${encodeURIComponent(destination)}&checkin=${checkin}&checkout=${checkout}`).then(r => r.json()),
      fetch(`/api/hotels?city=${encodeURIComponent(cityParam)}&checkin=${checkin}&checkout=${checkout}&adults=${adults}`).then(r => r.json()),
    ]).then(([lite, rooms, links]) => {
      if (cancelled) return;
      const liteData = lite.status === 'fulfilled' ? lite.value : {};
      const roomsData = rooms.status === 'fulfilled' ? rooms.value : {};
      const linksData = links.status === 'fulfilled' ? links.value : {};
      setPayload({
        liveHotels: Array.isArray(liteData.results) ? liteData.results : [],
        pointsRooms: Array.isArray(roomsData.results) ? roomsData.results : [],
        links: linksData.deepLinks || {},
        statuses: { liteapi: liteData.providerStatus || 'unavailable', rooms: roomsData.providerStatus || 'unavailable' },
        city: liteData.city || linksData.city || cityParam,
        checkin: liteData.checkin || linksData.checkin || checkin,
        checkout: liteData.checkout || linksData.checkout || checkout,
        adults,
      });
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [destination, cityParam, checkin, checkout, adults]);

  const links = useMemo(() => Object.entries(payload?.links || {}), [payload]);
  const liveRateCount = (payload?.liveHotels || []).filter(h => typeof h.price === 'number' && h.price > 0).length;

  return (
    <div style={{ minHeight: '100vh', background: BG_DARK }}>
      <header style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, zIndex: 50, background: BG_DARK }}>
        <Link href="/" style={{ color: TEXT_MID, textDecoration: 'none', fontSize: '20px' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: TEXT_LIGHT }}>Stays in {payload?.city || cityParam}</div>
          <div style={{ fontSize: '12px', color: TEXT_DIM }}>{checkin} → {checkout} · {adults} guest{adults === 1 ? '' : 's'}</div>
        </div>
        <Link href={`/search?q=DXB to ${encodeURIComponent(destination)}`} style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30`, borderRadius: '8px', padding: '7px 11px', color: ACCENT, fontSize: '11px', fontWeight: 800, textDecoration: 'none' }}>Flights</Link>
      </header>

      <main style={{ padding: '16px 20px', maxWidth: '1120px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <StatusPill status={payload?.statuses.liteapi} />
          <StatusPill status={payload?.statuses.rooms} />
          <span style={{ color: TEXT_MID, background: BG_INPUT, border: `1px solid ${BORDER}`, padding: '5px 9px', borderRadius: '999px', fontSize: '11px', fontWeight: 800 }}>{links.length} fallback compare links</span>
        </div>

        {!loading && payload?.statuses.liteapi !== 'live-rates' && (
          <Notice title="Live hotel prices are not fully connected yet">
            This page no longer shows fake stays. It displays real LiteAPI hotel data when available, real rooms.aero points-room results when configured, and honest OTA deep links when live rates are missing.
          </Notice>
        )}

        {loading ? (
          <div style={{ color: TEXT_MID, padding: '40px 0', textAlign: 'center' }}>Checking live hotel and points-room providers…</div>
        ) : (
          <>
            <section style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h2 style={{ color: TEXT_LIGHT, fontSize: '18px', margin: 0 }}>Hotels {liveRateCount > 0 ? `· ${liveRateCount} live rates` : ''}</h2>
                <span style={{ color: TEXT_DIM, fontSize: '12px' }}>{payload?.liveHotels.length || 0} hotels</span>
              </div>
              {payload && payload.liveHotels.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                  {payload.liveHotels.map((hotel, index) => <HotelCard key={hotel.id || `${hotel.name}-${index}`} hotel={hotel} checkin={payload.checkin} checkout={payload.checkout} adults={payload.adults} city={payload.city} />)}
                </div>
              ) : (
                <div style={{ color: TEXT_MID, background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '16px' }}>No hotel inventory returned. Use the compare links below while provider access is missing or unavailable.</div>
              )}
            </section>

            {payload && payload.pointsRooms.length > 0 && (
              <section style={{ marginBottom: '24px' }}>
                <h2 style={{ color: TEXT_LIGHT, fontSize: '18px', margin: '0 0 10px' }}>Points rooms</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                  {payload.pointsRooms.map((room, index) => <PointsCard key={`${room.hotel}-${index}`} room={room} />)}
                </div>
              </section>
            )}

            <section>
              <h2 style={{ color: TEXT_LIGHT, fontSize: '18px', margin: '0 0 10px' }}>Compare manually</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '10px' }}>
                {links.map(([key, link]) => (
                  <a key={key} href={monetise(link.url)} target="_blank" rel="noreferrer" style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '14px', textDecoration: 'none' }}>
                    <div style={{ color: link.color || ACCENT, fontWeight: 900, fontSize: '14px' }}>{link.name}</div>
                    <div style={{ color: TEXT_DIM, fontSize: '12px', marginTop: '5px' }}>Open live search →</div>
                  </a>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default function StaysPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: BG_DARK, color: TEXT_LIGHT, padding: 24 }}>Loading stays…</div>}><StaysContent /></Suspense>;
}
