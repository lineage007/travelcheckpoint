'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plane, ArrowRight } from 'lucide-react';

const C = {
  bg: '#FAFAF7', surface: '#F5F3EE', surfaceHover: '#EEEBE4',
  border: '#E0DCD4', text: '#1A1A1A', textSub: '#6B6560', textMuted: '#9C958C',
  accent: '#0D7C72', accentHover: '#0A635B', accentLight: '#E8F5F3',
};

const EXAMPLES = [
  'Dubai to London, business class, tomorrow',
  'UAE to Europe, cheapest, next week',
  'DXB to Bali, 2 people, economy',
  'Dubai to anywhere in Asia, business, flexible',
  'Abu Dhabi to USA, first class, April',
  'UAE to Istanbul, family of 4, April 15',
];

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q) return;
    setLoading(true);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {/* Header */}
      <header style={{
        width: '100%', padding: '16px 24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        maxWidth: 800,
      }}>
        <span style={{ fontFamily: "'Space Grotesk', system-ui", fontSize: 18, letterSpacing: '-0.03em', color: C.text }}>
          <span style={{ fontWeight: 400 }}>Travel</span><span style={{ fontWeight: 700 }}>Checkpoint</span>
        </span>
        <Plane size={18} style={{ color: C.textMuted }} />
      </header>

      {/* Hero */}
      <main style={{
        flex: 1, width: '100%', maxWidth: 640,
        padding: '60px 24px 40px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <h1 style={{
          fontFamily: "'Space Grotesk', system-ui", fontSize: 32, fontWeight: 700,
          color: C.text, letterSpacing: '-0.04em', textAlign: 'center', marginBottom: 8,
        }}>
          Where to?
        </h1>
        <p style={{ fontSize: 15, color: C.textSub, textAlign: 'center', marginBottom: 32, lineHeight: 1.5 }}>
          Type naturally. We search cash fares, award flights, and empty legs — all at once.
        </p>

        {/* Search bar */}
        <div style={{
          width: '100%', position: 'relative',
          background: '#fff', borderRadius: 16,
          border: `1px solid ${C.border}`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          transition: 'all 0.2s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '4px 4px 4px 16px' }}>
            <Search size={18} style={{ color: C.textMuted, flexShrink: 0 }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="Dubai to Europe, business class, next week..."
              autoFocus
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontSize: 15, color: C.text, padding: '14px 12px',
                fontFamily: "'DM Sans', system-ui",
              }}
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              style={{
                background: loading ? C.textMuted : C.accent,
                color: '#fff', border: 'none', borderRadius: 12,
                padding: '12px 20px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 14, fontWeight: 600, flexShrink: 0,
                opacity: !query.trim() ? 0.5 : 1,
                transition: 'all 0.15s',
              }}
            >
              {loading ? 'Searching...' : 'Search'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </div>
        </div>

        {/* Example searches */}
        <div style={{ marginTop: 20, width: '100%' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Try these
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EXAMPLES.map((ex, i) => (
              <button
                key={i}
                onClick={() => { setQuery(ex); handleSearch(ex); }}
                style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                  fontSize: 13, color: C.textSub, transition: 'all 0.15s',
                  fontFamily: "'DM Sans', system-ui",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.surfaceHover; e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSub; }}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Quick searches — each card triggers a real search */}
        <div style={{ marginTop: 48, width: '100%' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
            Quick searches
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {[
              { icon: '💰', title: 'Cheapest This Week', desc: 'Best cash fares from Dubai', query: 'Dubai to anywhere, cheapest, this week' },
              { icon: '✈️', title: 'Award Seats', desc: 'Business on points — all programs', query: 'Dubai to Europe on points, business class' },
              { icon: '🌏', title: 'Asia Explorer', desc: 'Every major city compared', query: 'Dubai to Asia, business, next week, all the options' },
              { icon: '🇺🇸', title: 'USA Routes', desc: 'Direct & connecting options', query: 'Dubai to USA, business, next month, all the options' },
            ].map((item, i) => (
              <button key={i} onClick={() => { setQuery(item.query); handleSearch(item.query); }} style={{
                background: C.surface, borderRadius: 12, padding: '16px',
                border: `1px solid ${C.border}`, cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(13,124,114,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{item.icon}</div>
                  <ArrowRight size={14} style={{ color: C.textMuted, marginTop: 2 }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.4 }}>{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Region shortcuts */}
        <div style={{ marginTop: 24, width: '100%' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Search by region
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: '🇪🇺 Europe', q: 'Dubai to Europe, business, next week' },
              { label: '🌏 SE Asia', q: 'Dubai to Southeast Asia, business, next week' },
              { label: '🇬🇧 UK', q: 'Dubai to UK, business, next week' },
              { label: '🇹🇷 Turkey', q: 'Dubai to Turkey, next week' },
              { label: '🇦🇺 Australia', q: 'Dubai to Australia, business, next month' },
              { label: '🌍 Africa', q: 'Dubai to Africa, business, next week' },
              { label: '🇯🇵 Japan', q: 'Dubai to Tokyo, business, next month' },
              { label: '🏝️ Maldives', q: 'Dubai to Maldives, business, this weekend' },
            ].map((r, i) => (
              <button key={i} onClick={() => { setQuery(r.q); handleSearch(r.q); }} style={{
                background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10,
                padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: C.textSub,
                transition: 'all 0.15s', fontFamily: "'DM Sans', system-ui",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.accentLight; e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSub; }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: '20px 24px', fontSize: 12, color: C.textMuted, textAlign: 'center' }}>
        TravelCheckpoint — personal flight search tool
      </footer>
    </div>
  );
}
