'use client';

import { useState, useEffect, Suspense, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plane, ExternalLink, Search, Hotel, Compass, Shield, DollarSign, Sparkles, Settings, CalendarDays } from 'lucide-react';
import PriceCalendar from './price-calendar';
import { monetise } from '@/lib/affiliates';

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
  'LATAM':'LA','Ethiopian':'ET','Finnair':'AY','LOT':'LO','Aegean':'A3','flydubai':'FZ','ITA Airways':'AZ',
};

function AirlineLogo({ airline, size = 28 }: { airline: string; size?: number }) {
  const code = AIRLINE_IATA[airline] || (airline.length === 2 ? airline : '');
  // Deterministic tint per airline for the monogram fallback, so unknown carriers
  // still get a distinct, stable identity instead of a grey blob.
  const hue = [...airline].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  const box = size + 6;
  return (
    <span aria-hidden="true" style={{ position: 'relative', width: box, height: box, borderRadius: '50%', background: `hsl(${hue} 45% 26%)`, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.round(size * 0.45), fontWeight: 700, flexShrink: 0, fontFamily: 'var(--font-sans)', border: '1px solid rgba(255,255,255,0.12)' }}>
      {airline.charAt(0)}
      {code && (
        // External airline badge CDN does not support Next Image static sizing reliably here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://pics.avs.io/${size}/${size}/${code}.png`} alt="" loading="lazy"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '50%', background: '#fff', objectFit: 'contain', padding: '2px', boxSizing: 'border-box' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
    </span>
  );
}

interface AwardResult { id: string; airline: string; route: string; origin: string; destination: string; date: string; cabin: string; miles: number; taxes: number; seats: number; isDirect: boolean; source: string; program: string; transferFrom: string[] }
interface CashResult { id: string; airline: string; price: number | null; pricePerPerson?: number | null; totalPrice?: number | null; route: string; origin: string; destination: string; departureTime: string; duration: string; stops: number; cabin: string; bookingUrl: string; date?: string; isLivePrice?: boolean; status?: 'live' | 'fallback'; source?: string }
interface HiddenCityResult { airline: string; price: number; from: string; to: string; actualDestination: string; isHiddenCity: boolean; duration: number; stops: number; departure: string }
interface KiwiResult { price: number; airlines: string[]; from: string; to: string; departure: string; duration: number; stops: number; isVirtualInterline: boolean; bookingLink: string }
interface VisaInfo { status: string; days?: number; note?: string; passport: string; destination: string }
interface CurrencyInfo { from: string; to: string; name: string; symbol: string; rate: number; display: string }
interface LiteHotelResult { id: string; name: string; stars: number; address: string; rating: number; reviews: number; image: string; price: number | null; totalPrice?: number | null; nights?: number; originalPrice: number; currency: string; roomType: string; board: string; freeCancellation: boolean; offerId?: string; providerStatus?: string }
interface DuffelResult { id: string; price: number; currency: string; airlines: string[]; from: string; to: string; departure: string; duration: string; stops: number; segments: { airline: string; flightNo: string; from: string; to: string }[]; bookable: boolean; offerId: string; source: string }
interface RoomResult { hotel: string; chain: string; location: string; pointsPerNight: number; cashRate: number; centsPerPoint: number; roomType: string; availability: boolean }
interface GemInfo { name: string; desc: string; type: string }
interface HotelLinks { [key: string]: { url: string; name: string; color: string } }
interface DestResult { code: string; city: string; cheapestCash: number | null; cheapestCashDate: string | null; cheapestAward: number | null; cashResults: CashResult[]; awardResults: AwardResult[]; loading: boolean }

type MainTab = 'flights' | 'stay' | 'explore';
type FlightFilter = 'all' | 'cash' | 'points' | 'hidden' | 'creative';

const COLORS = { bg: '#06060a', card: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.06)', accent: '#8B5CF6', text: '#ffffff', sub: 'rgba(255,255,255,0.4)', warm: 'rgba(255,255,255,0.03)' };

const CURRENCIES = ['AUD', 'USD', 'EUR', 'GBP', 'AED', 'TRY'] as const;
const CUR_SYMBOLS: Record<string, string> = { USD: '$', AUD: 'A$', EUR: '€', GBP: '£', AED: 'AED ', TRY: '₺' };

// ─── Booking deep links ───
// Every result card must lead somewhere actionable. These builders produce the most
// specific booking surface we can reach without holding inventory ourselves.
const gfUrl = (origin: string, dest: string, date: string, cabin: string, airline?: string) =>
  `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights from ${origin} to ${dest} on ${date} ${cabin === 'premium-economy' ? 'premium economy' : cabin} class${airline ? ` on ${airline}` : ''}`)}&curr=USD`;

const skyscannerUrl = (origin: string, dest: string, date: string, cabin: string, pax: number) =>
  `https://www.skyscanner.net/transport/flights/${origin.toLowerCase()}/${dest.toLowerCase()}/${date.replace(/-/g, '').slice(2)}/?adultsv2=${pax}&cabinclass=${cabin === 'premium-economy' ? 'premiumeconomy' : cabin}`;

const kayakUrl = (origin: string, dest: string, date: string, cabin: string, pax: number) =>
  `https://www.kayak.com/flights/${origin}-${dest}/${date}${cabin === 'business' ? '/business' : cabin === 'first' ? '/first' : cabin === 'premium-economy' ? '/premium' : ''}/${pax}adults?sort=bestflight_a`;

const kiwiUrl = (origin: string, dest: string, date: string) =>
  `https://www.kiwi.com/en/search/results/${origin}/${dest}/${date}`;

const skiplaggedUrl = (origin: string, dest: string, date: string) =>
  `https://skiplagged.com/flights/${origin}/${dest}/${date}`;

const googleHotelUrl = (hotelName: string, city: string, checkin: string, checkout: string) =>
  `https://www.google.com/travel/search?q=${encodeURIComponent(`${hotelName} ${city}`)}${checkin ? `&checkin=${checkin}&checkout=${checkout}` : ''}`;

// Award seats: airline program portal when we know it, otherwise seats.aero's own search UI.
const awardBookUrl = (airline: string, origin: string, dest: string) =>
  AIRLINE_BOOK_URLS[airline] || `https://seats.aero/search?origin=${origin}&destination=${dest}`;

// Provider departure strings vary ("2026-07-20 09:45" from SerpAPI, "10:30 PM" from the
// cash API). Strip a leading ISO date so the card shows just the time.
const formatDep = (dep: string) => dep.replace(/^\d{4}-\d{2}-\d{2}[ T]?/, '').trim();

// Duffel returns ISO-8601 durations ("PT7H54M") — humanize for display.
const fmtDuration = (d: string): string => {
  const m = (d || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
  if (!m) return d;
  return [m[1] ? `${m[1]}h` : '', m[2] ? `${m[2]}m` : ''].filter(Boolean).join(' ') || d;
};

const parseDurationMin = (d: string): number => {
  if (!d) return Infinity;
  const hr = d.match(/(\d+)\s*h/i);
  const min = d.match(/(\d+)\s*m/i);
  if (hr || min) return (hr ? parseInt(hr[1]) * 60 : 0) + (min ? parseInt(min[1]) : 0);
  const num = parseInt(d);
  return Number.isFinite(num) && num > 0 ? num : Infinity;
};

type ProviderTone = 'live' | 'fallback' | 'warning' | 'empty';

function ProviderNotice({ tone, title, children }: { tone: ProviderTone; title: string; children: React.ReactNode }) {
  const palette = {
    live: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.18)', fg: '#86EFAC', icon: '✓' },
    fallback: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', fg: '#FBBF24', icon: '↗' },
    warning: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.18)', fg: '#FCA5A5', icon: '!' },
    empty: { bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.18)', fg: COLORS.accent, icon: 'i' },
  }[tone];

  return (
    <div style={{ background: palette.bg, border: `1px solid ${palette.border}`, borderRadius: '12px', padding: '12px 14px', marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: palette.border, color: palette.fg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{palette.icon}</span>
      <div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 700, color: COLORS.text, marginBottom: '2px' }}>{title}</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', lineHeight: 1.45, color: COLORS.sub }}>{children}</div>
      </div>
    </div>
  );
}

function StatusPill({ label, tone }: { label: string; tone: ProviderTone }) {
  const color = tone === 'live' ? '#22C55E' : tone === 'fallback' ? '#F59E0B' : tone === 'warning' ? '#EF4444' : COLORS.accent;
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}28`, padding: '3px 7px', borderRadius: '999px', textTransform: 'uppercase' }}>{label}</span>;
}

// Airline-style departure-board progress: a plane crossing a dashed route line
// with rotating provider names, so searching never looks like a dead page.
const SEARCH_PROVIDERS = [
  'Google Flights', 'Emirates Skywards', 'Qatar Privilege Club', 'Turkish Miles&Smiles',
  'seats.aero award space', 'Virgin Flying Club', 'Kiwi creative routes', 'Duffel live fares',
  'Skiplagged hidden-city', 'KrisFlyer', 'Aeroplan', 'hotel rates',
];

function FlightProgress({ origin, dest }: { origin: string; dest: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick(x => x + 1), 1300);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '26px 22px', textAlign: 'center', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '440px', margin: '0 auto 14px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 800, color: COLORS.text }}>{origin || '···'}</span>
        <div style={{ flex: 1, position: 'relative', height: '26px' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: '2px dashed rgba(139,92,246,0.35)' }} />
          <div className="fly-plane" aria-hidden="true">
            <Plane size={17} style={{ transform: 'rotate(45deg)', display: 'block' }} />
          </div>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 800, color: COLORS.text }}>{dest || '···'}</span>
      </div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: COLORS.sub }} aria-live="polite">
        Searching <span style={{ color: '#A78BFA', fontWeight: 600 }}>{SEARCH_PROVIDERS[tick % SEARCH_PROVIDERS.length]}</span>…
      </div>
    </div>
  );
}

function EmptyFlights({ onFlex, onAnyStops }: { onFlex: () => void; onAnyStops: () => void }) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '14px', padding: '36px 24px', textAlign: 'center' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px dashed rgba(139,92,246,0.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
        <Plane size={22} color="#A78BFA" style={{ transform: 'rotate(45deg)' }} />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: COLORS.text, marginBottom: '6px' }}>No flights on these exact dates</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: COLORS.sub, marginBottom: '18px', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
        Providers returned nothing for this exact search — widen the dates or allow stops, or use the compare links above to double-check.
      </div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={onFlex} style={{ background: COLORS.accent, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-sans)' }}>Try ±3 days</button>
        <button onClick={onAnyStops} style={{ background: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '10px 16px', fontWeight: 700, cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-sans)' }}>Allow any stops</button>
      </div>
    </div>
  );
}

function BookCta({ label }: { label: string }) {
  return (
    <span className="book-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 700, color: COLORS.accent, whiteSpace: 'nowrap', marginTop: 2 }}>
      {label}
      <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
    </span>
  );
}

// "2026-07-20" → "Mon 20 Jul" for date chips and cheapest-date tags.
const fmtDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

// "10:30 PM" / "09:45" → minutes since midnight, for departure-time sorting.
const parseTimeMin = (t: string): number => {
  const m = formatDep(t || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return Infinity;
  let h = parseInt(m[1]);
  const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + parseInt(m[2]);
};

function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';

  const [mainTab, setMainTab] = useState<MainTab>('flights');
  const [flightFilter, setFlightFilter] = useState<FlightFilter>('all');
  const [cashSort, setCashSort] = useState<'price' | 'duration' | 'departure'>('price');
  // Multi-date search: which dates were actually searched, and an optional single-date filter.
  const [searchedDates, setSearchedDates] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const searchBoxRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(t?.tagName)) {
        e.preventDefault();
        searchBoxRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  // ±N days flexibility around the parsed date, driven by the &flex= URL param.
  const flexDays = Math.max(0, Math.min(3, parseInt(searchParams.get('flex') || '0', 10) || 0));
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
  const [, setHotelLinks] = useState<HotelLinks | null>(null);
  const [duffelResults, setDuffelResults] = useState<DuffelResult[]>([]);
  const [roomResults, setRoomResults] = useState<RoomResult[]>([]);
  const [liteHotels, setLiteHotels] = useState<LiteHotelResult[]>([]);
  const [providerStatuses, setProviderStatuses] = useState<Record<string, string>>({});
  const [loadingExtra, setLoadingExtra] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Load passport from localStorage during client initialization without a cascading effect render.
  const [passport] = useState(() => {
    if (typeof window === 'undefined') return 'TR';
    return window.localStorage.getItem('tc_passport') || 'TR';
  });

  const [error, setError] = useState<string | null>(null);

  // Display-currency toggle — converts USD-priced provider data for display only.
  // Defaults to AUD; the saved preference and live FX rates load post-mount.
  // (Named dispCurrency: `currency` above is the destination-currency info card.)
  const [dispCurrency, setDispCurrencyState] = useState('AUD');
  const [fx, setFx] = useState<Record<string, number>>({ USD: 1 });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = window.localStorage.getItem('tc_currency');
        const res = await fetch('/api/rates');
        const data = await res.json();
        if (cancelled) return;
        if (data.rates) setFx(data.rates);
        if (saved && (CURRENCIES as readonly string[]).includes(saved)) setDispCurrencyState(saved);
      } catch { /* prices stay unconverted */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const setDispCurrency = (c: string) => {
    setDispCurrencyState(c);
    try { window.localStorage.setItem('tc_currency', c); } catch { /* ignore */ }
  };
  const moneyFrom = useCallback((amount: number | null | undefined, from = 'USD'): string => {
    if (typeof amount !== 'number' || !(amount > 0)) return '—';
    const usd = from === 'USD' ? amount : amount / (fx[from] || 1);
    const out = usd * (fx[dispCurrency] || 1);
    return `${CUR_SYMBOLS[dispCurrency] ?? `${dispCurrency} `}${Math.round(out).toLocaleString()}`;
  }, [fx, dispCurrency]);
  const money = useCallback((amount: number | null | undefined) => moneyFrom(amount, 'USD'), [moneyFrom]);

  const doSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDestinations([]);
    setSelectedDest(null);
    setHiddenCity([]);
    setKiwiResults([]);
    setVisa(null);
    setCurrency(null);
    setGems([]);
    setHotelLinks(null);
    setDuffelResults([]);
    setRoomResults([]);
    setLiteHotels([]);
    setProviderStatuses({});
    setSearchedDates([]);
    setDateFilter(null);

    try {
    // 1. Parse the query
    let parseData: Record<string, unknown> = {};
    try {
      // H5: Pass the user's saved home airport as a hint so the parse route uses it as default
      // origin instead of always defaulting to DXB.
      const homeAirport = typeof window !== 'undefined'
        ? (window.localStorage.getItem('tc_home_airport') || 'DXB')
        : 'DXB';
      const res = await fetch('/api/parse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, homeAirport }) });
      if (res.ok) {
        const d = await res.json();
        parseData = d.parsed || {};
        setParsed(d.parsed);
        setPassengers((d.parsed?.passengers as number) || 1);
      }
    } catch { /* */ }

    const origin = (parseData.origin as string) || 'DXB';
    const cabin = (parseData.cabin as string) || 'business';
    const pax = (parseData.passengers as number) || 1;
    const maxStops = parseData.maxStops as number | null;
    const rawDates = (parseData.departDates as string[]) || [parseData.departDate as string || ''];
    const departDates = rawDates.filter(d => d && d.length > 0);
    if (departDates.length === 0) departDates.push(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    const isRegion = parseData.isRegionSearch === true;
    const rawDestList: { code: string; city: string }[] = isRegion
      ? (parseData.destinations as { code: string; city: string }[]) || []
      : [{ code: (parseData.destination as string) || 'LHR', city: (parseData.destinationCity as string) || 'London' }];
    // Cap region searches at 10 cities max to avoid timeouts
    const destList = rawDestList.slice(0, 10);

    const initDests: DestResult[] = destList.map(d => ({ code: d.code, city: d.city, cheapestCash: null, cheapestCashDate: null, cheapestAward: null, cashResults: [], awardResults: [], loading: true }));
    setDestinations(initDests);
    setLoading(false);

    // 2. Multi-city × multi-date fan-out under a fixed request budget.
    // Expand ±flexDays around the first parsed date, merge with any parsed range.
    let allDates = [...departDates];
    if (flexDays > 0) {
      const base = new Date(`${departDates[0]}T00:00:00.000Z`);
      const expanded = new Set<string>(departDates);
      for (let off = -flexDays; off <= flexDays; off++) {
        const d = new Date(base.getTime() + off * 86400000);
        if (d.getTime() > Date.now()) expanded.add(d.toISOString().split('T')[0]);
      }
      allDates = [...expanded].sort();
    }
    // Budget: at most ~30 searches per query, max 4 dates per city. Sample the
    // range evenly so a 7-day window still covers start/middle/end.
    const dateCap = Math.max(1, Math.min(4, Math.floor(30 / destList.length)));
    const searchDates = allDates.length <= dateCap
      ? allDates
      : dateCap === 1
        ? [allDates[0]]
        : Array.from({ length: dateCap }, (_, i) => allDates[Math.round(i * (allDates.length - 1) / (dateCap - 1))]);
    setSearchedDates(searchDates);

    // Concurrency limiter: keep at most 12 provider searches in flight.
    let inFlight = 0;
    const waiters: (() => void)[] = [];
    const withSlot = async (fn: () => Promise<void>): Promise<void> => {
      if (inFlight >= 12) await new Promise<void>(r => waiters.push(r));
      inFlight++;
      try { await fn(); } catch { /* one failed date must not sink the city */ }
      finally { inFlight--; waiters.shift()?.(); }
    };

    const promises = destList.map(async (dest, idx) => {
      try {
        // Search all dates and merge results (dedup per date by airline+price+time)
        const allCash: CashResult[] = [];
        const allAwards: AwardResult[] = [];
        const seen = new Set<string>();

        const dateSearches = searchDates.map((date, dateIdx) => withSlot(async () => {
          const stopsParam = maxStops !== null && maxStops !== undefined ? `&maxStops=${maxStops}` : '';
          // Awards aren't date-specific — only the first date queries seats.aero,
          // the rest skip it to protect the daily quota.
          const awardsParam = dateIdx > 0 ? '&skipAwards=1' : '';
          const res = await fetch(`/api/search?origin=${origin}&destination=${dest.code}&cabin=${cabin}&date=${date}&passengers=${pax}${stopsParam}${awardsParam}`, { signal: AbortSignal.timeout(20000) });
          const data = await res.json();
          const awards: AwardResult[] = data.results?.awards || [];
          const cash: CashResult[] = data.results?.cash || [];
          if (!isRegion && data.meta?.providerStatus) {
            const ps = { ...data.meta.providerStatus };
            if (ps.awards === 'skipped') delete ps.awards;
            setProviderStatuses(prev => ({ ...prev, ...ps }));
          }

          for (const c of cash) {
            const key = `${date}-${c.airline}-${c.price}-${c.departureTime}`;
            // Re-key ids per date — the API numbers results per search, so merged
            // dates would otherwise collide (duplicate React keys).
            if (!seen.has(key)) { seen.add(key); allCash.push({ ...c, date, id: key }); }
          }
          for (const a of awards) {
            const key = `${a.airline}-${a.miles}-${a.date}`;
            if (!seen.has(key)) { seen.add(key); allAwards.push(a); }
          }
        }));
        await Promise.all(dateSearches);

        allCash.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
        allAwards.sort((a, b) => a.miles - b.miles);
        const bestLive = allCash.find(c => typeof c.price === 'number' && c.price > 0 && c.isLivePrice !== false) || null;
        const cheapestCash = bestLive?.price || null;
        const cheapestCashDate = bestLive?.date || null;
        const cheapestAward = allAwards.filter(a => a.miles > 0)[0]?.miles || null;

        setDestinations(prev => {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], cashResults: allCash, awardResults: allAwards, cheapestCash, cheapestCashDate, cheapestAward, loading: false };
          return updated;
        });
      } catch { setDestinations(prev => { const u = [...prev]; u[idx] = { ...u[idx], loading: false }; return u; }); }
    });

    await Promise.allSettled(promises);

    // 3. Load extra data for single-destination searches
    if (!isRegion && destList.length === 1) {
      setLoadingExtra(true);
      const dest = destList[0].code;
      const date = ((parseData.departDates as string[]) || [parseData.departDate as string || ''])[0] || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const checkout = new Date(`${date}T00:00:00.000Z`);
      checkout.setUTCDate(checkout.getUTCDate() + 3);
      const checkoutDate = checkout.toISOString().split('T')[0];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeFetch = (url: string): Promise<any> => fetch(url).then(r => { if (!r.ok) return {}; return r.json().catch(() => ({})); }).catch(() => ({}));
      const extras = await Promise.allSettled([
        safeFetch(`/api/skiplagged?from=${origin}&to=${dest}&depart=${date}`),
        safeFetch(`/api/kiwi?from=${origin}&to=${dest}&depart=${date}&cabin=${cabin}`),
        safeFetch(`/api/visa?passport=${passport}&destination=${dest}`),
        safeFetch(`/api/currency?from=aed&destination=${dest}`),
        safeFetch(`/api/gems?destination=${dest}`),
        safeFetch(`/api/hotels?city=${destList[0].city}`),
        safeFetch(`/api/duffel?origin=${origin}&destination=${dest}&date=${date}&cabin=${cabin}&passengers=${pax}`),
        safeFetch(`/api/rooms?destination=${dest}&checkin=${date}&checkout=${checkoutDate}`),
        safeFetch(`/api/liteapi?destination=${dest}&checkin=${date}&checkout=${checkoutDate}&adults=${Math.max(1, Math.min(pax, 9))}`),
      ]);

      if (extras[0].status === 'fulfilled') {
        const value = extras[0].value;
        setHiddenCity((value.results || []).filter((r: HiddenCityResult) => r.price > 0));
        if (value.status) setProviderStatuses(prev => ({ ...prev, skiplagged: value.status }));
      }
      if (extras[1].status === 'fulfilled') {
        const value = extras[1].value;
        setKiwiResults(value.results || []);
        if (value.status) setProviderStatuses(prev => ({ ...prev, kiwi: value.status }));
      }
      if (extras[2].status === 'fulfilled' && extras[2].value.status) setVisa(extras[2].value);
      if (extras[3].status === 'fulfilled' && extras[3].value.display) setCurrency(extras[3].value);
      if (extras[4].status === 'fulfilled') setGems(extras[4].value.gems || []);
      if (extras[5].status === 'fulfilled') setHotelLinks(extras[5].value.deepLinks || null);
      if (extras[6].status === 'fulfilled') setDuffelResults(extras[6].value.results || []);
      if (extras[7].status === 'fulfilled') {
        const value = extras[7].value;
        setRoomResults(value.results || []);
        if (value.providerStatus) setProviderStatuses(prev => ({ ...prev, rooms: value.providerStatus }));
      }
      if (extras[8].status === 'fulfilled') {
        const value = extras[8].value;
        setLiteHotels(value.results || []);
        if (value.providerStatus) setProviderStatuses(prev => ({ ...prev, liteapi: value.providerStatus }));
      }
      setLoadingExtra(false);
    }
    } catch (err) {
      console.error('Search error:', err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }, [q, passport, flexDays]);

  useEffect(() => {
    if (!q) return;
    const timer = window.setTimeout(() => { void doSearch(); }, 0);
    return () => window.clearTimeout(timer);
  }, [q, doSearch]);

  // Save search to history once results arrive (not while loading)
  useEffect(() => {
    if (loading) return;
    if (destinations.length === 0) return;
    const first = destinations[0];
    if (first.loading) return;
    const originCode = (parsed?.origin as string) || 'DXB';
    const destCode = first.code;
    const cabinClass = (parsed?.cabin as string) || 'business';
    const pax = (parsed?.passengers as number) || 1;
    const topCash = first.cashResults.filter(f => typeof f.price === 'number' && (f.price ?? 0) > 0 && f.isLivePrice !== false).sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0]?.price ?? null;
    const topAward = first.awardResults.filter(a => a.miles > 0).sort((a, b) => a.miles - b.miles)[0]?.miles ?? null;
    try {
      interface HistEntry { q: string; searchedAt: string; bestCash: number | null; bestAward: number | null; origin: string; destination: string; cabin: string; passengers: number }
      const histRaw = JSON.parse(window.localStorage.getItem('tc_search_history') || '[]') as HistEntry[];
      const entry: HistEntry = { q, searchedAt: new Date().toISOString(), bestCash: topCash, bestAward: topAward, origin: originCode, destination: destCode, cabin: cabinClass, passengers: pax };
      const next = [entry, ...histRaw.filter(h => h.q.toLowerCase() !== q.toLowerCase())].slice(0, 50);
      window.localStorage.setItem('tc_search_history', JSON.stringify(next));
    } catch { /* localStorage full */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, destinations]);

  const dest0 = destinations[0] || null;
  const isMulti = destinations.length > 1;
  const selectedResults = selectedDest ? destinations.find(d => d.code === selectedDest) || null : dest0;
  const origin = (parsed?.origin as string) || 'DXB';
  const destCity = isMulti ? 'Multiple Cities' : (parsed?.destinationCity as string) || dest0?.city || '';
  const selectedCash = selectedResults?.cashResults || [];
  const selectedAwards = selectedResults?.awardResults || [];
  const liveCashCount = selectedCash.filter(f => typeof f.price === 'number' && f.price > 0 && f.isLivePrice !== false).length;
  const fallbackCashCount = selectedCash.filter(f => f.status === 'fallback' || f.isLivePrice === false).length;
  const hasAnyFlightResult = liveCashCount > 0 || fallbackCashCount > 0 || selectedAwards.length > 0 || hiddenCity.length > 0 || kiwiResults.length > 0 || duffelResults.length > 0;
  const departDate = (parsed?.departDates as string[])?.[0] || (parsed?.departDate as string) || '';
  const bestCash = selectedCash.filter(f => typeof f.price === 'number' && f.price > 0 && f.isLivePrice !== false).sort((a, b) => (a.price || Infinity) - (b.price || Infinity))[0] || null;
  const bestAward = selectedAwards.filter(a => a.miles > 0).sort((a, b) => a.miles - b.miles)[0] || null;
  const bestHotel = liteHotels.filter(h => typeof h.price === 'number' && h.price > 0).sort((a, b) => (a.price || Infinity) - (b.price || Infinity))[0] || null;

  // Per-day best live USD price from the current results — seeds the price calendar.
  const knownPrices = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of selectedResults?.cashResults || []) {
      if (typeof f.price === 'number' && f.price > 0 && f.isLivePrice !== false && f.date) {
        if (map[f.date] === undefined || f.price < map[f.date]) map[f.date] = f.price;
      }
    }
    return map;
  }, [selectedResults]);

  const pickDate = (d: string) => {
    setCalendarOpen(false);
    const base = searchInput || q;
    const newQ = base.replace(/\d{4}-\d{2}-\d{2}|tomorrow|next week|next month|this weekend|this week|today|flexible|anytime/i, d);
    router.push(`/search?q=${encodeURIComponent(newQ === base ? `${base} ${d}` : newQ)}`);
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  const saveSearch = () => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('tc_saved_searches') || '[]') as { q: string; savedAt: string }[];
      const next = [{ q, savedAt: new Date().toISOString() }, ...saved.filter(item => item.q.toLowerCase() !== q.toLowerCase())].slice(0, 20);
      window.localStorage.setItem('tc_saved_searches', JSON.stringify(next));
      const recent = JSON.parse(window.localStorage.getItem('tc_recent_searches') || '[]') as string[];
      window.localStorage.setItem('tc_recent_searches', JSON.stringify([q, ...recent.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 6)));
      showToast('Search saved');
    } catch { showToast('Could not save search'); }
  };

  const trackRoute = async () => {
    if (!selectedResults) { showToast('No route selected to track'); return; }
    const destCode = selectedResults.code || dest0?.code || '';
    const cabinClass = (parsed?.cabin as string) || 'business';
    const pax = passengers;
    const cashPrice = bestCash?.price ?? null;
    const awardMiles = bestAward?.miles ?? null;
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin, destination: destCode, cabin: cabinClass, passengers: pax,
          baselineCash: cashPrice, baselineAward: awardMiles,
          label: `${origin} → ${destCode} ${cabinClass}`,
        }),
      });
      const data: { message?: string; error?: string } = await res.json();
      if (!res.ok) showToast(data.error || 'Could not set alert');
      else showToast('Tracking — Telegram alert set');
    } catch { showToast('Alert failed — check Telegram config'); }
  };

  const shareTrip = async () => {
    const lines = [
      `TravelCheckpoint: ${origin} → ${isMulti ? destCity : (selectedResults?.code || destCity)}`,
      departDate ? `Date: ${departDate}` : '',
      `Passengers: ${passengers}`,
      bestCash ? `Best live cash: ${money(bestCash.price)} ${bestCash.airline}` : fallbackCashCount ? 'Cash: fallback search links only' : '',
      bestAward ? `Best award: ${(bestAward.miles / 1000).toFixed(0)}K miles via ${bestAward.program}` : '',
      bestHotel ? `Hotel from: ${moneyFrom(bestHotel.price, bestHotel.currency || 'USD')} (${bestHotel.name})` : '',
      visa ? `Visa: ${visa.status}${visa.days ? ` (${visa.days}d)` : ''}` : '',
      `Link: ${window.location.href}`,
    ].filter(Boolean).join('\n');
    try {
      const canUseNativeShare = Boolean(navigator.share);
      if (canUseNativeShare) await navigator.share({ title: 'TravelCheckpoint trip', text: lines, url: window.location.href });
      else await navigator.clipboard.writeText(lines);
      showToast(canUseNativeShare ? 'Share sheet opened' : 'Trip summary copied');
    } catch { showToast('Share cancelled'); }
  };

  const chipStyle = (active: boolean) => ({
    fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: active ? 600 : 400,
    padding: '6px 14px', borderRadius: '100px', border: 'none', cursor: 'pointer',
    background: active ? COLORS.accent : COLORS.card, color: active ? '#fff' : COLORS.sub,
    transition: 'all 0.15s',
  });

  const tabStyle = (active: boolean) => ({
    fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600,
    padding: '10px 20px', border: 'none', cursor: 'pointer', borderRadius: '10px 10px 0 0',
    background: active ? 'rgba(139,92,246,0.1)' : 'transparent', color: active ? COLORS.accent : COLORS.sub,
    borderBottom: active ? `2px solid ${COLORS.accent}` : '2px solid transparent',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg }}>
      {/* Header */}
      <div style={{ background: 'rgba(6,6,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${COLORS.border}`, padding: '12px 16px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.sub }}><ArrowLeft size={20} /></button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.08)`, borderRadius: '10px', padding: '8px 14px', gap: '8px' }}>
            <Search size={16} color={COLORS.sub} />
            <input ref={searchBoxRef} value={searchInput || q} onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && searchInput.trim()) router.push(`/search?q=${encodeURIComponent(searchInput)}`); }}
              placeholder="Search again..." style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontFamily: 'var(--font-body)', fontSize: '14px', color: COLORS.text }} />
          </div>
          <select value={dispCurrency} onChange={e => setDispCurrency(e.target.value)} aria-label="Display currency"
            style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '9px 8px', color: COLORS.text, outline: 'none', cursor: 'pointer', minHeight: '38px' }}>
            {CURRENCIES.map(c => <option key={c} value={c} style={{ background: '#15151c' }}>{c}</option>)}
          </select>
        </div>

        {/* Interactive refinement bar */}
        {parsed && (
          <div style={{ maxWidth: '900px', margin: '8px auto 0' }}>
            {/* Row 1: Origin, Dest, Date, Pax — scrollable on mobile */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none', marginBottom: '6px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', minWidth: 'max-content', paddingBottom: '2px' }}>
                <input defaultValue={origin} placeholder="From" onBlur={e => { if (e.target.value && e.target.value.toUpperCase() !== origin) { const newQ = (searchInput || q).replace(new RegExp(origin, 'i'), e.target.value.toUpperCase()); router.push(`/search?q=${encodeURIComponent(newQ)}`); } }}
                  style={{ width: '60px', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '9px 8px', color: COLORS.text, textAlign: 'center', textTransform: 'uppercase', outline: 'none', minHeight: '38px' }} />
                <span style={{ fontSize: '12px', color: COLORS.sub, flexShrink: 0 }}>→</span>
                <input defaultValue={isMulti ? (parsed.regionName as string || 'Multiple') : (dest0?.code || '')} placeholder="To"
                  onBlur={e => { if (e.target.value) { const destStr = isMulti ? (parsed.regionName as string || '') : (dest0?.code || ''); const newQ = destStr ? (searchInput || q).replace(new RegExp(destStr, 'i'), e.target.value) : `${origin} to ${e.target.value}`; router.push(`/search?q=${encodeURIComponent(newQ)}`); } }}
                  style={{ width: isMulti ? '90px' : '60px', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '9px 8px', color: COLORS.text, textAlign: 'center', textTransform: 'uppercase', outline: 'none', minHeight: '38px' }} />
                <button onClick={() => setCalendarOpen(true)} title="See prices per day"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '9px 10px', color: COLORS.text, cursor: 'pointer', minHeight: '38px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                  <CalendarDays size={13} color="#A78BFA" />
                  {departDate ? fmtDay(departDate) : 'Pick date'}{searchedDates.length > 1 ? ` +${searchedDates.length - 1}` : ''}
                </button>
                <select defaultValue={passengers} onChange={e => { const pax = parseInt(e.target.value); const base = searchInput || q; const newQ = base.replace(/\d+\s*(people|person|pax|passengers?|adults?)/i, `${pax} people`); router.push(`/search?q=${encodeURIComponent(newQ === base ? `${base}, ${pax} people` : newQ)}`); }}
                  style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '9px 8px', color: COLORS.text, outline: 'none', cursor: 'pointer', minHeight: '38px' }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} pax</option>)}
                </select>
                {visa && (
                  <span style={{ padding: '9px 10px', borderRadius: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)', background: visa.status === 'visa-free' ? '#ECFDF5' : visa.status === 'e-visa' || visa.status === 'visa-on-arrival' ? '#FFF7ED' : '#FEF2F2', color: visa.status === 'visa-free' ? '#065F46' : visa.status === 'visa-required' ? '#991B1B' : '#92400E', whiteSpace: 'nowrap', minHeight: '38px', display: 'flex', alignItems: 'center' }}>
                    {visa.status === 'visa-free' ? '✓' : visa.status === 'visa-required' ? '✕' : '⚡'} {visa.status.replace('-', ' ')}{visa.days ? ` (${visa.days}d)` : ''}
                  </span>
                )}
                {currency && <span style={{ background: COLORS.card, padding: '9px 10px', borderRadius: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: COLORS.sub, whiteSpace: 'nowrap', minHeight: '38px', display: 'flex', alignItems: 'center' }}>{currency.display}</span>}
              </div>
            </div>
            {/* Row 2: Cabin class + stops — scrollable pill row */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', minWidth: 'max-content', paddingBottom: '2px' }}>
                <span style={{ fontSize: '10px', color: COLORS.sub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '4px', whiteSpace: 'nowrap' }}>Cabin</span>
                {['economy', 'premium-economy', 'business', 'first'].map(c => {
                  const active = (parsed.cabin as string || 'business') === c;
                  return <button key={c} onClick={() => { if (!active) { const base = searchInput || q; const cabins = ['economy','premium-economy','business','first']; const oldCabin = cabins.find(cb => base.toLowerCase().includes(cb)) || ''; const newQ = oldCabin ? base.replace(new RegExp(oldCabin, 'i'), c) : `${base}, ${c}`; router.push(`/search?q=${encodeURIComponent(newQ)}`); } }}
                    style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: active ? 600 : 400, padding: '8px 12px', borderRadius: '100px', border: 'none', cursor: 'pointer', background: active ? COLORS.accent : COLORS.card, color: active ? '#fff' : COLORS.sub, transition: 'all 0.15s', whiteSpace: 'nowrap', minHeight: '36px' }}>
                    {c === 'premium-economy' ? 'Premium' : c.charAt(0).toUpperCase() + c.slice(1)}
                  </button>;
                })}
                <span style={{ width: '1px', height: '16px', background: COLORS.border, margin: '0 6px', flexShrink: 0 }} />
                <span style={{ fontSize: '10px', color: COLORS.sub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '4px', whiteSpace: 'nowrap' }}>Stops</span>
                {[{ label: 'Any', val: 'any' }, { label: 'Direct', val: '0' }, { label: '1 stop', val: '1' }, { label: '2 stops', val: '2' }].map(s => {
                  const curStops = parsed.maxStops === null || parsed.maxStops === undefined ? 'any' : String(parsed.maxStops);
                  const active = curStops === s.val;
                  return <button key={s.val} onClick={() => { if (!active) { const base = searchInput || q; let newQ = base.replace(/\b(direct|nonstop|non-stop|no stops?|max \d stops?|one stop|two stops?|\d stops?|all the options|any stops?)\b/gi, '').trim(); if (s.val === 'any') newQ += ', all the options'; else if (s.val === '0') newQ += ', direct'; else newQ += `, max ${s.val} stop${s.val === '1' ? '' : 's'}`; router.push(`/search?q=${encodeURIComponent(newQ)}`); } }}
                    style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: active ? 600 : 400, padding: '8px 12px', borderRadius: '100px', border: 'none', cursor: 'pointer', background: active ? COLORS.accent : COLORS.card, color: active ? '#fff' : COLORS.sub, transition: 'all 0.15s', whiteSpace: 'nowrap', minHeight: '36px' }}>
                    {s.label}
                  </button>;
                })}
                <span style={{ width: '1px', height: '16px', background: COLORS.border, margin: '0 6px', flexShrink: 0 }} />
                <span style={{ fontSize: '10px', color: COLORS.sub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '4px', whiteSpace: 'nowrap' }}>Dates</span>
                {[{ label: 'Exact', val: 0 }, { label: '±1 day', val: 1 }, { label: '±3 days', val: 3 }].map(o => {
                  const active = flexDays === o.val;
                  return <button key={o.val} onClick={() => { if (!active) router.push(`/search?q=${encodeURIComponent(searchInput || q)}${o.val ? `&flex=${o.val}` : ''}`); }}
                    style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: active ? 600 : 400, padding: '8px 12px', borderRadius: '100px', border: 'none', cursor: 'pointer', background: active ? COLORS.accent : COLORS.card, color: active ? '#fff' : COLORS.sub, transition: 'all 0.15s', whiteSpace: 'nowrap', minHeight: '36px' }}>
                    {o.label}
                  </button>;
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <div style={{ background: 'rgba(6,6,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', gap: '4px', padding: '0 16px' }}>
          <button style={tabStyle(mainTab === 'flights')} onClick={() => setMainTab('flights')}><Plane size={14} style={{ marginRight: 6 }} />Flights</button>
          <button style={tabStyle(mainTab === 'stay')} onClick={() => setMainTab('stay')}><Hotel size={14} style={{ marginRight: 6 }} />Stay</button>
          <button style={tabStyle(mainTab === 'explore')} onClick={() => setMainTab('explore')}><Compass size={14} style={{ marginRight: 6 }} />Explore</button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px' }}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: '#FCA5A5' }}>{error}</span>
            <button onClick={() => doSearch()} style={{ marginLeft: 'auto', fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600, color: COLORS.accent, background: 'none', border: 'none', cursor: 'pointer' }}>Retry</button>
          </div>
        )}
        {toast && (
          <div style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 100, background: 'rgba(15,15,20,0.96)', border: `1px solid ${COLORS.border}`, borderRadius: '999px', padding: '10px 16px', color: COLORS.text, fontFamily: 'var(--font-sans)', fontSize: 13, boxShadow: '0 10px 30px rgba(0,0,0,0.35)' }}>{toast}</div>
        )}

        {selectedResults && !loading && (
          <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.14), rgba(6,182,212,0.08))', border: `1px solid ${COLORS.border}`, borderRadius: '16px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: COLORS.text }}>{origin} → {isMulti ? destCity : selectedResults.code}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: COLORS.sub, marginTop: 2 }}>{searchedDates.length > 1 ? `${fmtDay(searchedDates[0])} – ${fmtDay(searchedDates[searchedDates.length - 1])} (${searchedDates.length} dates)` : departDate || 'Flexible date'} · {passengers} passenger{passengers === 1 ? '' : 's'} · {(parsed?.cabin as string) || 'business'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={saveSearch} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.text, borderRadius: '10px', padding: '8px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Save</button>
                <button onClick={() => router.push('/history')} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.sub, borderRadius: '10px', padding: '8px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }} title="View search history">History</button>
                <button onClick={trackRoute} style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#22C55E', borderRadius: '10px', padding: '8px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }} title="Track price — sends Telegram when it drops">Track</button>
                <button onClick={shareTrip} style={{ background: COLORS.accent, border: 'none', color: '#fff', borderRadius: '10px', padding: '8px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Share</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginTop: '12px' }}>
              <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: '10px', padding: '10px' }}><div style={{ color: COLORS.sub, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Best cash</div><div style={{ color: COLORS.text, fontFamily: 'var(--font-mono)', fontWeight: 800, marginTop: 3 }}>{bestCash ? money(bestCash.price) : fallbackCashCount ? 'Check live' : '—'}</div></div>
              <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: '10px', padding: '10px' }}><div style={{ color: COLORS.sub, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Best award</div><div style={{ color: COLORS.text, fontFamily: 'var(--font-mono)', fontWeight: 800, marginTop: 3 }}>{bestAward ? `${(bestAward.miles / 1000).toFixed(0)}K mi` : '—'}</div></div>
              <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: '10px', padding: '10px' }}><div style={{ color: COLORS.sub, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hotel</div><div style={{ color: COLORS.text, fontFamily: 'var(--font-mono)', fontWeight: 800, marginTop: 3 }}>{bestHotel ? moneyFrom(bestHotel.price, bestHotel.currency || 'USD') : providerStatuses.liteapi === 'hotel-list-only' ? 'List only' : '—'}</div></div>
              <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: '10px', padding: '10px' }}><div style={{ color: COLORS.sub, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Visa</div><div style={{ color: COLORS.text, fontFamily: 'var(--font-mono)', fontWeight: 800, marginTop: 3 }}>{visa ? visa.status.replace('-', ' ') : '—'}</div></div>
            </div>
          </div>
        )}
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

            {selectedResults && !loading && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <StatusPill label={liveCashCount > 0 ? `${liveCashCount} live cash` : providerStatuses.cash === 'fallback-links-only' ? 'cash fallback' : 'cash pending'} tone={liveCashCount > 0 ? 'live' : providerStatuses.cash === 'fallback-links-only' ? 'fallback' : 'empty'} />
                <StatusPill
                  label={selectedAwards.length > 0 ? `${selectedAwards.length} award seats` : providerStatuses.awards === 'rate-limited' ? 'awards rate-limited — retry later' : providerStatuses.awards === 'missing-key' ? 'awards missing key' : 'no awards'}
                  tone={selectedAwards.length > 0 ? 'live' : providerStatuses.awards === 'rate-limited' || providerStatuses.awards === 'missing-key' ? 'warning' : 'empty'} />
                <StatusPill label={kiwiResults.length > 0 ? `${kiwiResults.length} creative` : providerStatuses.kiwi === 'unavailable' ? 'kiwi unavailable' : 'creative routes'} tone={kiwiResults.length > 0 ? 'live' : providerStatuses.kiwi === 'unavailable' ? 'fallback' : 'empty'} />
                <StatusPill label={hiddenCity.length > 0 ? `${hiddenCity.length} hidden-city` : providerStatuses.skiplagged === 'not-configured' ? 'skiplagged not configured' : 'hidden city'} tone={hiddenCity.length > 0 ? 'live' : providerStatuses.skiplagged === 'not-configured' ? 'fallback' : 'empty'} />
              </div>
            )}

            {/* Compare-everywhere row: one tap to this exact route+date on every major engine.
                Shown for single-city searches and when a city is drilled into on a region search. */}
            {selectedResults && !loading && (!isMulti || selectedDest) && (() => {
              const cmpDate = departDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
              const cmpCabin = (parsed?.cabin as string) || 'business';
              const cmpDest = selectedResults.code;
              const engines = [
                { name: 'Google Flights', url: gfUrl(origin, cmpDest, cmpDate, cmpCabin) },
                { name: 'Skyscanner', url: monetise(skyscannerUrl(origin, cmpDest, cmpDate, cmpCabin, passengers)) },
                { name: 'Kayak', url: kayakUrl(origin, cmpDest, cmpDate, cmpCabin, passengers) },
                { name: 'Kiwi', url: monetise(kiwiUrl(origin, cmpDest, cmpDate)) },
                { name: 'Skiplagged', url: skiplaggedUrl(origin, cmpDest, cmpDate) },
              ];
              return (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', minWidth: 'max-content', paddingBottom: '2px' }}>
                    <span style={{ fontSize: '10px', color: COLORS.sub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', marginRight: '2px' }}>Compare on</span>
                    {engines.map(e => (
                      <a key={e.name} className="compare-chip" href={e.url} target="_blank" rel="noopener noreferrer"
                        style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: '999px', padding: '8px 13px', fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 600, color: COLORS.sub }}>
                        {e.name}
                        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" /></svg>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Multi-destination overview */}
            {isMulti && !selectedDest && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                {[...destinations].sort((a, b) => (a.cheapestCash || 99999) - (b.cheapestCash || 99999)).map((d, di) => (
                  <button key={d.code} onClick={() => setSelectedDest(d.code)} style={{
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px', cursor: 'pointer', textAlign: 'left',
                    borderLeft: di === 0 ? `3px solid ${COLORS.accent}` : undefined,
                  }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: COLORS.text }}>{d.city}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: COLORS.sub, marginTop: '2px' }}>{d.code}</div>
                    {d.loading ? <div style={{ marginTop: '8px', height: '20px', background: COLORS.card, borderRadius: '4px', animation: 'shimmer 1.5s infinite' }} /> : (
                      <>
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                          {d.cheapestCash && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: COLORS.text }}>{money(d.cheapestCash)}</span>}
                          {d.cheapestAward && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: COLORS.accent }}>{(d.cheapestAward / 1000).toFixed(0)}K mi</span>}
                        </div>
                        {d.cheapestCashDate && searchedDates.length > 1 && (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#22C55E', marginTop: '3px' }}>best {fmtDay(d.cheapestCashDate)}</div>
                        )}
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedDest && <button onClick={() => setSelectedDest(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '12px', color: COLORS.accent, marginBottom: '12px' }}>← Back to all cities</button>}

            {/* Cash flights */}
            {(flightFilter === 'all' || flightFilter === 'cash') && selectedResults && selectedResults.cashResults.length > 0 && (() => {
              // Compute median of live prices for deal-value badges
              const livePrices = selectedResults.cashResults
                .filter(f => typeof f.price === 'number' && (f.price ?? 0) > 0 && f.isLivePrice !== false)
                .map(f => f.price as number)
                .sort((a, b) => a - b);
              const median = livePrices.length > 0
                ? livePrices[Math.floor(livePrices.length / 2)]
                : null;
              const getDealBadge = (price: number | null): { label: string; bg: string; color: string } | null => {
                if (!median || !price || price <= 0) return null;
                const ratio = price / median;
                if (ratio <= 0.65) return { label: 'Best Deal', bg: 'rgba(34,197,94,0.15)', color: '#22C55E' };
                if (ratio <= 0.82) return { label: 'Good Deal', bg: 'rgba(16,185,129,0.12)', color: '#10B981' };
                return null;
              };
              const cabinClass = (parsed?.cabin as string) || 'business';
              const multiDate = searchedDates.length > 1;
              const liveCash = selectedResults.cashResults.filter(f => f.status !== 'fallback');
              const fallbackCash = selectedResults.cashResults.filter(f => f.status === 'fallback');
              // Best live price per searched date, for the date strip.
              const priceByDate = new Map<string, number>();
              for (const f of liveCash) {
                if (typeof f.price === 'number' && f.price > 0 && f.isLivePrice !== false && f.date) {
                  const cur = priceByDate.get(f.date);
                  if (cur === undefined || f.price < cur) priceByDate.set(f.date, f.price);
                }
              }
              const cheapestDate = [...priceByDate.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
              const sortedLive = [...liveCash]
                .filter(f => !dateFilter || f.date === dateFilter)
                .sort((a, b) => {
                  if (cashSort === 'duration') return parseDurationMin(a.duration) - parseDurationMin(b.duration);
                  if (cashSort === 'departure') return parseTimeMin(a.departureTime) - parseTimeMin(b.departureTime);
                  return (a.price ?? Infinity) - (b.price ?? Infinity);
                });
              const displayCash = [...sortedLive, ...fallbackCash].slice(0, 10);
              return (
              <div style={{ marginBottom: '20px' }}>
                {multiDate && (
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', minWidth: 'max-content', paddingBottom: '2px' }}>
                      <span style={{ fontSize: '10px', color: COLORS.sub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', marginRight: '2px' }}>Dates</span>
                      <button onClick={() => setDateFilter(null)}
                        style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: dateFilter === null ? 600 : 400, padding: '7px 12px', borderRadius: '100px', border: 'none', cursor: 'pointer', background: dateFilter === null ? COLORS.accent : COLORS.card, color: dateFilter === null ? '#fff' : COLORS.sub, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                        All dates
                      </button>
                      {searchedDates.map(d => {
                        const p = priceByDate.get(d);
                        const active = dateFilter === d;
                        return (
                          <button key={d} onClick={() => setDateFilter(active ? null : d)}
                            style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: active ? 600 : 400, padding: '7px 12px', borderRadius: '100px', border: d === cheapestDate && !active ? '1px solid rgba(34,197,94,0.4)' : 'none', cursor: 'pointer', background: active ? COLORS.accent : COLORS.card, color: active ? '#fff' : d === cheapestDate ? '#22C55E' : COLORS.sub, whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                            {fmtDay(d)}{typeof p === 'number' ? ` · ${money(p)}` : ''}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, color: COLORS.text, margin: 0 }}>Cash Fares{dateFilter ? ` — ${fmtDay(dateFilter)}` : ''}</h3>
                  {liveCash.length > 1 && (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: COLORS.sub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: '2px' }}>Sort</span>
                      {([['price', 'Price'], ['duration', 'Fastest'], ['departure', 'Departure']] as const).map(([val, label]) => (
                        <button key={val} onClick={() => setCashSort(val)}
                          style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: cashSort === val ? 600 : 400, padding: '5px 11px', borderRadius: '100px', border: 'none', cursor: 'pointer', background: cashSort === val ? COLORS.accent : COLORS.card, color: cashSort === val ? '#fff' : COLORS.sub, transition: 'all 0.15s' }}>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedResults.cashResults.every(f => f.status === 'fallback') && (
                  <ProviderNotice tone="fallback" title="Live cash fares are not connected yet">
                    These are direct search links to Google Flights and Skyscanner. They are not ranked prices, so TravelCheckpoint is being honest instead of pretending a $0 fare exists.
                  </ProviderNotice>
                )}
                {displayCash.map((f, i) => {
                  const dealBadge = getDealBadge(f.price ?? null);
                  const isFallback = f.status === 'fallback';
                  const href = monetise(isFallback
                    ? f.bookingUrl
                    : gfUrl(f.origin || origin, f.destination || selectedResults.code, f.date || departDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], cabinClass, f.airline));
                  const depTime = formatDep(f.departureTime || '');
                  return (
                  <a key={f.id || i} className="result-card" href={href} target="_blank" rel="noopener noreferrer"
                    aria-label={isFallback ? `Search ${f.route} on ${f.airline}` : `Book ${f.airline} ${f.route} — opens Google Flights`}
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${dealBadge ? 'rgba(34,197,94,0.2)' : COLORS.border}`, borderRadius: '10px', padding: '14px', marginBottom: '8px', animation: `fadeIn 0.3s ease ${Math.min(i, 8) * 0.05}s both` }}>
                    <AirlineLogo airline={f.airline} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: COLORS.text, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {f.airline}
                        {dealBadge && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: dealBadge.bg, color: dealBadge.color }}>{dealBadge.label}</span>}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: COLORS.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {depTime ? `${depTime} · ` : ''}{f.route}{f.duration ? ` · ${f.duration}` : ''} · {f.stops === 0 ? 'Direct' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`}{multiDate && f.date ? ` · ${f.date.slice(5)}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700, color: dealBadge ? '#22C55E' : COLORS.text }}>{typeof f.price === 'number' && f.price > 0 ? money(f.price) : 'Check live'}</div>
                      {typeof f.price === 'number' && f.price > 0 && passengers > 1 && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: COLORS.sub }}>{money((f.price ?? 0) * passengers)} total</div>}
                      <BookCta label={isFallback ? 'Open search' : 'Book'} />
                    </div>
                  </a>
                  );
                })}
              </div>
              );
            })()}

            {/* Award flights */}
            {(flightFilter === 'all' || flightFilter === 'points') && selectedResults && selectedResults.awardResults.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, color: COLORS.text, marginBottom: '10px' }}>Award Seats</h3>
                {selectedResults.awardResults.slice(0, 8).map((f, i) => (
                  <a key={f.id || i} className="result-card" href={awardBookUrl(f.airline, f.origin, f.destination)} target="_blank" rel="noopener noreferrer"
                    aria-label={`Book ${f.airline} award seat via ${f.program}`}
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '14px', marginBottom: '8px', animation: `fadeIn 0.3s ease ${i * 0.05}s both` }}>
                    <AirlineLogo airline={f.airline} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: COLORS.text, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {f.airline} <span style={{ fontSize: '11px', color: COLORS.sub, fontWeight: 400 }}>via {f.program}</span>
                        {(() => {
                          const cpm = bestCash?.price && f.miles > 0 ? ((bestCash.price - f.taxes) / f.miles) * 100 : null;
                          if (!cpm || cpm < 1) return null;
                          const great = cpm >= 1.5;
                          return <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '999px', background: great ? 'rgba(34,197,94,0.15)' : 'rgba(16,185,129,0.12)', color: great ? '#22C55E' : '#10B981' }}>{great ? 'Great value' : 'Good value'} · {cpm.toFixed(1)}¢/mi</span>;
                        })()}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: COLORS.sub }}>{f.date ? `${f.date.slice(5)} · ` : ''}{f.route} · {f.cabin} · {f.seats} seat{f.seats > 1 ? 's' : ''} · {f.isDirect ? 'Direct' : 'Connection'}</div>
                      {f.transferFrom.length > 0 && <div style={{ fontSize: '10px', color: COLORS.accent, marginTop: '2px' }}>Transfer from: {f.transferFrom.join(', ')}</div>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700, color: COLORS.accent }}>{(f.miles / 1000).toFixed(0)}K mi</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: COLORS.sub }}>+{money(f.taxes)} tax</div>
                      <BookCta label={AIRLINE_BOOK_URLS[f.airline] ? 'Book award' : 'Find on seats.aero'} />
                    </div>
                  </a>
                ))}
              </div>
            )}

            {/* Hidden city fares */}
            {(flightFilter === 'all' || flightFilter === 'hidden') && hiddenCity.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, color: COLORS.text, marginBottom: '4px' }}>Hidden City Fares <span style={{ fontSize: '11px', fontWeight: 400, color: COLORS.sub }}>via Skiplagged</span></h3>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: COLORS.sub, marginBottom: '10px' }}>Get off at the layover — often 30-60% cheaper. Carry-on only, no checked bags.</p>
                {hiddenCity.slice(0, 6).map((f, i) => {
                  const hcDate = (f.departure || '').split('T')[0] || departDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
                  return (
                  <a key={i} className="result-card" href={skiplaggedUrl(f.from || origin, f.to || selectedResults?.code || '', hcDate)} target="_blank" rel="noopener noreferrer"
                    aria-label={`Open ${f.from} to ${f.to} hidden-city fare on Skiplagged`}
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '14px', marginBottom: '8px', borderLeft: f.isHiddenCity ? '3px solid #F59E0B' : undefined }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>🎭</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: COLORS.text }}>{f.airline}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: COLORS.sub }}>{f.from}→{f.to}{f.isHiddenCity ? ` (via ${f.actualDestination})` : ''} · {f.duration}h · {f.stops} stop{f.stops !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700, color: COLORS.text }}>{money(f.price)}</div>
                      <BookCta label="Skiplagged" />
                    </div>
                  </a>
                  );
                })}
              </div>
            )}

            {/* Creative routes (Kiwi) */}
            {(flightFilter === 'all' || flightFilter === 'creative') && kiwiResults.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, color: COLORS.text, marginBottom: '4px' }}>Creative Routes <span style={{ fontSize: '11px', fontWeight: 400, color: COLORS.sub }}>via Kiwi.com</span></h3>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: COLORS.sub, marginBottom: '10px' }}>Multi-airline combinations with Kiwi Guarantee — if you miss a connection, they rebook you.</p>
                {kiwiResults.slice(0, 6).map((f, i) => {
                  const kwDate = (f.departure || '').split('T')[0] || departDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
                  return (
                  <a key={i} className="result-card" href={monetise(f.bookingLink || kiwiUrl(f.from || origin, f.to || selectedResults?.code || '', kwDate))} target="_blank" rel="noopener noreferrer"
                    aria-label={`Book ${f.airlines.join(' + ')} ${f.from} to ${f.to} on Kiwi.com`}
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '14px', marginBottom: '8px', borderLeft: f.isVirtualInterline ? `3px solid ${COLORS.accent}` : undefined }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      {f.airlines.slice(0, 2).map((a, j) => <AirlineLogo key={j} airline={a} size={20} />)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: COLORS.text }}>{f.airlines.join(' + ')}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: COLORS.sub }}>{f.from}→{f.to} · {f.duration ? `${Math.floor(f.duration / 60)}h ${f.duration % 60}m` : 'Duration TBC'} · {f.stops} stop{f.stops !== 1 ? 's' : ''}</div>
                      {f.isVirtualInterline && <span style={{ fontSize: '10px', background: '#ECFDF5', color: '#065F46', padding: '1px 6px', borderRadius: '4px' }}>Kiwi Guarantee</span>}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700, color: COLORS.text }}>{money(f.price)}</div>
                      <BookCta label="Book on Kiwi" />
                    </div>
                  </a>
                  );
                })}
              </div>
            )}

            {/* Duffel bookable flights */}
            {(flightFilter === 'all' || flightFilter === 'cash') && duffelResults.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, color: COLORS.text, marginBottom: '4px' }}>Live Airline Fares <span style={{ fontSize: '11px', fontWeight: 400, color: COLORS.sub }}>via Duffel</span></h3>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: COLORS.sub, marginBottom: '10px' }}>Real-time airline prices — tap a fare to book it with the airline.</p>
                {duffelResults.slice(0, 8).map((f, i) => {
                  const dfDate = (f.departure || '').split('T')[0] || departDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
                  return (
                  <a key={f.id || i} className="result-card" href={gfUrl(f.from || origin, f.to || selectedResults?.code || '', dfDate, (parsed?.cabin as string) || 'business', f.airlines[0])} target="_blank" rel="noopener noreferrer"
                    aria-label={`Book ${f.airlines.join(' + ')} ${f.from} to ${f.to} — opens Google Flights`}
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '14px', marginBottom: '8px', borderLeft: `3px solid #6366F1`, animation: `fadeIn 0.3s ease ${i * 0.05}s both` }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      {f.airlines.slice(0, 2).map((a, j) => <AirlineLogo key={j} airline={a} size={20} />)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: COLORS.text }}>{f.airlines.join(' + ')}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: COLORS.sub }}>{f.from}→{f.to} · {fmtDuration(f.duration)} · {f.stops === 0 ? 'Direct' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`}</div>
                      <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.15)', color: '#A5B4FC', padding: '1px 6px', borderRadius: '4px' }}>Live price</span>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 700, color: COLORS.text }}>{moneyFrom(f.price, f.currency || 'USD')}</div>
                      {passengers > 1 && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: COLORS.sub }}>{moneyFrom(f.price * passengers, f.currency || 'USD')} total</div>}
                      <BookCta label="Book" />
                    </div>
                  </a>
                  );
                })}
              </div>
            )}

            {!loading && selectedResults && !selectedResults.loading && !hasAnyFlightResult && (
              <EmptyFlights
                onFlex={() => router.push(`/search?q=${encodeURIComponent(searchInput || q)}&flex=3`)}
                onAnyStops={() => { const base = (searchInput || q).replace(/\b(direct|nonstop|non-stop|no stops?|max \d stops?|one stop|two stops?|\d stops?)\b/gi, '').trim(); router.push(`/search?q=${encodeURIComponent(`${base}, all the options`)}`); }}
              />
            )}

            {(loading || selectedResults?.loading) && (
              <>
                <FlightProgress origin={origin} dest={isMulti ? (parsed?.regionName as string || '···').slice(0, 12).toUpperCase() : (selectedResults?.code || dest0?.code || '···')} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[1, 2, 3].map(i => <div key={i} style={{ background: COLORS.card, borderRadius: '10px', height: '72px', animation: 'shimmer 1.5s infinite' }} />)}
                </div>
              </>
            )}
          </>
        )}

        {/* ═══════════════ STAY TAB ═══════════════ */}
        {mainTab === 'stay' && (() => {
          const stayCity = isMulti
            ? (selectedDest ? (destinations.find(d => d.code === selectedDest)?.city || destCity) : destCity)
            : (parsed?.destinationCity as string || destCity || 'Dubai');
          const stayDate = (parsed?.departDates as string[])?.[0] || (parsed?.departDate as string) || '';
          const stayCheckoutDate = stayDate ? (() => { const d = new Date(`${stayDate}T00:00:00.000Z`); d.setUTCDate(d.getUTCDate() + 3); return d.toISOString().split('T')[0]; })() : '';
          const stayLinks = [
            { name: 'Booking.com', color: '#003580', url: monetise(`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(stayCity)}&checkin=${stayDate}&checkout=${stayCheckoutDate}&group_adults=${passengers}`) },
            { name: 'Expedia', color: '#00355F', url: monetise(`https://www.expedia.com/Hotel-Search?destination=${encodeURIComponent(stayCity)}&startDate=${stayDate}&endDate=${stayCheckoutDate}&adults=${passengers}`) },
            { name: 'Agoda', color: '#5392F9', url: monetise(`https://www.agoda.com/search?city=${encodeURIComponent(stayCity)}&checkIn=${stayDate}&checkOut=${stayCheckoutDate}`) },
            { name: 'Airbnb', color: '#FF5A5F', url: `https://www.airbnb.com/s/${encodeURIComponent(stayCity)}/homes?checkin=${stayDate}&checkout=${stayCheckoutDate}&adults=${passengers}` },
            { name: 'Hotels.com', color: '#D32F2F', url: monetise(`https://www.hotels.com/search.do?q-destination=${encodeURIComponent(stayCity)}&q-check-in=${stayDate}&q-check-out=${stayCheckoutDate}&q-rooms=1&q-room-0-adults=${passengers}`) },
          ];
          return (
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, color: COLORS.text, marginBottom: '4px' }}>Stay in {stayCity}</h3>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: COLORS.sub, marginBottom: '12px' }}>Compare prices across all major platforms</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <StatusPill label={providerStatuses.liteapi === 'live-rates' ? 'live hotel rates' : providerStatuses.liteapi === 'hotel-list-only' ? 'hotel list only' : providerStatuses.liteapi === 'missing-key' ? 'hotel API missing key' : 'hotel links'} tone={providerStatuses.liteapi === 'live-rates' ? 'live' : providerStatuses.liteapi === 'missing-key' ? 'warning' : 'fallback'} />
              <StatusPill label={providerStatuses.rooms === 'live' ? 'points rooms live' : providerStatuses.rooms === 'missing-key' ? 'rooms missing key' : 'points rooms'} tone={providerStatuses.rooms === 'live' ? 'live' : providerStatuses.rooms === 'missing-key' ? 'warning' : 'empty'} />
            </div>
            {providerStatuses.liteapi === 'missing-key' && (
              <ProviderNotice tone="fallback" title="Hotel live rates need LiteAPI credentials">
                I’m showing OTA search links and any available hotel directory data. Once LiteAPI is configured, this section can show live nightly pricing.
              </ProviderNotice>
            )}

            {/* Hotel listings — always show */}
            {liteHotels.length > 0 ? (
              <div style={{ marginBottom: '24px' }}>
                {providerStatuses.liteapi === 'hotel-list-only' && (
                  <ProviderNotice tone="fallback" title="Showing hotel directory data only">
                    These hotel cards are useful for discovery, but rates weren’t returned. Use the compare buttons to check live prices.
                  </ProviderNotice>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                  {liteHotels.slice(0, 10).map((h, i) => {
                    const hotelSearch = encodeURIComponent(h.name + ' ' + stayCity);
                    return (
                    <div key={h.id || i} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: '12px', overflow: 'hidden', animation: `fadeIn 0.3s ease ${i * 0.05}s both` }}>
                      <a href={googleHotelUrl(h.name, stayCity, stayDate, stayCheckoutDate)} target="_blank" rel="noopener noreferrer" aria-label={`View ${h.name} rates on Google Hotels`} style={{ display: 'block', textDecoration: 'none', cursor: 'pointer' }}>
                        {h.image && (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={h.image} alt={h.name} style={{ width: '100%', height: '160px', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </>
                        )}
                        <div style={{ padding: '14px 14px 0' }}>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: COLORS.text, marginBottom: '4px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                            <span>{h.name}</span>
                            <BookCta label="Rates" />
                          </div>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: COLORS.sub, marginBottom: '2px' }}>{h.address}</div>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: COLORS.sub, marginBottom: '10px' }}>
                            {h.stars > 0 && <span>{'★'.repeat(h.stars)}{'☆'.repeat(Math.max(0, 5 - h.stars))}</span>}
                            {h.board && <span style={{ marginLeft: '6px' }}> · {h.board}</span>}
                            {h.freeCancellation && <span style={{ color: '#34D399' }}> · Free cancellation</span>}
                          </div>
                          {typeof h.price === 'number' && h.price > 0 ? (
                            <div style={{ marginBottom: '10px' }}>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: COLORS.text }}>
                                {moneyFrom(h.price, h.currency || 'USD')} <span style={{ fontSize: '11px', fontWeight: 400, color: COLORS.sub }}>/night</span>
                                {h.originalPrice > h.price && <span style={{ fontSize: '12px', color: COLORS.sub, textDecoration: 'line-through', marginLeft: '6px' }}>{moneyFrom(h.originalPrice, h.currency || 'USD')}</span>}
                              </div>
                              {typeof h.totalPrice === 'number' && h.totalPrice > 0 && (
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: COLORS.sub, marginTop: '2px' }}>
                                  {moneyFrom(h.totalPrice, h.currency || 'USD')} total{h.nights ? ` · ${h.nights} night${h.nights > 1 ? 's' : ''}` : ''}{h.roomType && h.roomType !== 'Check rates' ? ` · ${h.roomType.toLowerCase()}` : ''}
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </a>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', padding: '0 14px 14px', alignItems: 'center' }}>
                        {h.offerId && typeof h.price === 'number' && h.price > 0 && (
                          <button onClick={() => {
                            try {
                              window.sessionStorage.setItem('tc_pending_booking', JSON.stringify({
                                offerId: h.offerId, hotel: h.name, city: stayCity, image: h.image,
                                checkin: stayDate, checkout: stayCheckoutDate, adults: passengers,
                                nights: h.nights, price: h.price, totalPrice: h.totalPrice, currency: h.currency, roomType: h.roomType,
                              }));
                            } catch { /* sessionStorage unavailable */ }
                            router.push('/book');
                          }}
                            style={{ fontSize: '12px', fontWeight: 700, color: '#fff', background: COLORS.accent, border: 'none', padding: '7px 16px', borderRadius: '6px', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
                            Book now
                          </button>
                        )}
                        <a href={monetise(`https://www.booking.com/searchresults.html?ss=${hotelSearch}&checkin=${stayDate}&checkout=${stayCheckoutDate}&group_adults=${passengers}`)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', fontWeight: 600, color: '#5392F9', background: 'rgba(83,146,249,0.12)', padding: '6px 11px', borderRadius: '6px', textDecoration: 'none' }}>Booking.com</a>
                        <a href={monetise(`https://www.expedia.com/Hotel-Search?destination=${hotelSearch}&startDate=${stayDate}&endDate=${stayCheckoutDate}&adults=${passengers}`)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', fontWeight: 600, color: '#FBBF24', background: 'rgba(251,191,36,0.12)', padding: '6px 11px', borderRadius: '6px', textDecoration: 'none' }}>Expedia</a>
                        <a href={`https://www.google.com/travel/search?q=${hotelSearch}&checkin=${stayDate}&checkout=${stayCheckoutDate}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', fontWeight: 600, color: '#A78BFA', background: 'rgba(139,92,246,0.12)', padding: '6px 11px', borderRadius: '6px', textDecoration: 'none' }}>Google</a>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            ) : loadingExtra ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                {[1,2,3,4].map(i => <div key={i} style={{ background: COLORS.card, borderRadius: '12px', height: '200px', animation: 'shimmer 1.5s infinite' }} />)}
              </div>
            ) : (
              <>
                <ProviderNotice tone="fallback" title="No live hotel inventory returned">
                  Use these deep links to compare live rates across the major booking platforms for the same city and dates.
                </ProviderNotice>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '24px' }}>
                {stayLinks.map((link) => (
                  <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" style={{
                    background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '20px 16px',
                    textDecoration: 'none', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  }}>
                    <div style={{ width: 40, height: 40, borderRadius: '10px', background: link.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Hotel size={20} color={link.color} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: COLORS.text }}>{link.name}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: COLORS.accent, display: 'flex', alignItems: 'center', gap: '4px' }}>Search <ExternalLink size={10} /></div>
                  </a>
                ))}
                </div>
              </>
            )}

            {/* Hotel points via rooms.aero */}
            {roomResults.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, color: COLORS.text, marginBottom: '4px' }}>Book with Points <span style={{ fontSize: '11px', fontWeight: 400, color: COLORS.sub }}>via rooms.aero</span></h3>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: COLORS.sub, marginBottom: '12px' }}>Use hotel loyalty points — sorted by best value (cents per point).</p>
                {roomResults.slice(0, 8).map((r, i) => (
                  <a key={i} className="result-card" href={googleHotelUrl(r.hotel, r.location || stayCity, stayDate, stayCheckoutDate)} target="_blank" rel="noopener noreferrer"
                    aria-label={`View ${r.hotel} — compare points vs cash rates`}
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '14px', marginBottom: '8px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: COLORS.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Hotel size={18} color={COLORS.accent} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.hotel}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: COLORS.sub }}>{r.chain} · {r.roomType}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: COLORS.accent }}>{(r.pointsPerNight / 1000).toFixed(0)}K pts</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: COLORS.sub }}>vs {money(r.cashRate)}/night</div>
                      {r.centsPerPoint > 0 && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: r.centsPerPoint >= 1 ? '#34D399' : '#FBBF24' }}>{r.centsPerPoint.toFixed(1)}¢/pt</div>}
                    </div>
                  </a>
                ))}
              </div>
            )}

            {currency && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <DollarSign size={16} color={COLORS.accent} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: COLORS.text }}>Currency</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: COLORS.text }}>{currency.display}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: COLORS.sub, marginTop: '2px' }}>{currency.name}</div>
              </div>
            )}
          </div>
          ); })()}

        {/* ═══════════════ EXPLORE TAB ═══════════════ */}
        {mainTab === 'explore' && (
          <div>
            {/* Visa */}
            {visa && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Shield size={16} color={COLORS.accent} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: COLORS.text }}>Visa Requirements</span>
                </div>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px',
                  background: visa.status === 'visa-free' ? '#ECFDF5' : visa.status === 'e-visa' || visa.status === 'visa-on-arrival' ? '#FFF7ED' : '#FEF2F2',
                  color: visa.status === 'visa-free' ? '#065F46' : visa.status === 'visa-required' ? '#991B1B' : '#92400E',
                  fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600,
                }}>
                  {visa.status === 'visa-free' ? '✓ Visa Free' : visa.status === 'visa-on-arrival' ? '⚡ Visa on Arrival' : visa.status === 'e-visa' ? '⚡ e-Visa Required' : '✕ Visa Required'}
                  {visa.days && <span style={{ fontWeight: 400 }}>({visa.days} days)</span>}
                </div>
                {visa.note && <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: COLORS.sub, marginTop: '6px' }}>{visa.note}</div>}
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: COLORS.sub, marginTop: '4px' }}>Passport: {visa.passport} → {visa.destination}</div>
              </div>
            )}

            {/* Currency */}
            {currency && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <DollarSign size={16} color={COLORS.accent} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: COLORS.text }}>Currency</span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: COLORS.text }}>{currency.display}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: COLORS.sub, marginTop: '4px' }}>{currency.name} · Live rate</div>
              </div>
            )}

            {/* Hidden Gems */}
            {gems.length > 0 && (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Sparkles size={16} color={COLORS.accent} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: COLORS.text }}>Hidden Gems</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: COLORS.sub }}>via Atlas Obscura</span>
                </div>
                {gems.map((g, i) => (
                  <div key={i} style={{ padding: '10px 0', borderTop: i > 0 ? `1px solid ${COLORS.card}` : 'none', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '8px', background: COLORS.card, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px' }}>
                      {g.type === 'food' ? '🍜' : g.type === 'nature' ? '🌿' : g.type === 'museum' ? '🎨' : g.type === 'history' ? '🏛' : g.type === 'adventure' ? '⛰' : '🏗'}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: COLORS.text }}>{g.name}</div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: COLORS.sub, lineHeight: 1.4 }}>{g.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Eat & do — restaurants and activities for the destination */}
            {(!isMulti || selectedDest) && (() => {
              const exploreCity = (selectedResults && destinations.find(x => x.code === selectedResults.code)?.city) || (destCity !== 'Multiple Cities' ? destCity : '');
              if (!exploreCity) return null;
              const eatDo = [
                { name: 'OpenTable', desc: 'Book a restaurant', emoji: '🍽️', url: `https://www.opentable.com/s?term=${encodeURIComponent(exploreCity)}${departDate ? `&dateTime=${departDate}T19%3A00` : ''}&covers=${Math.max(2, passengers)}` },
                { name: 'GetYourGuide', desc: 'Tours & experiences', emoji: '🎟️', url: monetise(`https://www.getyourguide.com/s/?q=${encodeURIComponent(exploreCity)}`) },
                { name: 'Viator', desc: 'Activities & day trips', emoji: '🚤', url: monetise(`https://www.viator.com/searchResults/all?text=${encodeURIComponent(exploreCity)}`) },
                { name: 'TripAdvisor', desc: 'Top sights & reviews', emoji: '⭐', url: `https://www.tripadvisor.com/Search?q=${encodeURIComponent(exploreCity)}` },
                { name: 'Google', desc: 'Things to do', emoji: '🧭', url: `https://www.google.com/search?q=${encodeURIComponent(`things to do in ${exploreCity}`)}` },
                { name: 'Resy', desc: 'Fine dining tables', emoji: '🥂', url: `https://resy.com/cities?query=${encodeURIComponent(exploreCity)}` },
              ];
              return (
                <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Compass size={16} color={COLORS.accent} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', fontWeight: 600, color: COLORS.text }}>Eat &amp; Do in {exploreCity}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
                    {eatDo.map(x => (
                      <a key={x.name} className="result-card" href={x.url} target="_blank" rel="noopener noreferrer"
                        style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '12px', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                        <span style={{ fontSize: '18px' }}>{x.emoji}</span>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: COLORS.text }}>{x.name}</span>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: COLORS.sub }}>{x.desc}</span>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Settings hint */}
            <div style={{ background: COLORS.card, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Settings size={16} color={COLORS.sub} />
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 600, color: COLORS.text }}>Your passport: {passport}</div>
                <button onClick={() => router.push('/settings')} style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', color: COLORS.accent, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Change passport & preferences →</button>
              </div>
            </div>

            {!visa && !currency && gems.length === 0 && (
              <div style={{ background: COLORS.card, borderRadius: '12px', padding: '40px', textAlign: 'center', marginTop: '12px' }}>
                <Compass size={32} color={COLORS.sub} style={{ marginBottom: '12px' }} />
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '14px', color: COLORS.sub }}>Search for a specific destination to see visa, currency, and hidden gems</p>
              </div>
            )}
          </div>
        )}
      </div>

      {calendarOpen && (
        <PriceCalendar
          origin={origin}
          dest={selectedResults?.code || dest0?.code || 'LHR'}
          cabin={(parsed?.cabin as string) || 'business'}
          baseDate={departDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]}
          knownPrices={knownPrices}
          symbol={CUR_SYMBOLS[dispCurrency] ?? `${dispCurrency} `}
          rate={fx[dispCurrency] || 1}
          onPick={pickDate}
          onClose={() => setCalendarOpen(false)}
        />
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 0% { opacity: 0.5; } 50% { opacity: 0.8; } 100% { opacity: 0.5; } }
        a.result-card { display: flex; align-items: center; gap: 12px; text-decoration: none; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease; }
        a.result-card:hover { background: rgba(255,255,255,0.07) !important; border-color: rgba(139,92,246,0.45) !important; transform: translateY(-1px); }
        a.result-card:hover .book-cta { color: #A78BFA; }
        a.result-card:hover .book-cta svg { transform: translateX(2px); }
        a.result-card .book-cta svg { transition: transform 0.15s ease; }
        a.result-card:focus-visible { outline: 2px solid #8B5CF6; outline-offset: 2px; }
        a.compare-chip { display: inline-flex; align-items: center; gap: 5px; text-decoration: none; white-space: nowrap; transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease; }
        a.compare-chip:hover { border-color: rgba(139,92,246,0.5) !important; color: #fff !important; background: rgba(139,92,246,0.12) !important; }
        @keyframes flyAcross {
          0% { left: 0; transform: translateY(-50%); }
          50% { transform: translateY(-72%); }
          100% { left: calc(100% - 18px); transform: translateY(-50%); }
        }
        .fly-plane { position: absolute; top: 50%; left: 0; color: #A78BFA; animation: flyAcross 2.1s ease-in-out infinite; filter: drop-shadow(0 0 6px rgba(139,92,246,0.45)); }
      `}</style>
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#06060a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontFamily: 'var(--font-sans)', color: 'rgba(255,255,255,0.4)' }}>Loading...</div></div>}><SearchResults /></Suspense>;
}
