'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

/* ─── Design Tokens ─── */
const T = {
  bg: '#06060a',
  surface: 'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.15)',
  text: '#ffffff',
  textSub: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.3)',
  accent: '#8B5CF6',
  accentSoft: 'rgba(139,92,246,0.15)',
  glass: 'rgba(255,255,255,0.03)',
  glassBorder: 'rgba(255,255,255,0.08)',
};

/* ─── Destination cards ─── */
const destinations = [
  { name: 'London', code: 'LHR', region: 'United Kingdom', price: '342', img: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=400&h=500&fit=crop' },
  { name: 'Istanbul', code: 'IST', region: 'Türkiye', price: '195', img: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400&h=500&fit=crop' },
  { name: 'Bangkok', code: 'BKK', region: 'Thailand', price: '289', img: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&h=500&fit=crop' },
  { name: 'Bali', code: 'DPS', region: 'Indonesia', price: '378', img: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=500&fit=crop' },
  { name: 'Tokyo', code: 'NRT', region: 'Japan', price: '489', img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=500&fit=crop' },
  { name: 'Maldives', code: 'MLE', region: 'Indian Ocean', price: '520', img: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400&h=500&fit=crop' },
  { name: 'Singapore', code: 'SIN', region: 'Southeast Asia', price: '310', img: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=400&h=500&fit=crop' },
  { name: 'Kuala Lumpur', code: 'KUL', region: 'Malaysia', price: '245', img: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=400&h=500&fit=crop' },
];

const quickSearches = [
  { icon: '⚡', title: 'Cheapest This Week', desc: 'Best cash fares departing Dubai', color: '#F59E0B', query: 'Dubai to anywhere, cheapest, this week' },
  { icon: '🏆', title: 'Award Seats', desc: 'Business class on points — all programs', color: '#8B5CF6', query: 'Dubai to Europe on points, business class' },
  { icon: '🌏', title: 'Asia Explorer', desc: 'Every major route compared instantly', color: '#06B6D4', query: 'Dubai to Asia, business, next week, all the options' },
  { icon: '🧭', title: 'Weekend Getaways', desc: 'Short-haul escapes from the UAE', color: '#10B981', query: 'Dubai to nearby, economy, this weekend' },
];

const regions = [
  { name: 'Europe', color: '#8B5CF6' },
  { name: 'SE Asia', color: '#06B6D4' },
  { name: 'United Kingdom', color: '#EF4444' },
  { name: 'Türkiye', color: '#F59E0B' },
  { name: 'Australia', color: '#3B82F6' },
  { name: 'Africa', color: '#10B981' },
  { name: 'Japan', color: '#EC4899' },
  { name: 'Maldives', color: '#06B6D4' },
  { name: 'Americas', color: '#F97316' },
];

const suggestions = [
  'Dubai → London, business, tomorrow',
  'UAE → Europe, cheapest, next week',
  'DXB → Bali, 2 pax, economy',
  'Dubai → anywhere Asia, flexible',
  'Abu Dhabi → USA, first class',
  'UAE → Istanbul, family of 4',
];

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTimeout(() => setLoaded(true), 80); }, []);

  // Typing animation
  useEffect(() => {
    const phrases = ['Dubai to London, business class...', 'Cheapest flight to Bali next week...', 'Award seats to Tokyo on points...', 'Family of 4 to Europe, May...'];
    let pi = 0, ci = 0, del = false, t: ReturnType<typeof setTimeout>;
    const run = () => {
      const p = phrases[pi];
      if (!del) {
        setTypedText(p.slice(0, ci + 1)); ci++;
        if (ci === p.length) { del = true; t = setTimeout(run, 2200); return; }
        t = setTimeout(run, 55 + Math.random() * 35);
      } else {
        setTypedText(p.slice(0, ci)); ci--;
        if (ci === 0) { del = false; pi = (pi + 1) % phrases.length; t = setTimeout(run, 400); return; }
        t = setTimeout(run, 25);
      }
    };
    t = setTimeout(run, 1200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => { const i = setInterval(() => setShowCursor(c => !c), 530); return () => clearInterval(i); }, []);

  const handleSearch = (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q) return;
    setLoading(true);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const sectionTitle = (text: string, delay: number) => (
    <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14, opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(12px)', transition: `all 0.5s ease ${delay}ms` }}>
      {text}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: "'Outfit', 'DM Sans', system-ui, sans-serif", position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        @keyframes meshMove { 0% { transform: translate(0,0) scale(1); } 33% { transform: translate(30px,-50px) scale(1.1); } 66% { transform: translate(-20px,20px) scale(0.95); } 100% { transform: translate(0,0) scale(1); } }
        @keyframes fadeSlideUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0% { background-position:-200% 0; } 100% { background-position:200% 0; } }
        @keyframes pulse { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.5); opacity:0.5; } }
        .hide-scrollbar::-webkit-scrollbar { display:none; }
        .hide-scrollbar { -ms-overflow-style:none; scrollbar-width:none; }
        @media (hover:hover) {
          .dest-card:hover { transform:translateY(-4px) scale(1.02) !important; }
          .dest-card:hover .dest-overlay { opacity:0.85 !important; }
          .quick-card:hover { transform:translateY(-2px) !important; border-color:rgba(255,255,255,0.15) !important; }
          .region-pill:hover { transform:translateY(-1px) !important; }
        }
      `}</style>

      {/* Mesh gradient background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: '60vw', height: '60vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', top: '-20%', left: '-10%', animation: 'meshMove 20s ease-in-out infinite', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)', bottom: '-15%', right: '-10%', animation: 'meshMove 25s ease-in-out infinite reverse', filter: 'blur(80px)' }} />
        <div style={{ position: 'absolute', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)', top: '40%', left: '50%', animation: 'meshMove 22s ease-in-out infinite 5s', filter: 'blur(80px)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto', padding: '0 20px' }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0', opacity: loaded ? 1 : 0, transition: 'opacity 0.5s' }}>
          <div style={{ flex: 1 }} />
          <span style={{ fontWeight: 600, fontSize: 20, letterSpacing: '-0.02em', textAlign: 'center' }}>
            <span style={{ fontWeight: 300, opacity: 0.7 }}>Travel</span>Checkpoint
          </span>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => router.push('/settings')} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textSub, fontSize: 14 }}>⚙</button>
          </div>
        </header>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '48px 0 36px', opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(20px)', transition: 'all 0.6s ease 100ms' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: T.accentSoft, borderRadius: 100, padding: '5px 14px', marginBottom: 20, fontSize: 12, color: T.accent, fontWeight: 500 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', animation: 'pulse 2s infinite' }} />
            Searching 12+ loyalty programs & all airlines
          </div>
          <h1 style={{ fontSize: 38, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 10, lineHeight: 1.1 }}>
            Where to next?
          </h1>
          <p style={{ fontSize: 16, color: T.textSub, lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
            Type naturally. We compare cash fares, award flights, and creative routes — all at once.
          </p>
        </div>

        {/* Search bar */}
        <div style={{ opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(16px)', transition: 'all 0.5s ease 200ms' }}>
          <div style={{ position: 'relative', borderRadius: 18, padding: 2, background: focused ? 'linear-gradient(135deg, #f97316, #ec4899, #8B5CF6)' : 'linear-gradient(135deg, rgba(249,115,22,0.5), rgba(236,72,153,0.5), rgba(139,92,246,0.5))', transition: 'all 0.3s' }}>
          <div
            onClick={() => inputRef.current?.focus()}
            style={{
              background: focused ? 'rgba(15,15,20,0.95)' : 'rgba(15,15,20,0.9)',
              borderRadius: 16, padding: '4px 4px 4px 18px',
              display: 'flex', alignItems: 'center',
              boxShadow: focused ? '0 0 40px rgba(249,115,22,0.15), 0 0 80px rgba(236,72,153,0.1)' : '0 4px 24px rgba(0,0,0,0.2)',
              transition: 'all 0.3s',
              cursor: 'text',
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={focused ? T.accent : T.textMuted} strokeWidth={2}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: T.text, padding: '14px 12px', fontFamily: 'inherit' }}
              />
              {!query && !focused && (
                <div style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', fontSize: 15, color: T.textMuted, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                  {typedText}<span style={{ opacity: showCursor ? 1 : 0, transition: 'opacity 0.1s' }}>|</span>
                </div>
              )}
            </div>
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              style={{
                background: query.trim() ? T.accent : 'rgba(255,255,255,0.08)',
                color: '#fff', border: 'none', borderRadius: 12,
                padding: '12px 22px', cursor: query.trim() ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 14, fontWeight: 600, flexShrink: 0,
                opacity: !query.trim() ? 0.4 : 1,
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'Searching...' : 'Search'}
              {!loading && <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>}
            </button>
          </div>
          </div>

          {/* Suggestions */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14, justifyContent: 'center' }}>
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => { setQuery(s.replace(/→/g, 'to')); handleSearch(s.replace(/→/g, 'to')); }}
                style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 100, padding: '6px 14px', cursor: 'pointer', fontSize: 12, color: T.textSub, fontFamily: 'inherit', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSub; }}
              >{s}</button>
            ))}
          </div>
        </div>

        {/* Destination cards — horizontal scroll */}
        <div style={{ marginTop: 48, opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(16px)', transition: 'all 0.5s ease 400ms' }}>
          {sectionTitle('Popular from Dubai', 400)}
          <div ref={scrollRef} className="hide-scrollbar" style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollSnapType: 'x mandatory' }}>
            {destinations.map((d, i) => (
              <button key={i} className="dest-card" onClick={() => { setQuery(`Dubai to ${d.name}, business, next week`); handleSearch(`Dubai to ${d.name}, business, next week`); }}
                style={{ flex: '0 0 160px', height: 200, borderRadius: 16, position: 'relative', overflow: 'hidden', cursor: 'pointer', border: 'none', background: '#1a1a2e', scrollSnapAlign: 'start', transition: 'all 0.3s', textAlign: 'left' }}>
                <img src={d.img} alt={d.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                <div className="dest-overlay" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, transparent 65%)', transition: 'opacity 0.3s' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, zIndex: 1, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2, color: '#fff' }}>{d.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{d.region}</div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>from</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>${d.price}</span>
                  </div>
                </div>
                <div className="dest-arrow" style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transform: 'translateX(-4px)', transition: 'all 0.3s', backdropFilter: 'blur(8px)' }}>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick searches */}
        <div style={{ marginTop: 36, opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(16px)', transition: 'all 0.5s ease 500ms' }}>
          {sectionTitle('Quick searches', 500)}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {quickSearches.map((qs, i) => (
              <button key={i} className="quick-card" onClick={() => { setQuery(qs.query); handleSearch(qs.query); }}
                style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 20 }}>{qs.icon}</span>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={T.textMuted} strokeWidth={2}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 2 }}>{qs.title}</div>
                  <div style={{ fontSize: 11, color: T.textSub, lineHeight: 1.4 }}>{qs.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Regions */}
        <div style={{ marginTop: 36, opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(16px)', transition: 'all 0.5s ease 600ms' }}>
          {sectionTitle('Search by region', 600)}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {regions.map((r, i) => (
              <button key={i} className="region-pill" onClick={() => { const q = `Dubai to ${r.name}, business, next week`; setQuery(q); handleSearch(q); }}
                style={{ background: `${r.color}15`, border: `1px solid ${r.color}30`, borderRadius: 100, padding: '7px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: r.color, fontFamily: 'inherit', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = `${r.color}25`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = `${r.color}15`; e.currentTarget.style.transform = 'none'; }}
              >{r.name}</button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '48px 0 24px', fontSize: 12, color: T.textMuted }}>
          TravelCheckpoint — personal flight intelligence
        </footer>
      </div>
    </div>
  );
}
