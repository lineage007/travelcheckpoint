'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plane, ExternalLink, Search, ArrowRight, Hotel, Compass, Shield, DollarSign, MapPin, Anchor, Sparkles, Settings, ChevronDown } from 'lucide-react';

const AIRLINE_BOOK_URLS: Record<string, string> = {
  'Emirates': 'https://www.emirates.com/ae/english/manage-booking/redeem-miles/',
  'Etihad': 'https://www.etihad.com/en-ae/manage/redeem-miles',
  'Qatar Airways': 'https://www.qatarairways.com/en/Privilege-Club/use-qmiles.html',
  'Turkish Airlines': 'https://www.turkishairlines.com/en-int/miles-and-smiles/',
  'Singapore Airlines': 'https://www.singaporeair.com/en_UK/ppsclub-krisflyer/use-miles/',
  'British Airways': 'https://www.britishairways.com/travel/redeem/execclub/',
  'Virgin Atlantic': 'https://www.virginatlantic.com/flying-club/spend-miles',
  'United': 'https://www.united.com/ual/en/us/flight-search/book-a-flight',
  'Qantas': 'https://www.qantas.com/au/en/book-a-trip/flights/classic-flight-rewards.html',
};

const AIRLINE_IATA: Record<string, string> = {
  'Emirates':'EK','Etihad':'EY','Qatar Airways':'QR','Turkish Airlines':'TK','Singapore Airlines':'SQ',
  'British Airways':'BA','Virgin Atlantic':'VS','United':'UA','American Airlines':'AA','Qantas':'QF',
  'Cathay Pacific':'CX','Lufthansa':'LH','ANA':'NH','Thai Airways':'TG','Japan Airlines':'JL',
  'Air France':'AF','KLM':'KL','Swiss':'LX','Delta':'DL','Air Canada':'AC','Alaska Airlines':'AS',
  'Royal Jordanian':'RJ','EgyptAir':'MS','MEA':'ME','Korean Air':'KE','Asiana':'OZ',
  'Malaysia Airlines':'MH','Garuda Indonesia':'GA','SAS':'SK','Iberia':'IB','TAP':'TP',
  'Air India':'AI','Gulf Air':'GF','Oman Air':'WY','Saudia':'SV','Air New Zealand':'NZ',
  'LATAM':'LA','Ethiopian':'ET','Finnair':'AY','LOT':'LO','Aegean':'A3',
};

function AirlineLogo({ airline, size = 28 }: { airline: string; size?: number }) {
  const code = AIRLINE_IATA[airline] || (airline.length === 2 ? airline : '');
  if (!code) return <div style={{ width: size, height: size, borderRadius: '50%', background: '#F5F3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#9C958C', fontWeight: 700, flexShrink: 0 }}>{airline.charAt(0)}</div>;
  return <img src={`https://pics.avs.io/${size}/${size}/${code}.png`} alt={airline} width={size} height={size} style={{ borderRadius: '50%', flexShrink: 0, background: '#fff' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
}

interface AwardResult { id: string; airline: string; route: string; origin: string; destination: string; date: string; cabin: string; miles: number; taxes: number; seats: number; isDirect: boolean; source: string; program: string; transferFrom: string[] }
interface CashResult { id: string; airline: string; price: number; route: string; origin: string; destination: string; departureTime: string; duration: string; stops: number; cabin: string; bookingUrl: string }
interface HiddenCityResult { airline: string; price: number; from: string; to: string; actualDestination: string; isHiddenCity: boolean; duration: number; stops: number; departure: string }
interface KiwiResult { price: number; airlines: string[]; from: string; to: string; departure: string; duration: number; stops: number; isVirtualInterline: boolean; bookingLink: string }
interface VisaInfo { status: string; days?: number; note?: string; passport: string; destination: string }
interface CurrencyInfo { from: string; to: string; name: string; symbol: string; rate: number; display: string }
interface GemInfo { name: string; desc: string; type: string }
interface HotelLinks { [key: string]: { url: string; name: string; color: string } }
interface DestResult { code: string; city: string; cheapestCash: number | null; cheapestAward: number | null; cashResults: CashResult[]; awardResults: AwardResult[]; loading: boolean }

type MainTab = 'flights' | 'stay' | 'explore';
type FlightFilter = 'all' | 'cash' | 'points' | 'hidden' | 'creative';

const COLORS = { bg: '#FAFAF7', card: '#F5F3EE', border: '#E8E3DB', accent: '#0D7C72', text: '#1A1714', sub: '#9C958C', warm: '#F2EFE8' };

function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';

  const [mainTab, setMainTab] = useState<MainTab>('flights');
  const [flightFilter, setFlightFilter] = useState<FlightFilter>('all');
  const [loading, setLoading] = useState(true);
  const [destinations, setDestinations] = useState<DestResult[]>([]);
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
  const [passengers, setPassengers] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [selectedDest, setSelectedDest] = useState<string | null>(null);

  // New data sources
  const [hiddenCity, setHiddenCity] = useState<HiddenCityResult[]>([]);
  const [kiwiResults, setKiwiResults] = useState<KiwiResult[]>([]);
  const [visa, setVisa] = useState<VisaInfo | null>(null);
  const [currency, setCurrency] = useState<CurrencyInfo | null>(null);
  const [gems, setGems] = useState<GemInfo[]>([]);
  const [hotelLinks, setHotelLinks] = useState<HotelLinks | null>(null);
  const [loadingExtra, setLoadingExtra] = useState(false);

  // Load passport from localStorage
  const [passport, setPassport] = useState('TR');
  useEffect(() => {
    const saved = localStorage.getItem('tc_passport');
    if (saved) setPassport(saved);
  }, []);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setDestinations([]);
    setSelectedDest(null);
    setHiddenCity([]);
    setKiwiResults([]);
    setVisa(null);
    setCurrency(null);
    setGems([]);
    setHotelLinks(null);

    // 1. Parse the query
    let parseData: Record<string, unknown> = {};
    try {
      const res = await fetch('/api/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
      if (res.ok) {
        const d = await res.json();
        parseData = d.parsed || {};
        setParsed(d.parsed);
        setPassengers((d.parsed?.passengers as number) || 1);
      }
    } catch { /* */ }

    const origin = (parseData.origin as string) || 'DXB';
    const cabin = (parseData.cabin as string) || 'business';
    const isRegion = parseData.isRegionSearch === true;
    const destList: { code: string; city: string }[] = isRegion
      ? (parseData.destinations as { code: string; city: string }[]) || []
      : [{ code: (parseData.destination as string) || 'LHR', city: (parseData.destinationCity as string) || 'London' }];

    const initDests: DestResult[] = destList.map(d => ({ code: d.code, city: d.city, cheapestCash: null, cheapestAward: null, cashResults: [], awardResults: [], loading: true }));
    setDestinations(initDests);
    setLoading(false);

    // 2. Search flights for all destinations in parallel
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
      } catch { setDestinations(prev => { const u = [...prev]; u[idx] = { ...u[idx], loading: false }; return u; }); }
    });

    await Promise.allSettled(promises);

    // 3. Load extra data for single-destination searches
    if (!isRegion && destList.length === 1) {
      setLoadingExtra(true);
      const dest = destList[0].code;
      const date = (parseData.date as string) || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      const extras = await Promise.allSettled([
        fetch(`/api/skiplagged?from=${origin}&to=${dest}&depart=${date}`).then(r => r.json()),
        fetch(`/api/kiwi?from=${origin}&to=${dest}&depart=${date}&cabin=${cabin}`).then(r => r.json()),
        fetch(`/api/visa?passport=${passport}&destination=${dest}`).then(r => r.json()),
        fetch(`/api/currency?from=aed&destination=${dest}`).then(r => r.json()),
        fetch(`/api/gems?destination=${dest}`).then(r => r.json()),
        fetch(`/api/hotels?city=${destList[0].city}`).then(r => r.json()),
      ]);

      if (extras[0].status === 'fulfilled') setHiddenCity((extras[0].value.results || []).filter((r: HiddenCityResult) => r.price > 0));
      if (extras[1].status === 'fulfilled') setKiwiResults(extras[1].value.results || []);
      if (extras[2].status === 'fulfilled' && extras[2].value.status) setVisa(extras[2].value);
      if (extras[3].status === 'fulfilled' && extras[3].value.display) setCurrency(extras[3].value);
      if (extras[4].status === 'fulfilled') setGems(extras[4].value.gems || []);
      if (extras[5].status === 'fulfilled') setHotelLinks(extras[5].value.deepLinks || null);
      setLoadingExtra(false);
    }
  }, [q, passport]);

  useEffect(() => { if (q) doSearch(); }, [q, doSearch]);

  const dest0 = destinations[0];
  const isMulti = destinations.length > 1;
  const selectedResults = selectedDest ? destinations.find(d => d.code === selectedDest) : dest0;
  const origin = (parsed?.origin as string) || 'DXB';
  const destCity = isMulti ? 'Multiple Cities' : (parsed?.destinationCity as string) || dest0?.city || '';

  const chipStyle = (active: boolean) => ({
    fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: active ? 600 : 400,
    padding: '6px 14px', borderRadius: '100px', border: 'none', cursor: 'pointer',
    background: active ? COLORS.accent : COLORS.card, color: active ? '#fff' : COLORS.sub,
    transition: 'all 0.15s',
  });

  const tabStyle = (active: boolean) => ({
    fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 600,
    padding: '10px 20px', border: 'none', cursor: 'pointer', borderRadius: '10px 10px 0 0',
    background: active ? '#fff' : 'transparent', color: active ? COLORS.accent : COLORS.sub,
    borderBottom: active ? `2px solid ${COLORS.accent}` : '2px solid transparent',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${COLORS.border}`, padding: '12px 16px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.sub }}><ArrowLeft size={20} /></button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: COLORS.card, borderRadius: '10px', padding: '8px 14px', gap: '8px' }}>
            <Search size={16} color={COLORS.sub} />
            <input value={searchInput || q} onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && searchInput.trim()) router.push(`/search?q=${encodeURIComponent(searchInput)}`); }}
              placeholder="Search again..." style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', color: COLORS.text }} />
          </div>
        </div>

        {/* Parsed query display */}
        {parsed && (
          <div style={{ maxWidth: '900px', margin: '8px auto 0', display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: COLORS.sub }}>
            <span style={{ background: COLORS.card, padding: '3px 8px', borderRadius: '4px' }}>{origin} → {isMulti ? `${destinations.length} cities` : dest0?.code}</span>
            {parsed.cabin ? <span style={{ background: COLORS.card, padding: '3px 8px', borderRadius: '4px' }}>{String(parsed.cabin)}</span> : null}
            {passengers > 1 && <span style={{ background: COLORS.card, padding: '3px 8px', borderRadius: '4px' }}>{passengers} pax</span>}
            {visa && (
              <span style={{ padding: '3px 8px', borderRadius: '4px', background: visa.status === 'visa-free' ? '#ECFDF5' : visa.status === 'e-visa' || visa.status === 'visa-on-arrival' ? '#FFF7ED' : '#FEF2F2', color: visa.status === 'visa-free' ? '#065F46' : visa.status === 'visa-required' ? '#991B1B' : '#92400E' }}>
                {visa.status === 'visa-free' ? '✓' : visa.status === 'visa-required' ? '✕' : '⚡'} {visa.status.replace('-', ' ')}{visa.days ? ` (${visa.days}d)` : ''}
              </span>
            )}
            {currency && <span style={{ background: COLORS.card, padding: '3px 8px', borderRadius: '4px' }}>{currency.display}</span>}
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', gap: '4px', padding: '0 16px' }}>
          <button style={tabStyle(mainTab === 'flights')} onClick={() => setMainTab('flights')}><Plane size={14} style={{ marginRight: 6 }} />Flights</button>
          <button style={tabStyle(mainTab === 'stay')} onClick={() => setMainTab('stay')}><Hotel size={14} style={{ marginRight: 6 }} />Stay</button>
          <button style={tabStyle(mainTab === 'explore')} onClick={() => setMainTab('explore')}><Compass size={14} style={{ marginRight: 6 }} />Explore</button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px' }}>
        {/* ═══════════════ FLIGHTS TAB ═══════════════ */}
        {mainTab === 'flights' && (
          <>
            {/* Flight sub-filters */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {(['all', 'cash', 'points', 'hidden', 'creative'] as FlightFilter[]).map(f => (
                <button key={f} style={chipStyle(flightFilter === f)} onClick={() => setFlightFilter(f)}>
                  {f === 'all' ? 'All' : f === 'cash' ? 'Cash' : f === 'points' ? 'Points' : f === 'hidden' ? 'Hidden City' : 'Creative Routes'}
                </button>
              ))}
            </div>

            {/* Multi-destination overview */}
            {isMulti && !selectedDest && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                {destinations.sort((a, b) => (a.cheapestCash || 99999) - (b.cheapestCash || 99999)).map(d => (
                  <button key={d.code} onClick={() => setSelectedDest(d.code)} style={{
                    background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px', cursor: 'pointer', textAlign: 'left',
                    borderLeft: d === destinations.sort((a, b) => (a.cheapestCash || 99999) - (b.cheapestCash || 99999))[0] ? `3px solid ${COLORS.accent}` : undefined,
                  }}>
                    <div style={{ fontFamily: "'DM Sans'", fontSize: '14px', fontWeight: 600, color: COLORS.text }}>{d.city}</div>
                    <div style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: COLORS.sub, marginTop: '2px' }}>{d.code}</div>
                    {d.loading ? <div style={{ marginTop: '8px', height: '20px', background: COLORS.card, borderRadius: '4px', animation: 'shimmer 1.5s infinite' }} /> : (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                        {d.cheapestCash && <span style={{ fontFamily: "'JetBrains Mono'", fontSize: '13px', fontWeight: 700, color: COLORS.text }}>${d.cheapestCash.toLocaleString()}</span>}
                        {d.cheapestAward && <span style={{ fontFamily: "'JetBrains Mono'", fontSize: '12px', color: COLORS.accent }}>{(d.cheapestAward / 1000).toFixed(0)}K mi</span>}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedDest && <button onClick={() => setSelectedDest(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans'", fontSize: '12px', color: COLORS.accent, marginBottom: '12px' }}>← Back to all cities</button>}

            {/* Cash flights */}
            {(flightFilter === 'all' || flightFilter === 'cash') && selectedResults && selectedResults.cashResults.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: '15px', fontWeight: 600, color: COLORS.text, marginBottom: '10px' }}>Cash Fares</h3>
                {selectedResults.cashResults.slice(0, 8).map((f, i) => (
                  <div key={f.id || i} style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', animation: `fadeIn 0.3s ease ${i * 0.05}s both` }}>
                    <AirlineLogo airline={f.airline} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'DM Sans'", fontSize: '13px', fontWeight: 600, color: COLORS.text }}>{f.airline}</div>
                      <div style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: COLORS.sub }}>{f.route} · {f.duration} · {f.stops === 0 ? 'Direct' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'JetBrains Mono'", fontSize: '15px', fontWeight: 700, color: COLORS.text }}>${f.price.toLocaleString()}</div>
                      {passengers > 1 && <div style={{ fontFamily: "'JetBrains Mono'", fontSize: '10px', color: COLORS.sub }}>${(f.price * passengers).toLocaleString()} total</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Award flights */}
            {(flightFilter === 'all' || flightFilter === 'points') && selectedResults && selectedResults.awardResults.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: '15px', fontWeight: 600, color: COLORS.text, marginBottom: '10px' }}>Award Seats</h3>
                {selectedResults.awardResults.slice(0, 8).map((f, i) => (
                  <div key={f.id || i} style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', animation: `fadeIn 0.3s ease ${i * 0.05}s both` }}>
                    <AirlineLogo airline={f.airline} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'DM Sans'", fontSize: '13px', fontWeight: 600, color: COLORS.text }}>{f.airline} <span style={{ fontSize: '11px', color: COLORS.sub, fontWeight: 400 }}>via {f.program}</span></div>
                      <div style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: COLORS.sub }}>{f.route} · {f.cabin} · {f.seats} seat{f.seats > 1 ? 's' : ''} · {f.isDirect ? 'Direct' : 'Connection'}</div>
                      {f.transferFrom.length > 0 && <div style={{ fontSize: '10px', color: COLORS.accent, marginTop: '2px' }}>Transfer from: {f.transferFrom.join(', ')}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'JetBrains Mono'", fontSize: '15px', fontWeight: 700, color: COLORS.accent }}>{(f.miles / 1000).toFixed(0)}K mi</div>
                      <div style={{ fontFamily: "'JetBrains Mono'", fontSize: '10px', color: COLORS.sub }}>+${f.taxes} tax</div>
                      <a href={AIRLINE_BOOK_URLS[f.airline] || '#'} target="_blank" rel="noopener" style={{ fontSize: '10px', color: COLORS.accent, textDecoration: 'none' }}>Book →</a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Hidden city fares */}
            {(flightFilter === 'all' || flightFilter === 'hidden') && hiddenCity.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: '15px', fontWeight: 600, color: COLORS.text, marginBottom: '4px' }}>Hidden City Fares <span style={{ fontSize: '11px', fontWeight: 400, color: COLORS.sub }}>via Skiplagged</span></h3>
                <p style={{ fontFamily: "'DM Sans'", fontSize: '11px', color: COLORS.sub, marginBottom: '10px' }}>Get off at the layover — often 30-60% cheaper. Carry-on only, no checked bags.</p>
                {hiddenCity.slice(0, 6).map((f, i) => (
                  <div key={i} style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: f.isHiddenCity ? '3px solid #F59E0B' : undefined }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🎭</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'DM Sans'", fontSize: '13px', fontWeight: 600, color: COLORS.text }}>{f.airline}</div>
                      <div style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: COLORS.sub }}>{f.from}→{f.to}{f.isHiddenCity ? ` (via ${f.actualDestination})` : ''} · {f.duration}h · {f.stops} stop{f.stops !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono'", fontSize: '15px', fontWeight: 700, color: COLORS.text }}>${f.price.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Creative routes (Kiwi) */}
            {(flightFilter === 'all' || flightFilter === 'creative') && kiwiResults.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: '15px', fontWeight: 600, color: COLORS.text, marginBottom: '4px' }}>Creative Routes <span style={{ fontSize: '11px', fontWeight: 400, color: COLORS.sub }}>via Kiwi.com</span></h3>
                <p style={{ fontFamily: "'DM Sans'", fontSize: '11px', color: COLORS.sub, marginBottom: '10px' }}>Multi-airline combinations with Kiwi Guarantee — if you miss a connection, they rebook you.</p>
                {kiwiResults.slice(0, 6).map((f, i) => (
                  <div key={i} style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: f.isVirtualInterline ? `3px solid ${COLORS.accent}` : undefined }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      {f.airlines.slice(0, 2).map((a, j) => <AirlineLogo key={j} airline={a} size={20} />)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'DM Sans'", fontSize: '13px', fontWeight: 600, color: COLORS.text }}>{f.airlines.join(' + ')}</div>
                      <div style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: COLORS.sub }}>{f.from}→{f.to} · {f.duration}h · {f.stops} stop{f.stops !== 1 ? 's' : ''}</div>
                      {f.isVirtualInterline && <span style={{ fontSize: '10px', background: '#ECFDF5', color: '#065F46', padding: '1px 6px', borderRadius: '4px' }}>Kiwi Guarantee</span>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'JetBrains Mono'", fontSize: '15px', fontWeight: 700, color: COLORS.text }}>${f.price.toLocaleString()}</div>
                      <a href={f.bookingLink} target="_blank" rel="noopener" style={{ fontSize: '10px', color: COLORS.accent, textDecoration: 'none' }}>Book on Kiwi →</a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1,2,3,4].map(i => <div key={i} style={{ background: COLORS.card, borderRadius: '10px', height: '72px', animation: 'shimmer 1.5s infinite' }} />)}
              </div>
            )}
          </>
        )}

        {/* ═══════════════ STAY TAB ═══════════════ */}
        {mainTab === 'stay' && (
          <div>
            <h3 style={{ fontFamily: "'Space Grotesk'", fontSize: '18px', fontWeight: 600, color: COLORS.text, marginBottom: '4px' }}>Stay in {destCity}</h3>
            <p style={{ fontFamily: "'DM Sans'", fontSize: '13px', color: COLORS.sub, marginBottom: '20px' }}>Compare prices across all major platforms</p>

            {hotelLinks ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '24px' }}>
                {Object.entries(hotelLinks).map(([key, link]) => (
                  <a key={key} href={link.url} target="_blank" rel="noopener" style={{
                    background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '20px 16px',
                    textDecoration: 'none', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: '10px', background: link.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Hotel size={20} color={link.color} />
                    </div>
                    <div style={{ fontFamily: "'DM Sans'", fontSize: '13px', fontWeight: 600, color: COLORS.text }}>{link.name}</div>
                    <div style={{ fontFamily: "'DM Sans'", fontSize: '11px', color: COLORS.accent, display: 'flex', alignItems: 'center', gap: '4px' }}>Search <ExternalLink size={10} /></div>
                  </a>
                ))}
              </div>
            ) : (
              <div style={{ background: COLORS.card, borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
                <Hotel size={32} color={COLORS.sub} style={{ marginBottom: '12px' }} />
                <p style={{ fontFamily: "'DM Sans'", fontSize: '14px', color: COLORS.sub }}>Search for a specific destination to see hotel options</p>
              </div>
            )}

            {currency && (
              <div style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <DollarSign size={16} color={COLORS.accent} />
                  <span style={{ fontFamily: "'DM Sans'", fontSize: '13px', fontWeight: 600, color: COLORS.text }}>Currency</span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: '14px', color: COLORS.text }}>{currency.display}</div>
                <div style={{ fontFamily: "'DM Sans'", fontSize: '11px', color: COLORS.sub, marginTop: '2px' }}>{currency.name}</div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ EXPLORE TAB ═══════════════ */}
        {mainTab === 'explore' && (
          <div>
            {/* Visa */}
            {visa && (
              <div style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Shield size={16} color={COLORS.accent} />
                  <span style={{ fontFamily: "'DM Sans'", fontSize: '14px', fontWeight: 600, color: COLORS.text }}>Visa Requirements</span>
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px',
                  background: visa.status === 'visa-free' ? '#ECFDF5' : visa.status === 'e-visa' || visa.status === 'visa-on-arrival' ? '#FFF7ED' : '#FEF2F2',
                  color: visa.status === 'visa-free' ? '#065F46' : visa.status === 'visa-required' ? '#991B1B' : '#92400E',
                  fontFamily: "'DM Sans'", fontSize: '13px', fontWeight: 600,
                }}>
                  {visa.status === 'visa-free' ? '✓ Visa Free' : visa.status === 'visa-on-arrival' ? '⚡ Visa on Arrival' : visa.status === 'e-visa' ? '⚡ e-Visa Required' : '✕ Visa Required'}
                  {visa.days && <span style={{ fontWeight: 400 }}>({visa.days} days)</span>}
                </div>
                {visa.note && <div style={{ fontFamily: "'DM Sans'", fontSize: '12px', color: COLORS.sub, marginTop: '6px' }}>{visa.note}</div>}
                <div style={{ fontFamily: "'DM Sans'", fontSize: '11px', color: COLORS.sub, marginTop: '4px' }}>Passport: {visa.passport} → {visa.destination}</div>
              </div>
            )}

            {/* Currency */}
            {currency && (
              <div style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <DollarSign size={16} color={COLORS.accent} />
                  <span style={{ fontFamily: "'DM Sans'", fontSize: '14px', fontWeight: 600, color: COLORS.text }}>Currency</span>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono'", fontSize: '18px', fontWeight: 700, color: COLORS.text }}>{currency.display}</div>
                <div style={{ fontFamily: "'DM Sans'", fontSize: '12px', color: COLORS.sub, marginTop: '4px' }}>{currency.name} · Live rate</div>
              </div>
            )}

            {/* Hidden Gems */}
            {gems.length > 0 && (
              <div style={{ background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Sparkles size={16} color={COLORS.accent} />
                  <span style={{ fontFamily: "'DM Sans'", fontSize: '14px', fontWeight: 600, color: COLORS.text }}>Hidden Gems</span>
                  <span style={{ fontFamily: "'DM Sans'", fontSize: '11px', color: COLORS.sub }}>via Atlas Obscura</span>
                </div>
                {gems.map((g, i) => (
                  <div key={i} style={{ padding: '10px 0', borderTop: i > 0 ? `1px solid ${COLORS.card}` : 'none', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '8px', background: COLORS.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px' }}>
                      {g.type === 'food' ? '🍜' : g.type === 'nature' ? '🌿' : g.type === 'museum' ? '🎨' : g.type === 'history' ? '🏛' : g.type === 'adventure' ? '⛰' : '🏗'}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'DM Sans'", fontSize: '13px', fontWeight: 600, color: COLORS.text }}>{g.name}</div>
                      <div style={{ fontFamily: "'DM Sans'", fontSize: '12px', color: COLORS.sub, lineHeight: 1.4 }}>{g.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Settings hint */}
            <div style={{ background: COLORS.card, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Settings size={16} color={COLORS.sub} />
              <div>
                <div style={{ fontFamily: "'DM Sans'", fontSize: '13px', fontWeight: 600, color: COLORS.text }}>Your passport: {passport}</div>
                <button onClick={() => router.push('/settings')} style={{ fontFamily: "'DM Sans'", fontSize: '12px', color: COLORS.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Change passport & preferences →</button>
              </div>
            </div>

            {!visa && !currency && gems.length === 0 && (
              <div style={{ background: COLORS.card, borderRadius: '12px', padding: '40px', textAlign: 'center', marginTop: '12px' }}>
                <Compass size={32} color={COLORS.sub} style={{ marginBottom: '12px' }} />
                <p style={{ fontFamily: "'DM Sans'", fontSize: '14px', color: COLORS.sub }}>Search for a specific destination to see visa, currency, and hidden gems</p>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { opacity: 0.5; } 50% { opacity: 0.8; } 100% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FAFAF7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontFamily: "'DM Sans'", color: '#9C958C' }}>Loading...</div></div>}><SearchResults /></Suspense>;
}
