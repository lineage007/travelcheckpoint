'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plane, ChevronRight, ExternalLink } from 'lucide-react';

const AIRLINE_BOOK_URLS: Record<string, string> = {
  'Emirates': 'https://www.emirates.com/ae/english/manage-booking/redeem-miles/',
  'Etihad': 'https://www.etihad.com/en-ae/manage/redeem-miles',
  'Qatar Airways': 'https://www.qatarairways.com/en/Privilege-Club/use-qmiles.html',
  'Turkish Airlines': 'https://www.turkishairlines.com/en-int/miles-and-smiles/',
  'Singapore Airlines': 'https://www.singaporeair.com/en_UK/ppsclub-krisflyer/use-miles/',
  'British Airways': 'https://www.britishairways.com/travel/redeem/execclub/',
  'Virgin Atlantic': 'https://www.virginatlantic.com/flying-club/spend-miles',
  'Air Canada': 'https://www.aircanada.com/aeroplan/redeem',
  'United': 'https://www.united.com/ual/en/us/flight-search/book-a-flight',
  'American Airlines': 'https://www.aa.com/booking/find-flights',
  'Alaska': 'https://www.alaskaair.com/planbook',
  'Qantas': 'https://www.qantas.com/au/en/book-a-trip/flights/classic-flight-rewards.html',
  'Cathay Pacific': 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/redeem-flights.html',
  'Lufthansa': 'https://www.lufthansa.com/de/en/award-flights',
  'ANA': 'https://www.ana.co.jp/en/us/amc/award-reservation/',
};

function getBookUrl(airline: string): string {
  return AIRLINE_BOOK_URLS[airline] || `https://www.google.com/search?q=${encodeURIComponent(airline + ' redeem miles')}`;
}

function cppDots(cpp: number): { filled: number; label: string } {
  if (cpp >= 5) return { filled: 5, label: 'Exceptional' };
  if (cpp >= 3) return { filled: 4, label: 'Great' };
  if (cpp >= 1.5) return { filled: 3, label: 'Good' };
  if (cpp >= 0.7) return { filled: 2, label: 'Fair' };
  return { filled: 1, label: 'Poor' };
}

interface AwardResult {
  id: string; airline: string; airlineCode: string; route: string; origin: string; destination: string;
  date: string; cabin: string; miles: number; taxes: number; taxesCurrency: string;
  seats: number; isDirect: boolean; source: string; program: string; transferFrom: string[];
}
interface CashResult {
  id: string; airline: string; flights: string; price: number; currency: string;
  route: string; departureTime: string; arrivalTime: string; duration: string;
  stops: number; date: string; cabin: string; bookingUrl: string;
}
interface ParsedQuery {
  origin: string; destination: string; originCity: string; destinationCity: string;
  departDate: string; returnDate: string; cabin: string; passengers: number;
  tripType: string; flexible: boolean; maxBudget: number | null; maxPoints: number | null;
  preferences: string[];
}

type Tab = 'best' | 'cash' | 'points' | 'hidden' | 'jets';

function AwardCard({ r, passengers, index, isBest }: { r: AwardResult; passengers: number; index: number; isBest?: boolean }) {
  const cpp = r.taxes > 0 ? (r.taxes / r.miles * 100) : 0;
  const dots = cppDots(cpp);
  const bookUrl = getBookUrl(r.airline);

  return (
    <div className={`fade-up-${Math.min(index + 1, 5)}`} style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
      borderLeft: isBest ? '3px solid var(--accent)' : '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '10px',
      transition: 'all 0.2s',
    }}>
      {/* Airline + route */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {isBest && <span style={{ color: 'var(--accent)', marginRight: '6px' }}>★</span>}
            {r.airline} <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-tertiary)' }}>{r.airlineCode}</span>
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {r.isDirect ? 'Nonstop' : '1+ stops'} · {r.cabin}
          </div>
        </div>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
          {r.seats} seat{r.seats !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Pricing */}
      <div style={{ marginBottom: '8px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {r.miles.toLocaleString()} miles
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-secondary)', marginLeft: '6px' }}>
          + ${r.taxes.toFixed(0)}
        </span>
      </div>

      {passengers > 1 && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
          Total: {(r.miles * passengers).toLocaleString()} miles + ${(r.taxes * passengers).toFixed(0)} ({passengers} pax)
        </div>
      )}

      {/* Program + transfer */}
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
        via {r.program}
      </div>
      {r.transferFrom.length > 0 && (
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
          Transfer from: <span style={{ color: 'var(--accent)' }}>{r.transferFrom.join(', ')}</span>
        </div>
      )}

      {/* Value meter + book */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>{cpp.toFixed(1)} cpp</span>
          <span style={{ display: 'flex', gap: '2px' }}>
            {[1,2,3,4,5].map(n => (
              <span key={n} style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: n <= dots.filled ? 'var(--accent)' : 'var(--border-default)',
              }} />
            ))}
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--text-tertiary)' }}>{dots.label}</span>
        </div>
        <a href={bookUrl} target="_blank" rel="noopener noreferrer" style={{
          fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
          color: '#fff', background: 'var(--accent)', borderRadius: 'var(--radius-sm)',
          padding: '8px 16px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
          transition: 'background 0.15s',
        }}>
          Book on {r.airline} <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
}

function CashCard({ f, passengers, index }: { f: CashResult; passengers: number; index: number }) {
  return (
    <div className={`fade-up-${Math.min(index + 1, 5)}`} style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '10px',
    }}>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{f.airline}</div>
      {f.flights && <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>{f.flights}</div>}
      {f.price > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {f.currency} {f.price.toLocaleString()}
          </span>
          {passengers > 1 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '8px' }}>
              × {passengers} = {f.currency} {(f.price * passengers).toLocaleString()}
            </span>
          )}
        </div>
      )}
      <a href={f.bookingUrl} target="_blank" rel="noopener noreferrer" style={{
        display: 'block', textAlign: 'center', fontFamily: 'var(--font-body)',
        fontSize: '13px', fontWeight: 600, color: '#fff', background: 'var(--accent)',
        borderRadius: 'var(--radius-sm)', padding: '10px', textDecoration: 'none',
      }}>
        {f.price > 0 ? `Book ${f.airline} →` : `Search on ${f.airline} →`}
      </a>
    </div>
  );
}

function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [tab, setTab] = useState<Tab>('points');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<AwardResult[]>([]);
  const [cashResults, setCashResults] = useState<CashResult[]>([]);
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [passengers, setPassengers] = useState(1);

  const doSearch = useCallback(async () => {
    setLoading(true);
    let origin = 'DXB', destination = 'LHR', cabin = 'business';

    try {
      const parseRes = await fetch('/api/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
      if (parseRes.ok) {
        const d = await parseRes.json();
        if (d.parsed?.origin) {
          setParsed(d.parsed);
          origin = d.parsed.origin; destination = d.parsed.destination; cabin = d.parsed.cabin || 'business';
          setPassengers(d.parsed.passengers || 1);
        }
      }
    } catch { /* fallback */ }

    try {
      const res = await fetch(`/api/search?origin=${origin}&destination=${destination}&cabin=${cabin}`);
      const data = await res.json();
      setResults(data.results?.awards || []);
      setCashResults(data.results?.cash || []);
    } catch { /* */ }
    setLoading(false);
  }, [q]);

  useEffect(() => { doSearch(); }, [doSearch]);

  const displayOrigin = parsed?.origin || results[0]?.origin || '...';
  const displayDest = parsed?.destination || results[0]?.destination || '...';

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'points', label: 'Points', count: results.length },
    { key: 'cash', label: 'Cash', count: cashResults.length },
    { key: 'hidden', label: 'Hidden City', count: 0 },
    { key: 'jets', label: 'Jets', count: 0 },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50, padding: '12px 20px',
        background: 'rgba(250,250,247,0.9)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {displayOrigin} → {displayDest}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-tertiary)' }}>
            {parsed?.cabin || 'Business'} · {passengers} pax{parsed?.departDate ? ` · ${parsed.departDate}` : ''}
          </div>
        </div>
      </header>

      {/* Parsed query bar */}
      {parsed && (
        <div className="fade-up" style={{ padding: '10px 20px', background: 'var(--accent-light)', borderBottom: '1px solid var(--border-default)', fontSize: '12px' }}>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{parsed.originCity || parsed.origin}</span>
          <span style={{ color: 'var(--text-tertiary)', margin: '0 6px' }}>→</span>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{parsed.destinationCity || parsed.destination}</span>
          {parsed.flexible && <span style={{ color: 'var(--status-success)', fontWeight: 600, marginLeft: '8px', fontSize: '10px' }}>FLEXIBLE</span>}
          {parsed.maxBudget && <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>≤ ${parsed.maxBudget.toLocaleString()}</span>}
        </div>
      )}

      {/* Availability disclaimer */}
      <div style={{ padding: '8px 20px', background: 'var(--status-warning-bg)', borderBottom: '1px solid var(--border-default)', fontSize: '11px', color: 'var(--status-warning)' }}>
        Award availability is cached. Always verify on the airline website.
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', overflowX: 'auto', borderBottom: '1px solid var(--border-default)', padding: '0 20px' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? 'var(--accent)' : 'var(--text-tertiary)', whiteSpace: 'nowrap',
            borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
            transition: 'all 0.15s',
          }}>
            {t.label} <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', opacity: 0.6 }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ padding: '16px 20px', maxWidth: '700px' }}>
        {loading ? (
          <div style={{ padding: '40px 0' }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: '120px', marginBottom: '10px', borderRadius: 'var(--radius-md)' }} />
            ))}
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <div style={{ overflow: 'hidden', height: '2px', background: 'var(--border-default)', borderRadius: '1px', maxWidth: '200px', margin: '0 auto' }}>
                <div style={{ width: '40%', height: '100%', background: 'var(--accent)', animation: 'progressBar 1.5s ease infinite' }} />
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', marginTop: '12px' }}>Searching...</div>
            </div>
          </div>
        ) : tab === 'points' ? (
          results.length > 0 ? results.map((r, i) => <AwardCard key={r.id} r={r} passengers={passengers} index={i} isBest={i === 0} />) :
          <Empty text="No award availability found for this route." />
        ) : tab === 'cash' ? (
          cashResults.length > 0 ? cashResults.map((f, i) => <CashCard key={f.id} f={f} passengers={passengers} index={i} />) :
          <Empty text="No cash fare results." />
        ) : (
          <Empty text={tab === 'hidden' ? 'Hidden city detection coming soon.' : 'Empty leg search coming soon.'} />
        )}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <Plane size={32} color="var(--border-default)" strokeWidth={1} style={{ marginBottom: '12px' }} />
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)' }}>{text}</div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
}
