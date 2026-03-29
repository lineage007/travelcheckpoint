'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
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

// Airline booking URLs
const AIRLINE_BOOK_URLS: Record<string, string> = {
  'Emirates': 'https://www.emirates.com/ae/english/manage-booking/redeem-miles/',
  'Etihad': 'https://www.etihad.com/en-ae/manage/redeem-miles',
  'Qatar Airways': 'https://www.qatarairways.com/en/Privilege-Club/use-qmiles.html',
  'Turkish Airlines': 'https://www.turkishairlines.com/en-int/miles-and-smiles/',
  'Singapore Airlines': 'https://www.singaporeair.com/en_UK/ppsclub-krisflyer/use-miles/',
  'British Airways': 'https://www.britishairways.com/travel/redeem/execclub/',
  'Virgin Atlantic': 'https://www.virginatlantic.com/flying-club/spend-miles',
  'Air Canada': 'https://www.aircanada.com/aeroplan/redeem',
  'United': 'https://www.united.com/ual/en/us/flight-search/book-a-flight/results/rev',
  'American Airlines': 'https://www.aa.com/booking/find-flights',
  'Alaska': 'https://www.alaskaair.com/planbook',
  'Qantas': 'https://www.qantas.com/au/en/book-a-trip/flights/classic-flight-rewards.html',
  'Cathay Pacific': 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/redeem-flights.html',
  'Lufthansa': 'https://www.lufthansa.com/de/en/award-flights',
  'ANA': 'https://www.ana.co.jp/en/us/amc/award-reservation/',
};

const PROGRAM_NAMES: Record<string, string> = {
  'emirates': 'Emirates Skywards',
  'etihad': 'Etihad Guest',
  'turkish': 'Miles&Smiles',
  'virgin_atlantic': 'Virgin Atlantic Flying Club',
  'singapore': 'KrisFlyer',
  'aeroplan': 'Aeroplan',
  'united': 'United MileagePlus',
  'american': 'AAdvantage',
  'alaska': 'Alaska Mileage Plan',
  'qantas': 'Qantas Frequent Flyer',
  'cathay': 'Asia Miles',
  'lufthansa': 'Miles & More',
};

interface AwardResult {
  id: string;
  type: 'points';
  airline: string;
  airlineCode: string;
  route: string;
  origin: string;
  destination: string;
  date: string;
  cabin: string;
  miles: number;
  taxes: number;
  taxesCurrency: string;
  seats: number;
  isDirect: boolean;
  source: string;
  program: string;
  transferFrom: string[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getBookUrl(airline: string, origin: string, destination: string, date: string): string {
  return AIRLINE_BOOK_URLS[airline] || `https://www.google.com/travel/flights?q=${origin}+to+${destination}+${date}`;
}

function ResultCard({ r, passengers }: { r: AwardResult; passengers: number }) {
  const bookUrl = getBookUrl(r.airline, r.origin, r.destination, r.date);
  const totalMiles = r.miles * passengers;
  const totalTaxes = r.taxes * passengers;

  return (
    <div style={{
      background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: '14px',
      padding: '16px', marginBottom: '10px',
    }}>
      {/* Top badge row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {r.isDirect && (
            <span style={{ fontSize: '9px', fontWeight: 700, color: GREEN, background: `${GREEN}15`, padding: '2px 8px', borderRadius: '4px', letterSpacing: '0.04em' }}>DIRECT</span>
          )}
          <span style={{ fontSize: '9px', fontWeight: 600, color: GOLD, background: `${GOLD}10`, padding: '2px 8px', borderRadius: '4px' }}>
            {r.program}
          </span>
        </div>
        <span style={{ fontSize: '10px', color: TEXT_DIM }}>
          {r.seats} seat{r.seats !== 1 ? 's' : ''} left
        </span>
      </div>

      {/* Airline + route */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 700, color: TEXT_LIGHT }}>
            {r.airline} <span style={{ color: TEXT_DIM, fontWeight: 500, fontSize: '13px' }}>{r.airlineCode}</span>
          </div>
          <div style={{ fontSize: '13px', color: TEXT_MID, marginTop: '2px' }}>
            {r.origin} → {r.destination} · {r.isDirect ? 'Nonstop' : 'Connecting'} · {r.cabin}
          </div>
        </div>
      </div>

      {/* Date */}
      <div style={{ fontSize: '12px', color: TEXT_DIM, marginBottom: '10px' }}>
        {formatDate(r.date)}
      </div>

      {/* Pricing — per person + total */}
      <div style={{ background: `${GOLD}06`, border: `1px solid ${GOLD}15`, borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: TEXT_DIM }}>Per person</span>
          <span style={{ fontFamily: mono, fontSize: '16px', fontWeight: 700, color: GOLD }}>
            {r.miles.toLocaleString()} miles + ${r.taxes.toFixed(0)}
          </span>
        </div>
        {passengers > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: `1px solid ${GOLD}15` }}>
            <span style={{ fontSize: '12px', color: TEXT_DIM }}>Total ({passengers} pax)</span>
            <span style={{ fontFamily: mono, fontSize: '14px', fontWeight: 600, color: TEXT_LIGHT }}>
              {totalMiles.toLocaleString()} miles + ${totalTaxes.toFixed(0)}
            </span>
          </div>
        )}
      </div>

      {/* Transfer info */}
      {r.transferFrom.length > 0 && (
        <div style={{ fontSize: '11px', color: TEXT_DIM, marginBottom: '10px' }}>
          Transfer from: <span style={{ color: ACCENT }}>{r.transferFrom.join(', ')}</span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <a
          href={bookUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1, display: 'block', textAlign: 'center',
            background: ACCENT, border: 'none', borderRadius: '8px', padding: '10px',
            color: '#fff', fontSize: '13px', fontWeight: 600, textDecoration: 'none',
          }}
        >
          Book on {r.airline} →
        </a>
        <a
          href={`https://seats.aero`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${TEXT_DIM}15`, border: `1px solid ${BORDER}`, borderRadius: '8px',
            padding: '10px 14px', color: TEXT_MID, fontSize: '12px', fontWeight: 500, textDecoration: 'none',
          }}
        >
          Verify
        </a>
      </div>
    </div>
  );
}

function SearchResults() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [tab, setTab] = useState<ResultTab>('points');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<AwardResult[]>([]);
  const [meta, setMeta] = useState<{ totalAwards: number; sourcesSearched: number; timestamp: string } | null>(null);
  const [passengers, setPassengers] = useState(1);

  // Parse passenger count from query
  useEffect(() => {
    const paxMatch = q.match(/(\d+)\s*(people|pax|passengers|person|adults?|travellers?)/i);
    if (paxMatch) setPassengers(parseInt(paxMatch[1]));
    const familyMatch = q.match(/family\s*(?:of\s*)?(\d+)/i);
    if (familyMatch) setPassengers(parseInt(familyMatch[1]));
  }, [q]);

  // Parse origin/destination from query and search
  const doSearch = useCallback(async () => {
    setLoading(true);
    
    // Simple parser — extract airport codes or city names
    const upperQ = q.toUpperCase();
    
    // Try to find 3-letter airport codes
    const codeMatch = upperQ.match(/\b([A-Z]{3})\b.*?\b(?:TO|→|->)\b.*?\b([A-Z]{3})\b/);
    let origin = 'DXB';
    let destination = 'LHR';
    
    if (codeMatch) {
      origin = codeMatch[1];
      destination = codeMatch[2];
    } else {
      // City name mapping
      const cityMap: Record<string, string> = {
        'DUBAI': 'DXB', 'LONDON': 'LHR', 'SYDNEY': 'SYD', 'TOKYO': 'NRT', 'BALI': 'DPS',
        'NEW YORK': 'JFK', 'PARIS': 'CDG', 'ISTANBUL': 'IST', 'SINGAPORE': 'SIN', 'BANGKOK': 'BKK',
        'MELBOURNE': 'MEL', 'HONG KONG': 'HKG', 'KUALA LUMPUR': 'KUL', 'DOHA': 'DOH',
        'ABU DHABI': 'AUH', 'RIYADH': 'RUH', 'JEDDAH': 'JED', 'CAIRO': 'CAI',
        'MUMBAI': 'BOM', 'DELHI': 'DEL', 'COLOMBO': 'CMB', 'MALE': 'MLE', 'MALDIVES': 'MLE',
        'LOS ANGELES': 'LAX', 'SAN FRANCISCO': 'SFO', 'MIAMI': 'MIA', 'ROME': 'FCO',
        'MILAN': 'MXP', 'BARCELONA': 'BCN', 'MADRID': 'MAD', 'AMSTERDAM': 'AMS',
        'FRANKFURT': 'FRA', 'ZURICH': 'ZRH', 'ATHENS': 'ATH', 'PHUKET': 'HKT',
        'MANILA': 'MNL', 'JAKARTA': 'CGK', 'SEOUL': 'ICN', 'OSAKA': 'KIX',
        'TORONTO': 'YYZ', 'VANCOUVER': 'YVR', 'AUCKLAND': 'AKL',
      };
      
      for (const [city, code] of Object.entries(cityMap)) {
        if (upperQ.includes(city)) {
          // Determine if it's origin or destination based on position
          const idx = upperQ.indexOf(city);
          const toIdx = upperQ.search(/\bTO\b|\b→\b|\b->\b/);
          if (toIdx > -1 && idx < toIdx) origin = code;
          else if (toIdx > -1) destination = code;
          else if (!codeMatch) destination = code; // Default: if only one city mentioned, it's destination
        }
      }
    }

    // Detect cabin
    let cabin = 'business';
    if (/economy|eco\b/i.test(q)) cabin = 'economy';
    if (/first\s*class|first\b/i.test(q)) cabin = 'first';
    if (/premium\s*eco/i.test(q)) cabin = 'premium';

    try {
      const res = await fetch(`/api/search?origin=${origin}&destination=${destination}&cabin=${cabin}`);
      const data = await res.json();
      setResults(data.results?.awards || []);
      setMeta(data.meta || null);
    } catch (e) {
      console.error('Search failed:', e);
    }
    setLoading(false);
  }, [q]);

  useEffect(() => { doSearch(); }, [doSearch]);

  // Derive origin/destination for display
  const displayOrigin = results[0]?.origin || 'DXB';
  const displayDest = results[0]?.destination || '???';
  const displayCabin = results[0]?.cabin || 'Business';

  const TABS_DATA: { key: ResultTab; label: string; color: string; count: number }[] = [
    { key: 'points', label: 'Award Flights', color: GOLD, count: results.length },
    { key: 'cash', label: 'Cash Fares', color: ACCENT, count: 0 },
    { key: 'hidden', label: 'Hidden City', color: PURPLE, count: 0 },
    { key: 'empty', label: 'Empty Legs', color: GOLD, count: 0 },
  ];

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
          <div style={{ fontSize: '15px', fontWeight: 700, color: TEXT_LIGHT }}>{displayOrigin} → {displayDest}</div>
          <div style={{ fontSize: '12px', color: TEXT_DIM }}>{displayCabin} · {passengers} pax · {results.length} results</div>
        </div>
      </header>

      {/* Query interpretation */}
      <div style={{ padding: '10px 20px', background: BG_CARD, borderBottom: `1px solid ${BORDER}`, fontSize: '12px', color: TEXT_DIM }}>
        <span style={{ color: TEXT_MID }}>Search:</span> &ldquo;{q}&rdquo;
        {meta && <span style={{ marginLeft: '12px' }}>· {meta.sourcesSearched} programs searched</span>}
      </div>

      {/* Disclaimer */}
      <div style={{ padding: '8px 20px', background: `${GOLD}08`, borderBottom: `1px solid ${GOLD}15`, fontSize: '11px', color: GOLD }}>
        ⚠ Award availability is cached. Always verify on the airline website before booking.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', overflowX: 'auto', borderBottom: `1px solid ${BORDER}`, padding: '0 20px' }}>
        {TABS_DATA.map(t => (
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
      <div style={{ padding: '16px 20px', maxWidth: '700px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>✈️</div>
            <div style={{ fontSize: '14px', color: TEXT_MID, marginBottom: '8px' }}>Searching across all programs...</div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '11px', color: TEXT_DIM, flexWrap: 'wrap' }}>
              {['Emirates', 'Etihad', 'Turkish', 'Singapore', 'Aeroplan', 'United', 'Qantas'].map(a => (
                <span key={a}>{a} ⏳</span>
              ))}
            </div>
          </div>
        ) : tab === 'points' ? (
          results.length > 0 ? (
            <>
              {results.map((r) => <ResultCard key={r.id} r={r} passengers={passengers} />)}
              {meta && (
                <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '11px', color: TEXT_DIM }}>
                  Data from Seats.aero · Last updated: {timeAgo(meta.timestamp)}
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>😔</div>
              <div style={{ fontSize: '14px', color: TEXT_MID }}>No award availability found for this route.</div>
              <div style={{ fontSize: '12px', color: TEXT_DIM, marginTop: '8px' }}>Try different dates or check nearby airports.</div>
            </div>
          )
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>{tab === 'cash' ? '💰' : tab === 'hidden' ? '🔍' : '✈️'}</div>
            <div style={{ fontSize: '14px', color: TEXT_MID }}>
              {tab === 'cash' ? 'Cash fare search coming soon — wiring Google Flights API' :
               tab === 'hidden' ? 'Hidden city detection coming soon' :
               'Empty leg search coming soon'}
            </div>
          </div>
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
