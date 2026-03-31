'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plane, ExternalLink, Search, ArrowRight } from 'lucide-react';

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
  'Qantas': 'https://www.qantas.com/au/en/book-a-trip/flights/classic-flight-rewards.html',
  'Cathay Pacific': 'https://www.cathaypacific.com/cx/en_HK/book-a-trip/redeem-flights.html',
  'Lufthansa': 'https://www.lufthansa.com/de/en/award-flights',
  'ANA': 'https://www.ana.co.jp/en/us/amc/award-reservation/',
};

function getBookUrl(airline: string): string {
  return AIRLINE_BOOK_URLS[airline] || `https://www.google.com/search?q=${encodeURIComponent(airline + ' redeem miles')}`;
}

// IATA code map for airline logo CDN
const AIRLINE_IATA: Record<string, string> = {
  'Emirates': 'EK', 'Etihad': 'EY', 'Qatar Airways': 'QR', 'Turkish Airlines': 'TK',
  'Singapore Airlines': 'SQ', 'British Airways': 'BA', 'Virgin Atlantic': 'VS',
  'Air Canada': 'AC', 'United': 'UA', 'American Airlines': 'AA', 'Qantas': 'QF',
  'Cathay Pacific': 'CX', 'Lufthansa': 'LH', 'ANA': 'NH', 'Thai Airways': 'TG',
  'Japan Airlines': 'JL', 'Korean Air': 'KE', 'Asiana': 'OZ', 'EVA Air': 'BR',
  'Malaysia Airlines': 'MH', 'Garuda Indonesia': 'GA', 'Philippine Airlines': 'PR',
  'Vietnam Airlines': 'VN', 'Air France': 'AF', 'KLM': 'KL', 'Swiss': 'LX',
  'Austrian': 'OS', 'SAS': 'SK', 'Finnair': 'AY', 'Iberia': 'IB', 'TAP': 'TP',
  'Aegean': 'A3', 'LOT': 'LO', 'Delta': 'DL', 'JetBlue': 'B6', 'Alaska Airlines': 'AS',
  'Air India': 'AI', 'IndiGo': '6E', 'SriLankan': 'UL', 'Gulf Air': 'GF',
  'Oman Air': 'WY', 'Saudia': 'SV', 'Royal Jordanian': 'RJ', 'EgyptAir': 'MS',
  'Kenya Airways': 'KQ', 'Ethiopian': 'ET', 'South African': 'SA', 'Aeroflot': 'SU',
  'China Southern': 'CZ', 'Air China': 'CA', 'China Eastern': 'MU', 'Hainan Airlines': 'HU',
  'Air New Zealand': 'NZ', 'Fiji Airways': 'FJ', 'Hawaiian Airlines': 'HA',
  'MEA': 'ME', 'Royal Air Maroc': 'AT', 'Avianca': 'AV', 'LATAM': 'LA', 'Copa': 'CM',
};

function airlineLogo(airline: string, size: number = 32): string {
  const code = AIRLINE_IATA[airline] || (airline.length === 2 ? airline : '');
  if (!code) return '';
  return `https://pics.avs.io/${size}/${size}/${code}.png`;
}

function AirlineLogo({ airline, size = 32 }: { airline: string; size?: number }) {
  const src = airlineLogo(airline, size);
  if (!src) return <div style={{ width: size, height: size, borderRadius: '50%', background: '#F5F3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, color: '#9C958C', fontWeight: 700, flexShrink: 0 }}>{airline.charAt(0)}</div>;
  return <img src={src} alt={airline} width={size} height={size} style={{ borderRadius: '50%', flexShrink: 0, objectFit: 'contain', background: '#fff' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
}

interface AwardResult {
  id: string; airline: string; airlineCode: string; route: string; origin: string; destination: string;
  date: string; cabin: string; miles: number; taxes: number; taxesCurrency: string;
  seats: number; isDirect: boolean; source: string; program: string; transferFrom: string[];
}
interface CashResult {
  id: string; airline: string; flights: string; price: number; currency: string;
  route: string; origin: string; destination: string; departureTime: string; arrivalTime: string;
  duration: string; stops: number; date: string; cabin: string; bookingUrl: string;
}

interface DestinationResult {
  code: string;
  city: string;
  cheapestCash: number | null;
  cheapestAward: number | null;
  cashResults: CashResult[];
  awardResults: AwardResult[];
  loading: boolean;
}

type Tab = 'overview' | 'cash' | 'points';
type Filter = 'all' | 'cash' | 'points' | 'jets';

function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [tab, setTab] = useState<Tab>('cash');
  const [loading, setLoading] = useState(true);
  const [destinations, setDestinations] = useState<DestinationResult[]>([]);
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [selectedDest, setSelectedDest] = useState<string | null>(null);
  const [totalSearched, setTotalSearched] = useState(0);
  const [totalFound, setTotalFound] = useState(0);
  const [filter, setFilter] = useState<Filter>('all');

  const doSearch = useCallback(async () => {
    setLoading(true);
    setDestinations([]);
    setSelectedDest(null);

    // 1. Parse the query
    let parseData: Record<string, unknown> = {};
    try {
      const res = await fetch('/api/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
      if (res.ok) {
        const d = await res.json();
        parseData = d.parsed || {};
        setParsed(d.parsed);
        setPassengers((d.parsed?.passengers as number) || 1);
        // Auto-set filter based on query preferences
        const prefs = (d.parsed?.preferences as string[]) || [];
        if (prefs.includes('points')) { setFilter('points'); setTab('points'); }
        else if (prefs.includes('cash')) { setFilter('cash'); setTab('cash'); }
      }
    } catch { /* */ }

    const origin = (parseData.origin as string) || 'DXB';
    const cabin = (parseData.cabin as string) || 'business';
    const isRegion = parseData.isRegionSearch === true;
    const destList: { code: string; city: string }[] = isRegion
      ? (parseData.destinations as { code: string; city: string }[]) || []
      : [{ code: (parseData.destination as string) || 'LHR', city: (parseData.destinationCity as string) || 'London' }];

    // Initialize destination cards
    const initDests: DestinationResult[] = destList.map(d => ({
      code: d.code, city: d.city,
      cheapestCash: null, cheapestAward: null,
      cashResults: [], awardResults: [],
      loading: true,
    }));
    setDestinations(initDests);
    setTotalSearched(destList.length);
    setLoading(false);

    // 2. Search all destinations in parallel
    const promises = destList.map(async (dest, idx) => {
      try {
        const res = await fetch(`/api/search?origin=${origin}&destination=${dest.code}&cabin=${cabin}`);
        const data = await res.json();
        const awards: AwardResult[] = data.results?.awards || [];
        const cash: CashResult[] = data.results?.cash || [];
        const cheapestCash = cash.filter(c => c.price > 0).sort((a, b) => a.price - b.price)[0]?.price || null;
        const cheapestAward = awards.filter(a => a.miles > 0).sort((a, b) => a.miles - b.miles)[0]?.miles || null;

        setDestinations(prev => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], cashResults: cash, awardResults: awards, cheapestCash, cheapestAward, loading: false };
          return updated;
        });
        setTotalFound(prev => prev + awards.length + cash.length);
      } catch {
        setDestinations(prev => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], loading: false };
          return updated;
        });
      }
    });

    await Promise.all(promises);
  }, [q]);

  useEffect(() => { doSearch(); }, [doSearch]);

  const isRegion = parsed?.isRegionSearch === true;
  const regionName = (parsed?.regionName as string) || '';
  const originCity = (parsed?.originCity as string) || (parsed?.origin as string) || 'DXB';

  // Sort destinations based on active filter
  const sortedDests = [...destinations].sort((a, b) => {
    if (filter === 'points') {
      if (a.cheapestAward === null && b.cheapestAward === null) return 0;
      if (a.cheapestAward === null) return 1;
      if (b.cheapestAward === null) return -1;
      return a.cheapestAward - b.cheapestAward;
    }
    // Default: sort by cash
    if (a.cheapestCash === null && b.cheapestCash === null) return 0;
    if (a.cheapestCash === null) return 1;
    if (b.cheapestCash === null) return -1;
    return a.cheapestCash - b.cheapestCash;
  }).filter(d => {
    if (filter === 'points') return d.awardResults.length > 0 || d.loading;
    if (filter === 'cash') return d.cashResults.filter(c => c.price > 0).length > 0 || d.loading;
    return true; // 'all' or 'jets'
  });

  const selected = selectedDest ? destinations.find(d => d.code === selectedDest) : null;

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF7', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header with search */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(250,250,247,0.95)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid #E0DCD4',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B6560', padding: 4 }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 8,
            background: '#fff', borderRadius: 12, border: '1px solid #E0DCD4', padding: '6px 12px',
          }}>
            <Search size={16} style={{ color: '#9C958C' }} />
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && searchInput.trim()) router.push(`/search?q=${encodeURIComponent(searchInput)}`); }}
              placeholder="New search..."
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: '#1A1A1A' }}
            />
          </div>
        </div>
        {/* Query summary */}
        <div style={{ padding: '6px 16px 10px', fontSize: 13, color: '#6B6560' }}>
          <span style={{ fontWeight: 600, color: '#0D7C72' }}>{originCity}</span>
          <span style={{ margin: '0 6px' }}>→</span>
          <span style={{ fontWeight: 600, color: '#0D7C72' }}>
            {isRegion ? regionName.charAt(0).toUpperCase() + regionName.slice(1) : (selected?.city || sortedDests[0]?.city || '...')}
          </span>
          <span style={{ margin: '0 8px', color: '#D4CFC6' }}>·</span>
          <span>{(parsed?.cabin as string) || 'Business'}</span>
          <span style={{ margin: '0 8px', color: '#D4CFC6' }}>·</span>
          <span>{passengers} pax</span>
          {isRegion && <span style={{ marginLeft: 8, fontSize: 11, color: '#0D7C72', fontWeight: 600 }}>{totalSearched} cities</span>}
        </div>
      </header>

      {/* Loading bar */}
      {destinations.some(d => d.loading) && (
        <div style={{ height: 3, background: '#E0DCD4', overflow: 'hidden' }}>
          <div style={{ width: `${Math.round((destinations.filter(d => !d.loading).length / Math.max(destinations.length, 1)) * 100)}%`, height: '100%', background: '#0D7C72', transition: 'width 0.3s' }} />
        </div>
      )}

      {/* Main content */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '16px' }}>
        {/* If region search and no specific destination selected → show overview grid */}
        {/* Filter chips — always visible */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
          {([
            { key: 'all' as Filter, label: 'All', icon: '🔍' },
            { key: 'cash' as Filter, label: 'Cash', icon: '💰' },
            { key: 'points' as Filter, label: 'Points', icon: '✈️' },
            { key: 'jets' as Filter, label: 'Jets', icon: '🛩️' },
          ]).map(f => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setSelectedDest(null); }}
              style={{
                padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: filter === f.key ? 600 : 400, whiteSpace: 'nowrap',
                background: filter === f.key ? '#0D7C72' : '#F5F3EE',
                color: filter === f.key ? '#fff' : '#6B6560',
                transition: 'all 0.15s',
              }}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        {isRegion && !selectedDest && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#9C958C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              {destinations.some(d => d.loading)
                ? `Searching ${totalSearched} cities...`
                : `${sortedDests.length} cities · ${totalFound} flights found · sorted by ${filter === 'points' ? 'fewest miles' : 'cheapest'}`}
            </div>

            {sortedDests.map((dest, i) => (
              <button
                key={dest.code}
                onClick={() => { setSelectedDest(dest.code); setTab(filter === 'points' ? 'points' : 'cash'); }}
                style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  background: '#fff', border: '1px solid #E0DCD4', borderRadius: 14,
                  padding: '14px 16px', marginBottom: 8,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  opacity: dest.loading ? 0.6 : 1,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0D7C72'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E0DCD4'; }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 2 }}>
                    {i === 0 && !dest.loading && dest.cheapestCash && <span style={{ color: '#0D7C72', marginRight: 6 }}>★ Cheapest</span>}
                    {dest.city}
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#9C958C', marginLeft: 6 }}>{dest.code}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B6560' }}>
                    {dest.loading ? 'Searching...' : `${dest.cashResults.filter(c => c.price > 0).length} cash · ${dest.awardResults.length} award`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {dest.loading ? (
                    <div style={{ width: 60, height: 18, background: '#F5F3EE', borderRadius: 8 }} className="skeleton" />
                  ) : filter === 'points' ? (
                    <>
                      {dest.cheapestAward ? (
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: '#0D7C72' }}>
                          {dest.cheapestAward.toLocaleString()} mi
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: '#9C958C' }}>No award avail</div>
                      )}
                      {dest.cheapestCash && (
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#9C958C' }}>
                          or ${dest.cheapestCash.toLocaleString()} cash
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {dest.cheapestCash ? (
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>
                          ${dest.cheapestCash.toLocaleString()}
                        </div>
                      ) : null}
                      {dest.cheapestAward ? (
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#0D7C72' }}>
                          {dest.cheapestAward.toLocaleString()} mi
                        </div>
                      ) : null}
                      {!dest.cheapestCash && !dest.cheapestAward && (
                        <div style={{ fontSize: 12, color: '#9C958C' }}>No results</div>
                      )}
                    </>
                  )}
                </div>
              </button>
            ))}
          </>
        )}

        {/* Single destination detail view (or when a region city is selected) */}
        {(!isRegion || selectedDest) && (
          <>
            {/* Back to overview for region searches */}
            {isRegion && selectedDest && (
              <button onClick={() => setSelectedDest(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#0D7C72',
                fontSize: 13, fontWeight: 600, padding: '0 0 12px', display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <ArrowLeft size={14} /> Back to all {regionName} cities
              </button>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #E0DCD4', marginBottom: 16 }}>
              {(['cash', 'points'] as Tab[]).map(t => {
                const dest = selected || sortedDests[0];
                const count = t === 'cash' ? dest?.cashResults.filter(c => c.price > 0).length || 0 : dest?.awardResults.length || 0;
                return (
                  <button key={t} onClick={() => setTab(t)} style={{
                    padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: tab === t ? 600 : 400,
                    color: tab === t ? '#0D7C72' : '#9C958C',
                    borderBottom: tab === t ? '2px solid #0D7C72' : '2px solid transparent',
                  }}>
                    {t === 'cash' ? 'Cash Fares' : 'Award Flights'} <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, opacity: 0.6 }}>({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Results list */}
            {(() => {
              const dest = selected || sortedDests[0];
              if (!dest) return <Empty text="No results" />;
              if (dest.loading) return <LoadingCards />;

              if (tab === 'cash') {
                const cash = dest.cashResults.filter(c => c.price > 0);
                return cash.length > 0 ? cash.map((f, i) => (
                  <div key={f.id} style={{
                    background: '#fff', border: '1px solid #E0DCD4',
                    borderLeft: i === 0 ? '3px solid #0D7C72' : undefined,
                    borderRadius: 14, padding: 16, marginBottom: 8,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <AirlineLogo airline={f.airline} size={36} />
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>
                            {i === 0 && <span style={{ color: '#0D7C72', marginRight: 6 }}>★</span>}{f.airline}
                          </div>
                          {f.departureTime && (
                            <div style={{ fontSize: 12, color: '#6B6560', marginTop: 2 }}>
                              {f.departureTime} · {f.duration} · {f.stops === 0 ? 'Nonstop' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>
                          ${f.price.toLocaleString()}
                        </div>
                        {passengers > 1 && (
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#9C958C' }}>
                            × {passengers} = ${(f.price * passengers).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <a href={f.bookingUrl} target="_blank" rel="noopener noreferrer" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      fontSize: 13, fontWeight: 600, color: '#fff', background: '#0D7C72',
                      borderRadius: 10, padding: '10px', textDecoration: 'none',
                    }}>
                      Book on Google Flights <ExternalLink size={13} />
                    </a>
                  </div>
                )) : <Empty text="No cash fares found for this route." />;
              }

              if (tab === 'points') {
                return dest.awardResults.length > 0 ? dest.awardResults.map((r, i) => {
                  const cpp = r.taxes > 0 ? (r.taxes / r.miles * 100) : 0;
                  const bookUrl = getBookUrl(r.airline);
                  return (
                    <div key={r.id} style={{
                      background: '#fff', border: '1px solid #E0DCD4',
                      borderLeft: i === 0 ? '3px solid #0D7C72' : undefined,
                      borderRadius: 14, padding: 16, marginBottom: 8,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <AirlineLogo airline={r.airline} size={36} />
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A' }}>
                              {i === 0 && <span style={{ color: '#0D7C72', marginRight: 6 }}>★</span>}{r.airline}
                            </div>
                            <div style={{ fontSize: 12, color: '#6B6560', marginTop: 2 }}>
                              {r.isDirect ? 'Nonstop' : '1+ stops'} · {r.cabin} · {r.seats} seat{r.seats !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>
                            {r.miles.toLocaleString()} mi
                          </div>
                          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#6B6560' }}>
                            + ${r.taxes.toFixed(0)} taxes
                          </div>
                        </div>
                      </div>
                      {passengers > 1 && (
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#9C958C', marginBottom: 6 }}>
                          Total: {(r.miles * passengers).toLocaleString()} mi + ${(r.taxes * passengers).toFixed(0)} ({passengers} pax)
                        </div>
                      )}
                      <div style={{ fontSize: 12, color: '#6B6560', marginBottom: 4 }}>via {r.program}</div>
                      {r.transferFrom.length > 0 && (
                        <div style={{ fontSize: 11, color: '#9C958C', marginBottom: 8 }}>
                          Transfer from: <span style={{ color: '#0D7C72' }}>{r.transferFrom.join(', ')}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#6B6560' }}>
                          {cpp > 0 ? `${cpp.toFixed(1)} cpp` : ''}
                        </span>
                        <a href={bookUrl} target="_blank" rel="noopener noreferrer" style={{
                          fontSize: 13, fontWeight: 600, color: '#fff', background: '#0D7C72',
                          borderRadius: 10, padding: '8px 16px', textDecoration: 'none',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          Book <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  );
                }) : <Empty text="No award availability found." />;
              }

              return null;
            })()}
          </>
        )}
      </div>
    </div>
  );
}

function LoadingCards() {
  return (
    <div>
      {[1,2,3].map(i => (
        <div key={i} style={{ height: 120, background: '#F5F3EE', borderRadius: 14, marginBottom: 8, animation: 'pulse 1.5s ease infinite' }} />
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 0' }}>
      <Plane size={28} style={{ color: '#D4CFC6', marginBottom: 12 }} />
      <div style={{ fontSize: 14, color: '#6B6560' }}>{text}</div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9C958C' }}>Loading...</div>}>
      <SearchResults />
    </Suspense>
  );
}
