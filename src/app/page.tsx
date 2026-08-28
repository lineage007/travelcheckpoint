'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Clock3,
  Compass,
  History,
  Hotel,
  MapPin,
  Plane,
  Search,
  Settings,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';

const T = {
  bg: '#071015',
  ink: '#0b171d',
  panel: 'rgba(247, 251, 248, 0.06)',
  panelStrong: 'rgba(247, 251, 248, 0.1)',
  border: 'rgba(222, 232, 225, 0.12)',
  borderStrong: 'rgba(222, 232, 225, 0.24)',
  text: '#f7fbf8',
  sub: 'rgba(247, 251, 248, 0.64)',
  muted: 'rgba(247, 251, 248, 0.4)',
  accent: '#35c6ad',
  accentDark: '#123c36',
  amber: '#d7b46a',
  runway: '#e9efe8',
};

const HOME_AIRPORTS = [
  { code: 'DXB', name: 'Dubai' },
  { code: 'AUH', name: 'Abu Dhabi' },
  { code: 'IST', name: 'Istanbul' },
  { code: 'ADB', name: 'Izmir' },
  { code: 'MEL', name: 'Melbourne' },
  { code: 'SYD', name: 'Sydney' },
  { code: 'LHR', name: 'London' },
  { code: 'SIN', name: 'Singapore' },
  { code: 'KUL', name: 'Kuala Lumpur' },
  { code: 'JFK', name: 'New York' },
];

const destinations = [
  { name: 'Istanbul', code: 'IST', region: 'Turkiye', img: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=760&h=920&fit=crop' },
  { name: 'Izmir', code: 'ADB', region: 'Turkiye', img: 'https://images.unsplash.com/photo-1586016413664-864c0dd76f53?w=760&h=920&fit=crop' },
  { name: 'London', code: 'LHR', region: 'United Kingdom', img: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=760&h=920&fit=crop' },
  { name: 'Bali', code: 'DPS', region: 'Indonesia', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=760&h=920&fit=crop' },
  { name: 'Tokyo', code: 'NRT', region: 'Japan', img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=760&h=920&fit=crop' },
  { name: 'Singapore', code: 'SIN', region: 'Southeast Asia', img: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=760&h=920&fit=crop' },
];

const regions = ['Europe', 'SE Asia', 'United Kingdom', 'Turkiye', 'Australia', 'Japan', 'Maldives', 'Americas'];

type QuickSearch = {
  title: string;
  desc: string;
  tone: string;
  icon: typeof Sparkles;
  query: (origin: string) => string;
};

const quickSearches: QuickSearch[] = [
  {
    title: 'Cheapest window',
    desc: 'Scan flexible dates for the cleanest cash fare.',
    tone: '#35c6ad',
    icon: CalendarDays,
    query: origin => `${origin} to Europe, cheapest, next week, economy`,
  },
  {
    title: 'Points seats',
    desc: 'Business class award space across the major programs.',
    tone: '#d7b46a',
    icon: Ticket,
    query: origin => `${origin} to Europe on points, business class`,
  },
  {
    title: 'Family trip',
    desc: 'Six passenger searches with hotels and visa context.',
    tone: '#8dd3ff',
    icon: Users,
    query: origin => `${origin} to Istanbul, family of 6, economy, next week`,
  },
  {
    title: 'Weekend escape',
    desc: 'Short-haul routes that make sense from your airport.',
    tone: '#f59e7d',
    icon: Compass,
    query: origin => `${origin} to nearby, economy, this weekend`,
  },
];

const suggestionTemplates = [
  '{origin} to Izmir from Istanbul next week',
  '{origin} to London, business, tomorrow',
  '{origin} to Bali, 2 pax, economy',
  '{origin} to anywhere Asia, flexible',
  'to Izmir from Istanbul next week',
  '{origin} to Maldives, 4 people, next month',
];

export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pax, setPax] = useState(1);
  const [homeAirport, setHomeAirport] = useState(() => {
    if (typeof window === 'undefined') return 'DXB';
    return window.localStorage.getItem('tc_home_airport') || 'DXB';
  });
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const storedRecent = JSON.parse(window.localStorage.getItem('tc_recent_searches') || '[]');
      return Array.isArray(storedRecent) ? storedRecent.filter((s): s is string => typeof s === 'string').slice(0, 5) : [];
    } catch {
      return [];
    }
  });
  const [savedSearches] = useState<{ q: string; savedAt: string }[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const storedSaved = JSON.parse(window.localStorage.getItem('tc_saved_searches') || '[]');
      return Array.isArray(storedSaved) ? storedSaved.filter((s): s is { q: string; savedAt: string } => s && typeof s.q === 'string').slice(0, 4) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setLoaded(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const suggestions = useMemo(
    () => suggestionTemplates.map(s => s.replace('{origin}', homeAirport)),
    [homeAirport],
  );

  const originName = HOME_AIRPORTS.find(a => a.code === homeAirport)?.name || homeAirport;

  const setOrigin = (code: string) => {
    setHomeAirport(code);
    try {
      window.localStorage.setItem('tc_home_airport', code);
    } catch {
      // Ignore private-mode storage failures.
    }
  };

  const handleSearch = (searchQuery?: string) => {
    let q = (searchQuery || query).trim();
    if (!q) return;
    if (pax > 1 && !/\d+\s*(people|person|pax|passengers?|adults?|family of \d)/i.test(q)) {
      q = `${q}, ${pax} people`;
    }
    try {
      window.localStorage.setItem('tc_home_airport', homeAirport);
      const next = [q, ...recentSearches.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 6);
      window.localStorage.setItem('tc_recent_searches', JSON.stringify(next));
      setRecentSearches(next);
    } catch {
      // Search should still work if storage is unavailable.
    }
    setLoading(true);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const clearRecent = () => {
    try {
      window.localStorage.removeItem('tc_recent_searches');
    } catch {
      // Ignore.
    }
    setRecentSearches([]);
  };

  return (
    <main className="tc-home" style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: 'var(--font-body)', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        .tc-home::before {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(115deg, rgba(7,16,21,0.94) 0%, rgba(7,16,21,0.78) 48%, rgba(7,16,21,0.96) 100%),
            url("https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=2200&auto=format&fit=crop") center/cover;
          filter: saturate(0.86);
        }
        .tc-home::after {
          content: "";
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.11;
          background-image: radial-gradient(rgba(247,251,248,0.7) 0.65px, transparent 0.65px);
          background-size: 4px 4px;
          mix-blend-mode: soft-light;
        }
        .tc-shell { position: relative; z-index: 1; width: min(1180px, calc(100vw - 32px)); margin: 0 auto; }
        .tc-grid > * { min-width: 0; }
        .tc-nav-button, .tc-icon-button, .tc-chip, .tc-quick, .tc-dest, .tc-history-row, .tc-primary { transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, color 180ms ease, opacity 180ms ease; }
        .tc-nav-button:hover, .tc-icon-button:hover, .tc-chip:hover, .tc-quick:hover, .tc-history-row:hover { transform: translateY(-1px); border-color: ${T.borderStrong} !important; background: ${T.panelStrong} !important; }
        .tc-primary:hover:not(:disabled) { transform: translateY(-1px); background: #43d7c0 !important; }
        .tc-primary:active:not(:disabled), .tc-chip:active, .tc-quick:active, .tc-dest:active { transform: translateY(1px) scale(0.99); }
        .tc-dest:hover { transform: translateY(-3px); }
        .tc-dest:hover img { transform: scale(1.04); }
        .tc-dest img { transition: transform 420ms ease; }
        .tc-hide-scrollbar::-webkit-scrollbar { display: none; }
        .tc-hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media (max-width: 860px) {
          .tc-grid { grid-template-columns: 1fr !important; }
          .tc-grid > * { min-width: 0 !important; }
          .tc-hero { padding-top: 22px !important; }
          .tc-search-panel { padding: 14px !important; border-radius: 18px !important; }
          .tc-search-row { grid-template-columns: 1fr !important; }
          .tc-primary { width: 100%; justify-content: center; }
          .tc-side-panel { display: none; }
          .tc-home-copy { max-width: 100% !important; overflow-wrap: anywhere; }
        }
      `}</style>

      <div className="tc-shell">
        <header style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <button
            onClick={() => router.push('/history')}
            className="tc-nav-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.panel, border: `1px solid ${T.border}`, color: T.sub, borderRadius: 12, padding: '9px 12px', cursor: 'pointer', font: '600 13px var(--font-sans)' }}
          >
            <History size={16} />
            History
          </button>
          <button
            onClick={() => router.push('/')}
            style={{ border: 'none', background: 'transparent', color: T.text, cursor: 'pointer', font: '700 22px var(--font-display)', letterSpacing: '-0.02em' }}
          >
            <span style={{ fontWeight: 500, color: T.sub }}>Travel</span>Checkpoint
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="tc-icon-button"
            aria-label="Settings"
            style={{ width: 40, height: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: T.panel, border: `1px solid ${T.border}`, color: T.sub, borderRadius: 12, cursor: 'pointer' }}
          >
            <Settings size={17} />
          </button>
        </header>

        <section className="tc-hero" style={{ padding: '44px 0 56px' }}>
          <div className="tc-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.08fr) minmax(320px, 0.82fr)', gap: 24, alignItems: 'stretch' }}>
            <div>
              <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(12px)', transition: 'all 520ms ease' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: T.amber, background: 'rgba(215,180,106,0.12)', border: '1px solid rgba(215,180,106,0.2)', borderRadius: 999, padding: '7px 12px', font: '700 12px var(--font-sans)' }}>
                  <Bell size={14} />
                  Live fares, points, hotels and trip checks
                </div>
                <h1 style={{ font: '700 clamp(44px, 8vw, 82px)/0.96 var(--font-display)', letterSpacing: '-0.035em', margin: '22px 0 16px', textWrap: 'balance' }}>
                  Search travel like you speak.
                </h1>
                <p className="tc-home-copy" style={{ maxWidth: 610, color: T.sub, font: '400 18px/1.55 var(--font-sans)' }}>
                  Set your airport once, type the trip naturally, then compare cash fares, award seats, hotels and destination checks in one flow.
                </p>
              </div>

              <div
                className="tc-search-panel"
                style={{
                  marginTop: 28,
                  padding: 18,
                  borderRadius: 22,
                  background: 'linear-gradient(180deg, rgba(247,251,248,0.11), rgba(247,251,248,0.055))',
                  border: `1px solid ${focused ? 'rgba(53,198,173,0.48)' : T.border}`,
                  boxShadow: focused ? '0 24px 80px rgba(53,198,173,0.16)' : '0 24px 80px rgba(0,0,0,0.28)',
                  backdropFilter: 'blur(22px)',
                  opacity: loaded ? 1 : 0,
                  transform: loaded ? 'none' : 'translateY(18px)',
                  transition: 'all 520ms ease 90ms',
                }}
              >
                <div className="tc-search-row" style={{ display: 'grid', gridTemplateColumns: '160px minmax(0, 1fr) auto', gap: 10, alignItems: 'stretch' }}>
                  <label style={{ display: 'grid', gap: 7 }}>
                    <span style={{ color: T.muted, font: '700 11px var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>From</span>
                    <span style={{ position: 'relative', display: 'block' }}>
                      <MapPin size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.accent, pointerEvents: 'none' }} />
                      <select
                        value={homeAirport}
                        onChange={e => setOrigin(e.target.value)}
                        aria-label="Home airport"
                        style={{ width: '100%', height: 48, appearance: 'none', border: `1px solid ${T.border}`, borderRadius: 12, background: 'rgba(7,16,21,0.72)', color: T.text, padding: '0 32px 0 35px', outline: 'none', font: '800 13px var(--font-mono)', cursor: 'pointer' }}
                      >
                        {HOME_AIRPORTS.map(a => <option key={a.code} value={a.code} style={{ background: '#102027' }}>{a.code} - {a.name}</option>)}
                      </select>
                    </span>
                  </label>

                  <label style={{ display: 'grid', gap: 7, minWidth: 0 }}>
                    <span style={{ color: T.muted, font: '700 11px var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Trip prompt</span>
                    <span style={{ position: 'relative', display: 'block' }}>
                      <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused ? T.accent : T.muted, pointerEvents: 'none' }} />
                      <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                        placeholder={`Example: ${homeAirport} to Izmir next week`}
                        style={{ width: '100%', height: 48, border: `1px solid ${T.border}`, borderRadius: 12, background: 'rgba(7,16,21,0.72)', color: T.text, padding: '0 14px 0 42px', outline: 'none', font: '500 15px var(--font-sans)' }}
                      />
                    </span>
                  </label>

                  <button
                    onClick={() => handleSearch()}
                    disabled={loading || !query.trim()}
                    className="tc-primary"
                    style={{ alignSelf: 'end', height: 48, display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', borderRadius: 12, padding: '0 18px', background: query.trim() ? T.accent : 'rgba(247,251,248,0.12)', color: query.trim() ? '#04130f' : T.muted, cursor: query.trim() ? 'pointer' : 'default', font: '800 14px var(--font-sans)' }}
                  >
                    {loading ? 'Searching' : 'Search'}
                    <ArrowRight size={17} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(7,16,21,0.55)', border: `1px solid ${T.border}`, borderRadius: 999, padding: '5px 7px 5px 10px' }}>
                    <Users size={14} color={T.sub} />
                    <span style={{ font: '700 12px var(--font-sans)', color: T.sub }}>Pax</span>
                    <button onClick={() => setPax(p => Math.max(1, p - 1))} aria-label="Decrease passengers" style={{ width: 25, height: 25, border: 'none', borderRadius: 999, background: T.panel, color: T.text, cursor: 'pointer' }}>-</button>
                    <span style={{ minWidth: 16, textAlign: 'center', color: T.text, font: '800 13px var(--font-mono)' }}>{pax}</span>
                    <button onClick={() => setPax(p => Math.min(9, p + 1))} aria-label="Increase passengers" style={{ width: 25, height: 25, border: 'none', borderRadius: 999, background: T.panel, color: T.text, cursor: 'pointer' }}>+</button>
                  </div>
                  <span style={{ color: T.muted, font: '500 12px var(--font-sans)' }}>Default origin: {originName}. Change it here or in Settings.</span>
                </div>

                <div className="tc-hide-scrollbar" style={{ display: 'flex', gap: 8, marginTop: 14, overflowX: 'auto', paddingBottom: 2 }}>
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => { setQuery(s); handleSearch(s); }}
                      className="tc-chip"
                      style={{ flex: '0 0 auto', border: `1px solid ${T.border}`, borderRadius: 999, background: 'rgba(7,16,21,0.55)', color: T.sub, padding: '8px 12px', cursor: 'pointer', font: '600 12px var(--font-sans)' }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <aside className="tc-side-panel" style={{ minHeight: 620, borderRadius: 24, overflow: 'hidden', border: `1px solid ${T.border}`, background: T.ink, position: 'relative', boxShadow: '0 30px 90px rgba(0,0,0,0.34)', opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(18px)', transition: 'all 520ms ease 160ms' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1100&auto=format&fit=crop" alt="Coastal destination from above" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,16,21,0.12), rgba(7,16,21,0.92))' }} />
              <div style={{ position: 'absolute', left: 18, right: 18, bottom: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                  {[
                    ['Cash', 'Live'],
                    ['Points', 'Awards'],
                    ['Stay', 'Hotels'],
                  ].map(([top, bottom]) => (
                    <div key={top} style={{ background: 'rgba(7,16,21,0.62)', border: `1px solid ${T.border}`, borderRadius: 14, padding: 12, backdropFilter: 'blur(12px)' }}>
                      <div style={{ color: T.text, font: '800 18px var(--font-display)' }}>{top}</div>
                      <div style={{ color: T.sub, font: '600 11px var(--font-sans)' }}>{bottom}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(7,16,21,0.72)', border: `1px solid ${T.border}`, borderRadius: 16, padding: 16, backdropFilter: 'blur(12px)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                    <Plane size={17} color={T.accent} />
                    <span style={{ color: T.text, font: '800 14px var(--font-sans)' }}>Built for natural routing</span>
                  </div>
                  <p style={{ margin: 0, color: T.sub, font: '400 13px/1.45 var(--font-sans)' }}>
                    Destination-only prompts use your home airport. Explicit wording like &quot;to Izmir from Istanbul&quot; now respects the origin.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {(recentSearches.length > 0 || savedSearches.length > 0) && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 30 }}>
            {recentSearches.length > 0 && (
              <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 18, padding: 14, backdropFilter: 'blur(16px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ color: T.text, font: '800 13px var(--font-sans)' }}>Recent searches</span>
                  <button onClick={clearRecent} style={{ border: 'none', background: 'transparent', color: T.muted, cursor: 'pointer', font: '700 12px var(--font-sans)' }}>Clear</button>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {recentSearches.map(s => (
                    <button key={s} onClick={() => handleSearch(s)} className="tc-history-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', textAlign: 'left', border: `1px solid ${T.border}`, borderRadius: 12, background: 'rgba(7,16,21,0.38)', color: T.sub, padding: '10px 11px', cursor: 'pointer', font: '600 13px var(--font-sans)' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s}</span>
                      <Clock3 size={14} color={T.accent} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {savedSearches.length > 0 && (
              <div style={{ background: 'rgba(215,180,106,0.08)', border: '1px solid rgba(215,180,106,0.18)', borderRadius: 18, padding: 14, backdropFilter: 'blur(16px)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ color: T.text, font: '800 13px var(--font-sans)' }}>Saved searches</span>
                  <button onClick={() => router.push('/settings')} style={{ border: 'none', background: 'transparent', color: T.amber, cursor: 'pointer', font: '700 12px var(--font-sans)' }}>Manage</button>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {savedSearches.map(s => (
                    <button key={s.q} onClick={() => handleSearch(s.q)} className="tc-history-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', textAlign: 'left', border: '1px solid rgba(215,180,106,0.18)', borderRadius: 12, background: 'rgba(7,16,21,0.35)', color: T.text, padding: '10px 11px', cursor: 'pointer', font: '600 13px var(--font-sans)' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.q}</span>
                      <Bell size={14} color={T.amber} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 34 }}>
          {quickSearches.map(item => {
            const Icon = item.icon;
            const q = item.query(homeAirport);
            return (
              <button key={item.title} onClick={() => { setQuery(q); handleSearch(q); }} className="tc-quick" style={{ minHeight: 132, textAlign: 'left', border: `1px solid ${T.border}`, borderRadius: 18, background: T.panel, color: T.text, padding: 16, cursor: 'pointer', backdropFilter: 'blur(16px)' }}>
                <span style={{ width: 38, height: 38, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: `${item.tone}1f`, color: item.tone, marginBottom: 14 }}>
                  <Icon size={19} />
                </span>
                <span style={{ display: 'block', font: '800 15px var(--font-sans)', marginBottom: 5 }}>{item.title}</span>
                <span style={{ display: 'block', color: T.sub, font: '400 12px/1.45 var(--font-sans)' }}>{item.desc}</span>
              </button>
            );
          })}
        </section>

        <section style={{ marginBottom: 34 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 18, marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: 0, color: T.text, font: '800 22px/1.1 var(--font-display)', letterSpacing: '-0.02em' }}>Popular routes from {homeAirport}</h2>
              <p style={{ margin: '5px 0 0', color: T.muted, font: '500 13px var(--font-sans)' }}>Tap a destination to run a live business-class search.</p>
            </div>
          </div>
          <div className="tc-hide-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: 8 }}>
            {destinations.map(d => {
              const q = `${homeAirport} to ${d.name}, business, next week`;
              return (
                <button key={d.code} onClick={() => { setQuery(q); handleSearch(q); }} className="tc-dest" style={{ flex: '0 0 186px', height: 232, border: `1px solid ${T.border}`, borderRadius: 18, overflow: 'hidden', position: 'relative', textAlign: 'left', background: T.ink, cursor: 'pointer', scrollSnapAlign: 'start' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.img} alt={d.name} loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,16,21,0.05), rgba(7,16,21,0.88))' }} />
                  <span style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>
                    <span style={{ display: 'block', color: T.text, font: '800 18px var(--font-display)' }}>{d.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.sub, font: '600 12px var(--font-sans)', marginTop: 3 }}>
                      <span>{d.code}</span>
                      <span style={{ opacity: 0.5 }}>-</span>
                      <span>{d.region}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 40 }}>
          {regions.map(r => {
            const q = `${homeAirport} to ${r}, business, next week`;
            return (
              <button key={r} onClick={() => { setQuery(q); handleSearch(q); }} className="tc-chip" style={{ border: `1px solid ${T.border}`, borderRadius: 999, background: 'rgba(247,251,248,0.055)', color: T.sub, padding: '8px 13px', cursor: 'pointer', font: '700 12px var(--font-sans)' }}>
                {r}
              </button>
            );
          })}
          <a href="/stays" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: `1px solid ${T.border}`, borderRadius: 999, background: 'rgba(247,251,248,0.055)', color: T.sub, padding: '8px 13px', textDecoration: 'none', font: '700 12px var(--font-sans)' }}>
            <Hotel size={14} />
            Stays
          </a>
        </section>
      </div>
    </main>
  );
}
