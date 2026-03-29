'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const mono = "'JetBrains Mono', monospace";
const ACCENT = '#3B82F6';
const BG_DARK = '#0A1628';
const BG_CARD = '#0F1D32';
const BORDER = '#1E2D45';
const TEXT_DIM = '#64748B';
const TEXT_MID = '#94A3B8';
const TEXT_LIGHT = '#E2E8F0';
const GOLD = '#F59E0B';
const GREEN = '#10B981';
const RED = '#EF4444';
const PURPLE = '#8B5CF6';

type ResultTab = 'best' | 'cash' | 'points' | 'hidden' | 'empty';

const TABS: { key: ResultTab; label: string; color: string; count: number }[] = [
  { key: 'best', label: 'Best Value', color: GREEN, count: 24 },
  { key: 'cash', label: 'Cash', color: ACCENT, count: 12 },
  { key: 'points', label: 'Points', color: GOLD, count: 6 },
  { key: 'hidden', label: 'Hidden City', color: PURPLE, count: 3 },
  { key: 'empty', label: 'Empty Leg', color: GOLD, count: 2 },
];

const MOCK_RESULTS: Record<ResultTab, Array<{
  type: string; airline: string; flight: string; price: string; priceSub?: string;
  route: string; duration: string; stops: string; date: string; time: string;
  badge?: string; badgeColor?: string; value?: string; warning?: string; broker?: string;
  transferFrom?: string; cpp?: string; aircraft?: string; pax?: number;
}>> = {
  best: [
    { type: 'points', airline: 'Emirates', flight: 'EK29', price: '62,500 miles + $43', priceSub: 'via Emirates Skywards', route: 'DXB → LHR', duration: '7h 30m', stops: 'Nonstop', date: 'Apr 3', time: '08:15 → 13:45', badge: 'BEST VALUE', badgeColor: GREEN, transferFrom: 'Amex MR', cpp: '4.8' },
    { type: 'cash', airline: 'Turkish Airlines', flight: 'TK764 + TK1987', price: '$1,847', route: 'DXB → IST → LHR', duration: '14h 20m', stops: '1 stop', date: 'Apr 5', time: '02:30 → 16:50', badge: 'CHEAPEST', badgeColor: ACCENT },
    { type: 'points', airline: 'Etihad', flight: 'EY19', price: '50,000 miles + $89', priceSub: 'via Etihad Guest', route: 'AUH → LHR', duration: '7h 45m', stops: 'Nonstop', date: 'Apr 4', time: '09:20 → 14:05', transferFrom: 'Amex MR / Citi TY', cpp: '4.2' },
    { type: 'cash', airline: 'Emirates', flight: 'EK3', price: '$2,890', route: 'DXB → LHR', duration: '7h 10m', stops: 'Nonstop', date: 'Apr 3', time: '14:35 → 19:45', badge: 'DIRECT', badgeColor: ACCENT },
  ],
  cash: [
    { type: 'cash', airline: 'Turkish Airlines', flight: 'TK764 + TK1987', price: '$1,847', route: 'DXB → IST → LHR', duration: '14h 20m', stops: '1 stop', date: 'Apr 5', time: '02:30 → 16:50', badge: 'CHEAPEST', badgeColor: GREEN },
    { type: 'cash', airline: 'Gulf Air', flight: 'GF002 + GF003', price: '$1,920', route: 'DXB → BAH → LHR', duration: '12h 45m', stops: '1 stop', date: 'Apr 4', time: '06:00 → 18:45' },
    { type: 'cash', airline: 'Qatar Airways', flight: 'QR1078 + QR3', price: '$2,150', route: 'DXB → DOH → LHR', duration: '11h 30m', stops: '1 stop', date: 'Apr 3', time: '08:30 → 20:00' },
    { type: 'cash', airline: 'Emirates', flight: 'EK3', price: '$2,890', route: 'DXB → LHR', duration: '7h 10m', stops: 'Nonstop', date: 'Apr 3', time: '14:35 → 19:45' },
    { type: 'cash', airline: 'Emirates', flight: 'EK29', price: '$3,240', route: 'DXB → LHR', duration: '7h 30m', stops: 'Nonstop', date: 'Apr 3', time: '08:15 → 13:45' },
    { type: 'cash', airline: 'British Airways', flight: 'BA108', price: '$3,410', route: 'DXB → LHR', duration: '7h 20m', stops: 'Nonstop', date: 'Apr 4', time: '09:50 → 14:10' },
  ],
  points: [
    { type: 'points', airline: 'Etihad', flight: 'EY19', price: '50,000 miles + $89', priceSub: 'via Etihad Guest', route: 'AUH → LHR', duration: '7h 45m', stops: 'Nonstop', date: 'Apr 4', time: '09:20 → 14:05', badge: 'BEST POINTS DEAL', badgeColor: GOLD, transferFrom: 'Amex MR / Citi TY', cpp: '4.2' },
    { type: 'points', airline: 'Emirates', flight: 'EK29', price: '62,500 miles + $43', priceSub: 'via Emirates Skywards', route: 'DXB → LHR', duration: '7h 30m', stops: 'Nonstop', date: 'Apr 3', time: '08:15 → 13:45', transferFrom: 'Amex MR', cpp: '4.8' },
    { type: 'points', airline: 'Turkish Airlines', flight: 'TK764', price: '45,000 miles + $120', priceSub: 'via Miles&Smiles', route: 'DXB → IST → LHR', duration: '14h 20m', stops: '1 stop', date: 'Apr 5', time: '02:30 → 16:50', transferFrom: 'Citi TY', cpp: '3.8' },
    { type: 'points', airline: 'Aeroplan', flight: 'AC856 (EK codeshare)', price: '70,000 pts + $65', priceSub: 'via Aeroplan', route: 'DXB → LHR', duration: '7h 10m', stops: 'Nonstop', date: 'Apr 3', time: '14:35 → 19:45', transferFrom: 'Amex MR', cpp: '3.9' },
  ],
  hidden: [
    { type: 'hidden', airline: 'British Airways', flight: 'BA117', price: '$1,412', priceSub: 'Save $435 vs direct', route: 'DXB → LHR → JFK', duration: '7h 20m to LHR', stops: 'Exit at LHR', date: 'Apr 4', time: '09:50 → 14:10', badge: 'HIDDEN CITY', badgeColor: PURPLE, warning: '⚠ Carry-on only. No checked bags. Do not book round-trip.' },
    { type: 'hidden', airline: 'Emirates', flight: 'EK1 + EK201', price: '$2,180', priceSub: 'Save $710 vs direct business', route: 'DXB → LHR → MAN', duration: '7h 30m to LHR', stops: 'Exit at LHR', date: 'Apr 3', time: '08:15 → 13:45', badge: 'HIDDEN CITY', badgeColor: PURPLE, warning: '⚠ Business class. Carry-on only. Risky for frequent flyers — airline may flag.' },
  ],
  empty: [
    { type: 'empty', airline: '', flight: '', price: '$4,200', priceSub: 'Up to 8 passengers', route: 'DXB → LTN', duration: '7h 15m', stops: 'Nonstop', date: 'Apr 2', time: 'Departs 11:00', badge: 'EMPTY LEG', badgeColor: GOLD, broker: 'LunaJets', aircraft: 'Citation X', pax: 8 },
    { type: 'empty', airline: '', flight: '', price: '$5,800', priceSub: 'Up to 12 passengers', route: 'DXB → LHR', duration: '7h 30m', stops: 'Nonstop', date: 'Apr 5', time: 'Departs 09:00', badge: 'EMPTY LEG', badgeColor: GOLD, broker: 'PrivateFly', aircraft: 'Challenger 350', pax: 12 },
  ],
};

function ResultCard({ r }: { r: typeof MOCK_RESULTS['best'][0] }) {
  return (
    <div style={{
      background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '14px',
      padding: '16px', marginBottom: '10px', transition: 'border-color 0.15s',
      cursor: 'pointer',
    }}>
      {/* Badge */}
      {r.badge && (
        <div style={{
          fontSize: '10px', fontWeight: 700, color: r.badgeColor, letterSpacing: '0.06em',
          marginBottom: '8px', textTransform: 'uppercase',
        }}>{r.badge}</div>
      )}

      {/* Main row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: TEXT_LIGHT }}>
            {r.aircraft ? r.aircraft : r.airline} {r.flight && <span style={{ color: TEXT_DIM, fontWeight: 500 }}>{r.flight}</span>}
          </div>
          <div style={{ fontSize: '13px', color: TEXT_MID, marginTop: '2px' }}>
            {r.route} · {r.stops}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: mono, fontSize: '18px', fontWeight: 700, color: r.type === 'points' ? GOLD : r.type === 'hidden' ? PURPLE : TEXT_LIGHT }}>
            {r.price}
          </div>
          {r.priceSub && <div style={{ fontSize: '11px', color: TEXT_DIM }}>{r.priceSub}</div>}
        </div>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: TEXT_DIM }}>
        <span>{r.date}</span>
        <span>{r.time}</span>
        <span>{r.duration}</span>
      </div>

      {/* Transfer info for points */}
      {r.transferFrom && (
        <div style={{ marginTop: '8px', padding: '8px 10px', background: `${GOLD}08`, border: `1px solid ${GOLD}20`, borderRadius: '8px', fontSize: '11px' }}>
          <span style={{ color: GOLD, fontWeight: 600 }}>Transfer from: {r.transferFrom}</span>
          {r.cpp && <span style={{ color: TEXT_DIM, marginLeft: '8px' }}>· {r.cpp} cpp value</span>}
        </div>
      )}

      {/* Warning for hidden city */}
      {r.warning && (
        <div style={{ marginTop: '8px', padding: '8px 10px', background: `${RED}08`, border: `1px solid ${RED}20`, borderRadius: '8px', fontSize: '11px', color: RED }}>
          {r.warning}
        </div>
      )}

      {/* Broker for empty legs */}
      {r.broker && (
        <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: GOLD }}>via {r.broker}</span>
          {r.pax && <span style={{ fontSize: '11px', color: TEXT_DIM }}>${Math.round(parseInt(r.price.replace(/[$,]/g, '')) / r.pax)}/person if split</span>}
        </div>
      )}

      {/* Book CTA */}
      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
        <button style={{
          background: r.type === 'empty' ? GOLD : ACCENT, border: 'none', borderRadius: '8px',
          padding: '8px 16px', color: r.type === 'empty' ? '#000' : '#fff',
          fontSize: '12px', fontWeight: 600, cursor: 'pointer',
        }}>
          {r.type === 'empty' ? 'Inquire →' : r.type === 'hidden' ? 'Details →' : 'Book →'}
        </button>
      </div>
    </div>
  );
}

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [tab, setTab] = useState<ResultTab>('best');
  const [loading, setLoading] = useState(true);

  useEffect(() => { setTimeout(() => setLoading(false), 1500); }, []);

  const results = MOCK_RESULTS[tab] || [];

  return (
    <div style={{ minHeight: '100vh', background: BG_DARK }}>
      {/* Header */}
      <header style={{
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: `1px solid ${BORDER}`, background: BG_DARK,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <Link href="/" style={{ color: TEXT_MID, textDecoration: 'none', fontSize: '20px' }}>←</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: TEXT_LIGHT }}>DXB → LHR</div>
          <div style={{ fontSize: '12px', color: TEXT_DIM }}>Business · Apr 2–5 · {TABS.reduce((s, t) => s + t.count, 0)} results</div>
        </div>
        <button style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30`, borderRadius: '8px', padding: '6px 12px', color: ACCENT, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
          🔔 Alert
        </button>
      </header>

      {/* Parsed query confirmation */}
      <div style={{ padding: '12px 20px', background: BG_CARD, borderBottom: `1px solid ${BORDER}`, fontSize: '12px', color: TEXT_DIM }}>
        <span style={{ color: TEXT_MID }}>Understood:</span> "{q}" → <span style={{ color: ACCENT }}>DXB</span> to <span style={{ color: ACCENT }}>LHR</span>, <span style={{ color: GOLD }}>Business Class</span>, next week, under $3,000 or 80K points
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', overflowX: 'auto', borderBottom: `1px solid ${BORDER}`, padding: '0 20px' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '13px', fontWeight: tab === t.key ? 700 : 500, whiteSpace: 'nowrap',
            color: tab === t.key ? t.color : TEXT_DIM,
            borderBottom: tab === t.key ? `2px solid ${t.color}` : '2px solid transparent',
            transition: 'all 0.15s',
          }}>
            {t.label} <span style={{ fontSize: '11px', opacity: 0.6 }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ padding: '16px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>✈️</div>
            <div style={{ fontSize: '14px', color: TEXT_MID, marginBottom: '8px' }}>Searching across all sources...</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '11px', color: TEXT_DIM }}>
              <span>Google Flights ✓</span>
              <span>Seats.aero ⏳</span>
              <span>Empty Legs ⏳</span>
            </div>
          </div>
        ) : (
          results.map((r, i) => <ResultCard key={i} r={r} />)
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0A1628', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
}
