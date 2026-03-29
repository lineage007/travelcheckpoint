'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

const bg = "'Inter', system-ui, sans-serif";
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

const EXAMPLE_SEARCHES = [
  "Dubai to London next week, business, under $3k or 80k points",
  "DXB to Sydney, anytime in June, cheapest business class",
  "Get me to Bali from Dubai, points or cash, whatever is cheapest",
  "London to New York, hidden city options, next Friday",
  "Any empty legs from Dubai this weekend",
  "What's the best way to use 100k Amex points to get to Tokyo",
  "Family of 6, Dubai to Istanbul, April school holidays, economy",
];

const RECENT_SEARCHES = [
  { route: 'DXB → LHR', date: 'Mar 25', cabin: 'Business', status: 'tracked' },
  { route: 'DXB → SYD', date: 'Mar 22', cabin: 'Business', status: 'new results' },
  { route: 'DXB → IST', date: 'Mar 20', cabin: 'Economy', status: '' },
];

const ALERTS = [
  { route: 'DXB → LHR', change: -12, direction: 'down', price: '$2,140' },
  { route: 'DXB → SYD', change: 0, direction: 'stable', price: '$3,870' },
  { route: 'DXB → CDG', change: 8, direction: 'up', price: '$1,920' },
];

const EMPTY_LEGS = [
  { aircraft: 'Citation XLS', route: 'DXB → LTN', price: '$4,200', pax: 8, date: 'Today 11:00', broker: 'LunaJets' },
  { aircraft: 'Challenger 350', route: 'DXB → MXP', price: '$6,800', pax: 10, date: 'Tomorrow 14:30', broker: 'PrivateFly' },
  { aircraft: 'Phenom 300E', route: 'SHJ → BAH', price: '$2,100', pax: 6, date: 'Apr 1 09:00', broker: 'Victor' },
];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [placeholder, setPlaceholder] = useState(EXAMPLE_SEARCHES[0]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const placeholderIdx = useRef(0);

  // Rotate placeholder examples
  useEffect(() => {
    const interval = setInterval(() => {
      placeholderIdx.current = (placeholderIdx.current + 1) % EXAMPLE_SEARCHES.length;
      setPlaceholder(EXAMPLE_SEARCHES[placeholderIdx.current]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    // Navigate to results page with query
    window.location.href = `/search?q=${encodeURIComponent(query.trim())}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: BG_DARK }}>
      {/* Header */}
      <header style={{
        padding: '16px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `linear-gradient(135deg, ${ACCENT}, #1D4ED8)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          </div>
          <span style={{ fontFamily: bg, fontSize: '18px', fontWeight: 700, color: TEXT_LIGHT, letterSpacing: '-0.02em' }}>
            Travel<span style={{ color: ACCENT }}>Checkpoint</span>
          </span>
        </div>
        <button style={{ background: 'none', border: 'none', color: TEXT_MID, cursor: 'pointer', fontSize: '20px', padding: '4px' }}>
          ☰
        </button>
      </header>

      <div style={{ padding: '24px 20px', maxWidth: '600px', margin: '0 auto' }}>

        {/* Hero search */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: TEXT_LIGHT, lineHeight: 1.15, marginBottom: '8px', letterSpacing: '-0.03em' }}>
            Where to?
          </h1>
          <p style={{ fontSize: '14px', color: TEXT_DIM, marginBottom: '20px' }}>
            Search cash fares, award points, hidden city routes, and private jet empty legs — all at once.
          </p>

          {/* Natural language input */}
          <div style={{
            background: BG_INPUT, border: `1px solid ${BORDER}`, borderRadius: '16px',
            padding: '16px', transition: 'border-color 0.2s',
          }}>
            <textarea
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              rows={3}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSearch(); } }}
              style={{
                width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                fontFamily: bg, fontSize: '16px', color: TEXT_LIGHT, lineHeight: 1.5,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30`, borderRadius: '8px', padding: '6px 10px', color: ACCENT, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  🎤 Voice
                </button>
                <button style={{ background: `${GOLD}15`, border: `1px solid ${GOLD}30`, borderRadius: '8px', padding: '6px 10px', color: GOLD, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  ✨ Points
                </button>
              </div>
              <button
                onClick={handleSearch}
                disabled={!query.trim() || searching}
                style={{
                  background: query.trim() ? ACCENT : `${ACCENT}40`,
                  border: 'none', borderRadius: '10px', padding: '10px 24px',
                  color: '#fff', fontSize: '14px', fontWeight: 700, cursor: query.trim() ? 'pointer' : 'default',
                  transition: 'all 0.2s',
                }}
              >
                {searching ? '⏳ Searching...' : 'Search →'}
              </button>
            </div>
          </div>
        </div>

        {/* Mode tabs: Flights vs Stays */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <Link href="/" style={{ background: ACCENT, border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ✈️ Flights
          </Link>
          <Link href="/stays?destination=Bali" style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 500, color: TEXT_MID, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🏨 Stays
          </Link>
          <Link href="/" style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 500, color: TEXT_MID, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📦 Packages
          </Link>
        </div>

        {/* Quick filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
          {['Cash Fares', 'Award Flights', 'Hidden City', 'Empty Legs', 'Multi-City'].map(f => (
            <button key={f} style={{
              background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '999px',
              padding: '8px 14px', fontSize: '12px', fontWeight: 500, color: TEXT_MID,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {f}
            </button>
          ))}
        </div>

        {/* Recent searches */}
        <section style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: TEXT_LIGHT }}>Recent Searches</h2>
            <span style={{ fontSize: '12px', color: ACCENT, cursor: 'pointer' }}>See all</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {RECENT_SEARCHES.map((s, i) => (
              <Link key={i} href={`/search?q=${encodeURIComponent(s.route.replace(' → ', ' to '))}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '12px',
                padding: '14px 16px', textDecoration: 'none', transition: 'border-color 0.15s',
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: TEXT_LIGHT }}>{s.route}</div>
                  <div style={{ fontSize: '12px', color: TEXT_DIM, marginTop: '2px' }}>{s.date} · {s.cabin}</div>
                </div>
                {s.status && (
                  <span style={{
                    fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px',
                    background: s.status === 'new results' ? `${GREEN}15` : `${ACCENT}15`,
                    color: s.status === 'new results' ? GREEN : ACCENT,
                  }}>{s.status}</span>
                )}
              </Link>
            ))}
          </div>
        </section>

        {/* Price alerts */}
        <section style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: TEXT_LIGHT }}>Price Alerts</h2>
            <span style={{ fontSize: '12px', color: TEXT_DIM }}>{ALERTS.length} active</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ALERTS.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '12px',
                padding: '14px 16px',
              }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: TEXT_LIGHT }}>{a.route}</div>
                  <div style={{ fontSize: '12px', color: TEXT_DIM, marginTop: '2px' }}>Currently {a.price}</div>
                </div>
                <span style={{
                  fontFamily: mono, fontSize: '13px', fontWeight: 600,
                  color: a.change < 0 ? GREEN : a.change > 0 ? RED : TEXT_DIM,
                }}>
                  {a.change < 0 ? `↓ ${Math.abs(a.change)}%` : a.change > 0 ? `↑ ${a.change}%` : '— stable'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Empty legs */}
        <section style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: TEXT_LIGHT }}>
              ✈️ Empty Legs Near Dubai
            </h2>
            <span style={{ fontSize: '12px', color: GOLD }}>{EMPTY_LEGS.length} available</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
            {EMPTY_LEGS.map((e, i) => (
              <div key={i} style={{
                minWidth: '220px', background: `linear-gradient(135deg, ${BG_CARD}, #0D1A2E)`,
                border: `1px solid ${GOLD}25`, borderRadius: '14px', padding: '16px', flexShrink: 0,
              }}>
                <div style={{ fontSize: '11px', color: GOLD, fontWeight: 600, marginBottom: '8px' }}>{e.broker}</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: TEXT_LIGHT, marginBottom: '4px' }}>{e.route}</div>
                <div style={{ fontSize: '12px', color: TEXT_DIM, marginBottom: '8px' }}>{e.aircraft} · Up to {e.pax} pax</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: mono, fontSize: '18px', fontWeight: 700, color: GOLD }}>{e.price}</span>
                  <span style={{ fontSize: '11px', color: TEXT_DIM }}>{e.date}</span>
                </div>
                <div style={{ fontSize: '10px', color: TEXT_DIM, marginTop: '6px' }}>
                  {e.price.replace('$', '').replace(',', '') && `$${Math.round(parseInt(e.price.replace(/[$,]/g, '')) / e.pax)}/person if split`}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom nav hint */}
        <div style={{ textAlign: 'center', padding: '20px 0', borderTop: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: '12px', color: TEXT_DIM }}>
            Powered by Google Flights, Seats.aero, and private charter networks
          </p>
        </div>
      </div>
    </div>
  );
}
