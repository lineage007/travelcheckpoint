'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

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
const PURPLE = '#8B5CF6';

type StayTab = 'best' | 'hotels' | 'points' | 'airbnb' | 'vrbo';

const TABS: { key: StayTab; label: string; color: string; count: number }[] = [
  { key: 'best', label: 'Best Value', color: GREEN, count: 18 },
  { key: 'hotels', label: 'Hotels', color: ACCENT, count: 8 },
  { key: 'points', label: 'Points', color: GOLD, count: 5 },
  { key: 'airbnb', label: 'Airbnb', color: '#FF5A5F', count: 6 },
  { key: 'vrbo', label: 'Vrbo', color: '#2577D1', count: 4 },
];

interface StayResult {
  type: 'hotel' | 'points' | 'airbnb' | 'vrbo';
  name: string;
  location: string;
  image?: string;
  rating: number;
  reviews: number;
  pricePerNight: string;
  totalPrice: string;
  nights: number;
  guests: number;
  badge?: string;
  badgeColor?: string;
  // Hotel-specific
  stars?: number;
  chain?: string;
  cheapestVia?: string;
  otherPrices?: { vendor: string; price: string }[];
  // Points-specific
  pointsPerNight?: number;
  pointsProgram?: string;
  cashEquivalent?: string;
  cpp?: string;
  // Airbnb/Vrbo-specific
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  superhost?: boolean;
  // Value
  valueScore?: number;
}

const MOCK_STAYS: Record<StayTab, StayResult[]> = {
  best: [
    { type: 'points', name: 'Park Hyatt Bali', location: 'Nusa Dua, Bali', rating: 4.9, reviews: 2841, pricePerNight: '25,000 pts', totalPrice: '175,000 pts + $0', nights: 7, guests: 4, badge: 'BEST POINTS VALUE', badgeColor: GOLD, stars: 5, chain: 'Hyatt', pointsPerNight: 25000, pointsProgram: 'World of Hyatt', cashEquivalent: '$580/night', cpp: '2.32', valueScore: 98 },
    { type: 'airbnb', name: 'Luxury Villa with Infinity Pool', location: 'Ubud, Bali', rating: 4.97, reviews: 312, pricePerNight: '$185', totalPrice: '$1,295', nights: 7, guests: 6, badge: 'FAMILY PICK', badgeColor: GREEN, propertyType: 'Entire villa', bedrooms: 4, bathrooms: 3, amenities: ['Pool', 'Kitchen', 'WiFi', 'AC', 'Washer'], superhost: true, valueScore: 95 },
    { type: 'hotel', name: 'InterContinental Bali Resort', location: 'Jimbaran, Bali', rating: 4.7, reviews: 5420, pricePerNight: '$142', totalPrice: '$994', nights: 7, guests: 4, badge: 'CHEAPEST HOTEL', badgeColor: ACCENT, stars: 5, chain: 'IHG', cheapestVia: 'Agoda', otherPrices: [{ vendor: 'Booking.com', price: '$158' }, { vendor: 'Expedia', price: '$165' }, { vendor: 'Hotels.com', price: '$151' }], valueScore: 92 },
    { type: 'hotel', name: 'The Ritz-Carlton Bali', location: 'Nusa Dua, Bali', rating: 4.8, reviews: 3150, pricePerNight: '$320', totalPrice: '$2,240', nights: 7, guests: 4, stars: 5, chain: 'Marriott', cheapestVia: 'Marriott.com', valueScore: 78 },
  ],
  hotels: [
    { type: 'hotel', name: 'InterContinental Bali Resort', location: 'Jimbaran, Bali', rating: 4.7, reviews: 5420, pricePerNight: '$142', totalPrice: '$994', nights: 7, guests: 4, badge: 'CHEAPEST', badgeColor: GREEN, stars: 5, chain: 'IHG', cheapestVia: 'Agoda', otherPrices: [{ vendor: 'Booking.com', price: '$158' }, { vendor: 'Expedia', price: '$165' }, { vendor: 'Hotels.com', price: '$151' }, { vendor: 'IHG.com', price: '$172' }] },
    { type: 'hotel', name: 'Hilton Bali Resort', location: 'Nusa Dua, Bali', rating: 4.6, reviews: 4280, pricePerNight: '$178', totalPrice: '$1,246', nights: 7, guests: 4, stars: 5, chain: 'Hilton', cheapestVia: 'Booking.com', otherPrices: [{ vendor: 'Expedia', price: '$185' }, { vendor: 'Hilton.com', price: '$195' }] },
    { type: 'hotel', name: 'The Ritz-Carlton Bali', location: 'Nusa Dua, Bali', rating: 4.8, reviews: 3150, pricePerNight: '$320', totalPrice: '$2,240', nights: 7, guests: 4, stars: 5, chain: 'Marriott', cheapestVia: 'Marriott.com' },
    { type: 'hotel', name: 'Park Hyatt Bali', location: 'Nusa Dua, Bali', rating: 4.9, reviews: 2841, pricePerNight: '$580', totalPrice: '$4,060', nights: 7, guests: 4, stars: 5, chain: 'Hyatt', cheapestVia: 'Hyatt.com' },
    { type: 'hotel', name: 'Conrad Bali', location: 'Tanjung Benoa, Bali', rating: 4.5, reviews: 6800, pricePerNight: '$155', totalPrice: '$1,085', nights: 7, guests: 4, stars: 5, chain: 'Hilton', cheapestVia: 'Agoda' },
  ],
  points: [
    { type: 'points', name: 'Park Hyatt Bali', location: 'Nusa Dua, Bali', rating: 4.9, reviews: 2841, pricePerNight: '25,000 pts', totalPrice: '175,000 pts', nights: 7, guests: 4, badge: 'BEST VALUE', badgeColor: GOLD, stars: 5, chain: 'Hyatt', pointsPerNight: 25000, pointsProgram: 'World of Hyatt', cashEquivalent: '$580/night', cpp: '2.32' },
    { type: 'points', name: 'Conrad Bali', location: 'Tanjung Benoa, Bali', rating: 4.5, reviews: 6800, pricePerNight: '50,000 pts', totalPrice: '350,000 pts', nights: 7, guests: 4, stars: 5, chain: 'Hilton', pointsPerNight: 50000, pointsProgram: 'Hilton Honors', cashEquivalent: '$155/night', cpp: '0.31' },
    { type: 'points', name: 'InterContinental Bali Resort', location: 'Jimbaran, Bali', rating: 4.7, reviews: 5420, pricePerNight: '40,000 pts', totalPrice: '280,000 pts', nights: 7, guests: 4, stars: 5, chain: 'IHG', pointsPerNight: 40000, pointsProgram: 'IHG One Rewards', cashEquivalent: '$142/night', cpp: '0.36' },
    { type: 'points', name: 'The Ritz-Carlton Bali', location: 'Nusa Dua, Bali', rating: 4.8, reviews: 3150, pricePerNight: '70,000 pts', totalPrice: '490,000 pts', nights: 7, guests: 4, stars: 5, chain: 'Marriott', pointsPerNight: 70000, pointsProgram: 'Marriott Bonvoy', cashEquivalent: '$320/night', cpp: '0.46' },
  ],
  airbnb: [
    { type: 'airbnb', name: 'Luxury Villa with Infinity Pool', location: 'Ubud, Bali', rating: 4.97, reviews: 312, pricePerNight: '$185', totalPrice: '$1,295', nights: 7, guests: 6, badge: 'SUPERHOST', badgeColor: '#FF5A5F', propertyType: 'Entire villa', bedrooms: 4, bathrooms: 3, amenities: ['Pool', 'Kitchen', 'WiFi', 'AC', 'Washer', 'Free parking'], superhost: true },
    { type: 'airbnb', name: 'Beachfront Family Compound', location: 'Seminyak, Bali', rating: 4.92, reviews: 178, pricePerNight: '$240', totalPrice: '$1,680', nights: 7, guests: 8, propertyType: 'Entire villa', bedrooms: 5, bathrooms: 4, amenities: ['Pool', 'Kitchen', 'Beach access', 'WiFi', 'AC'], superhost: true },
    { type: 'airbnb', name: 'Modern Rice Terrace House', location: 'Ubud, Bali', rating: 4.88, reviews: 245, pricePerNight: '$95', totalPrice: '$665', nights: 7, guests: 4, badge: 'BUDGET PICK', badgeColor: GREEN, propertyType: 'Entire home', bedrooms: 3, bathrooms: 2, amenities: ['Pool', 'Kitchen', 'WiFi', 'Garden'] },
    { type: 'airbnb', name: 'Clifftop Ocean View Villa', location: 'Uluwatu, Bali', rating: 4.95, reviews: 89, pricePerNight: '$320', totalPrice: '$2,240', nights: 7, guests: 6, propertyType: 'Entire villa', bedrooms: 4, bathrooms: 4, amenities: ['Infinity pool', 'Kitchen', 'Ocean view', 'Private chef available'], superhost: true },
  ],
  vrbo: [
    { type: 'vrbo', name: 'Tropical Family Estate', location: 'Canggu, Bali', rating: 4.8, reviews: 92, pricePerNight: '$210', totalPrice: '$1,470', nights: 7, guests: 8, propertyType: 'Entire villa', bedrooms: 5, bathrooms: 4, amenities: ['Pool', 'Kitchen', 'WiFi', 'Gym', 'Garden'] },
    { type: 'vrbo', name: 'Beachside 3BR Apartment', location: 'Sanur, Bali', rating: 4.6, reviews: 145, pricePerNight: '$120', totalPrice: '$840', nights: 7, guests: 6, propertyType: 'Entire apartment', bedrooms: 3, bathrooms: 2, amenities: ['Pool', 'Kitchen', 'Beach access', 'WiFi'] },
    { type: 'vrbo', name: 'Luxury Jungle Retreat', location: 'Ubud, Bali', rating: 4.9, reviews: 67, pricePerNight: '$280', totalPrice: '$1,960', nights: 7, guests: 6, propertyType: 'Entire villa', bedrooms: 4, bathrooms: 3, amenities: ['Infinity pool', 'Kitchen', 'Spa', 'WiFi', 'Yoga deck'] },
  ],
};

function StayCard({ stay }: { stay: StayResult }) {
  return (
    <div style={{
      background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '14px',
      overflow: 'hidden', marginBottom: '12px', cursor: 'pointer',
      transition: 'border-color 0.15s',
    }}>
      {/* Image placeholder */}
      <div style={{ height: '140px', background: `linear-gradient(135deg, ${BG_INPUT}, ${BG_CARD})`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '32px' }}>{stay.type === 'airbnb' ? '🏡' : stay.type === 'vrbo' ? '🏠' : '🏨'}</span>
        {stay.badge && (
          <span style={{
            position: 'absolute', top: '10px', left: '10px',
            fontSize: '9px', fontWeight: 700, color: '#fff', background: stay.badgeColor,
            padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.04em',
          }}>{stay.badge}</span>
        )}
        {stay.stars && (
          <span style={{
            position: 'absolute', top: '10px', right: '10px',
            fontSize: '11px', color: GOLD, background: 'rgba(0,0,0,0.5)',
            padding: '2px 8px', borderRadius: '4px',
          }}>{'★'.repeat(stay.stars)}</span>
        )}
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Name + rating */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: TEXT_LIGHT }}>{stay.name}</div>
            <div style={{ fontSize: '12px', color: TEXT_DIM, marginTop: '2px' }}>{stay.location}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '12px', color: TEXT_MID }}>
              ★ {stay.rating} <span style={{ color: TEXT_DIM }}>({stay.reviews.toLocaleString()})</span>
            </div>
          </div>
        </div>

        {/* Property details for rentals */}
        {stay.bedrooms && (
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: TEXT_DIM, marginTop: '6px', marginBottom: '8px' }}>
            <span>{stay.bedrooms} bed</span>
            <span>{stay.bathrooms} bath</span>
            <span>Up to {stay.guests} guests</span>
            {stay.superhost && <span style={{ color: '#FF5A5F', fontWeight: 600 }}>★ Superhost</span>}
          </div>
        )}

        {/* Amenities */}
        {stay.amenities && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {stay.amenities.slice(0, 4).map(a => (
              <span key={a} style={{ fontSize: '10px', color: TEXT_DIM, background: BG_INPUT, padding: '2px 8px', borderRadius: '4px', border: `1px solid ${BORDER}` }}>{a}</span>
            ))}
          </div>
        )}

        {/* Chain + cheapest via */}
        {stay.chain && (
          <div style={{ fontSize: '11px', color: TEXT_DIM, marginBottom: '8px' }}>
            {stay.chain} {stay.cheapestVia && <span>· Cheapest via <span style={{ color: GREEN, fontWeight: 600 }}>{stay.cheapestVia}</span></span>}
          </div>
        )}

        {/* Other prices */}
        {stay.otherPrices && stay.otherPrices.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', fontSize: '10px' }}>
            {stay.otherPrices.map(op => (
              <span key={op.vendor} style={{ color: TEXT_DIM, background: BG_INPUT, padding: '2px 8px', borderRadius: '4px', border: `1px solid ${BORDER}` }}>
                {op.vendor}: <span style={{ color: TEXT_MID }}>{op.price}</span>
              </span>
            ))}
          </div>
        )}

        {/* Points info */}
        {stay.pointsProgram && (
          <div style={{ marginBottom: '10px', padding: '8px 10px', background: `${GOLD}08`, border: `1px solid ${GOLD}20`, borderRadius: '8px', fontSize: '11px' }}>
            <span style={{ color: GOLD, fontWeight: 600 }}>{stay.pointsProgram}</span>
            <span style={{ color: TEXT_DIM, marginLeft: '8px' }}>Cash: {stay.cashEquivalent}</span>
            {stay.cpp && <span style={{ color: parseFloat(stay.cpp) >= 1.5 ? GREEN : RED, marginLeft: '8px', fontWeight: 600 }}>{stay.cpp}¢/pt</span>}
          </div>
        )}

        {/* Price row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '8px' }}>
          <div>
            <span style={{ fontFamily: mono, fontSize: '20px', fontWeight: 700, color: stay.type === 'points' ? GOLD : TEXT_LIGHT }}>
              {stay.pricePerNight}
            </span>
            <span style={{ fontSize: '12px', color: TEXT_DIM, marginLeft: '4px' }}>/night</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: mono, fontSize: '14px', fontWeight: 600, color: TEXT_MID }}>{stay.totalPrice} total</div>
            <div style={{ fontSize: '11px', color: TEXT_DIM }}>{stay.nights} nights · {stay.guests} guests</div>
          </div>
        </div>

        {/* Book CTA */}
        <button style={{
          width: '100%', marginTop: '12px',
          background: stay.type === 'points' ? GOLD : stay.type === 'airbnb' ? '#FF5A5F' : stay.type === 'vrbo' ? '#2577D1' : ACCENT,
          border: 'none', borderRadius: '8px', padding: '10px',
          color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
        }}>
          {stay.type === 'points' ? `Book with ${stay.pointsProgram}` : stay.cheapestVia ? `Book via ${stay.cheapestVia} →` : `View on ${stay.type === 'airbnb' ? 'Airbnb' : stay.type === 'vrbo' ? 'Vrbo' : 'site'} →`}
        </button>
      </div>
    </div>
  );
}

function StaysContent() {
  const searchParams = useSearchParams();
  const destination = searchParams.get('destination') || 'Bali';
  const [tab, setTab] = useState<StayTab>('best');
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => setLoading(false), 1200); }, []);

  const results = MOCK_STAYS[tab] || [];

  return (
    <div style={{ minHeight: '100vh', background: BG_DARK }}>
      {/* Header */}
      <header style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, zIndex: 50, background: BG_DARK,
      }}>
        <Link href="/" style={{ color: TEXT_MID, textDecoration: 'none', fontSize: '20px' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: TEXT_LIGHT }}>Stays in {destination}</div>
          <div style={{ fontSize: '12px', color: TEXT_DIM }}>7 nights · 4 guests · Apr 5–12</div>
        </div>
        <button style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30`, borderRadius: '8px', padding: '6px 12px', color: ACCENT, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
          Filters
        </button>
      </header>

      {/* Trip summary bar */}
      <div style={{ padding: '10px 20px', background: BG_CARD, borderBottom: `1px solid ${BORDER}`, fontSize: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: TEXT_DIM }}>✈️ DXB → DPS: <span style={{ color: GREEN, fontWeight: 600 }}>$1,847 return</span> or <span style={{ color: GOLD, fontWeight: 600 }}>62,500 miles</span></span>
          <Link href="/search?q=DXB+to+Bali" style={{ color: ACCENT, fontSize: '11px', textDecoration: 'none' }}>View flights →</Link>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', overflowX: 'auto', borderBottom: `1px solid ${BORDER}`, padding: '0 20px' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: tab === t.key ? 700 : 500, whiteSpace: 'nowrap',
            color: tab === t.key ? t.color : TEXT_DIM,
            borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
          }}>
            {t.label} <span style={{ fontSize: '11px', opacity: 0.6 }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ padding: '16px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🏨</div>
            <div style={{ fontSize: '14px', color: TEXT_MID }}>Searching hotels, points, and rentals...</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '11px', color: TEXT_DIM, marginTop: '8px' }}>
              <span>Makcorps ✓</span>
              <span>rooms.aero ⏳</span>
              <span>Airbnb ⏳</span>
            </div>
          </div>
        ) : (
          results.map((stay, i) => <StayCard key={i} stay={stay} />)
        )}
      </div>
    </div>
  );
}

export default function StaysPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: BG_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', color: TEXT_DIM }}>Loading...</div>}>
      <StaysContent />
    </Suspense>
  );
}
