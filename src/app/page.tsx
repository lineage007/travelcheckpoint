'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plane, Building2, TrendingDown, TrendingUp, Minus, Bell, Mic, ChevronRight, ArrowRight, Users, Settings } from 'lucide-react';

const COLORS = {
  bgPage: '#FAFAF7',
  bgSurface: '#F5F3EE',
  bgSurfaceHover: '#EEEBE4',
  border: '#E0DCD4',
  borderStrong: '#D4CFC6',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6560',
  textTertiary: '#9C958C',
  accent: '#0D7C72',
  accentHover: '#0A635B',
  accentLight: '#E8F5F3',
  successBg: '#E8F5E8',
  success: '#3D8B37',
  warningBg: '#FEF4E4',
  warning: '#C4841D',
  dangerBg: '#FCEEE8',
  danger: '#C4462A',
};

const recentSearches = [
  { from: 'DXB', to: 'LHR', date: 'Mar 25', cabin: 'Business', status: 'tracked' },
  { from: 'DXB', to: 'SYD', date: 'Mar 22', cabin: 'Business', status: 'new results' },
  { from: 'DXB', to: 'IST', date: 'Mar 20', cabin: 'Economy', status: null },
];

const priceAlerts = [
  { from: 'DXB', to: 'LHR', price: '$2,140', change: -12 },
  { from: 'DXB', to: 'SYD', price: '$3,870', change: 0 },
  { from: 'DXB', to: 'CDG', price: '$1,920', change: 8 },
];

const emptyLegs = [
  { broker: 'LunaJets', from: 'DXB', to: 'London Luton', aircraft: 'Citation XLS', pax: 8, price: '$4,200', perPerson: '$525', when: 'Apr 2' },
  { broker: 'PrivateFly', from: 'DXB', to: 'Milan Malpensa', aircraft: 'Challenger 350', pax: 10, price: '$6,800', perPerson: '$680', when: 'Apr 5' },
  { broker: 'Victor', from: 'SHJ', to: 'Bahrain', aircraft: 'Phenom 300E', pax: 6, price: '$2,100', perPerson: '$350', when: 'Mar 31' },
];

const chips = ['Cash', 'Points', 'Hidden City', 'Jets', 'Hotels'];

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: active ? COLORS.accent : COLORS.bgPage,
      color: active ? '#fff' : COLORS.textSecondary,
      border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
      borderRadius: 100,
      padding: '8px 18px',
      fontSize: 13,
      fontWeight: 500,
      fontFamily: "'DM Sans', sans-serif",
      cursor: 'pointer',
      transition: 'all 0.18s ease',
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {label}
    </button>
  );
}

function PriceChangePill({ change }: { change: number }) {
  const isDown = change < 0;
  const isFlat = change === 0;
  const bg = isDown ? COLORS.successBg : isFlat ? COLORS.warningBg : COLORS.dangerBg;
  const color = isDown ? COLORS.success : isFlat ? COLORS.warning : COLORS.danger;
  const Icon = isDown ? TrendingDown : isFlat ? Minus : TrendingUp;
  const text = isFlat ? 'stable' : `${Math.abs(change)}%`;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: bg, color: color,
      borderRadius: 100, padding: '4px 10px',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12, fontWeight: 600,
    }}>
      <Icon size={12} /> {text}
    </span>
  );
}

function SectionLabel({ children, right }: { children: React.ReactNode; right?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: 14, marginTop: 36,
    }}>
      <span style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 11, fontWeight: 700,
        color: COLORS.textTertiary,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>{children}</span>
      {right && <span style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13, fontWeight: 600,
        color: COLORS.accent, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 2,
      }}>{right} <ChevronRight size={14} /></span>}
    </div>
  );
}

function Card({ children, delay = 0, leftBorder, style = {} }: { children: React.ReactNode; delay?: number; leftBorder?: boolean; style?: React.CSSProperties }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div style={{
      background: COLORS.bgSurface,
      border: `1px solid ${COLORS.border}`,
      borderLeft: leftBorder ? `3px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      cursor: 'pointer',
      transition: 'all 0.25s ease',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      ...style,
    }}
      onMouseEnter={e => {
        e.currentTarget.style.background = COLORS.bgSurfaceHover;
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(26,26,26,0.05)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = COLORS.bgSurface;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {children}
    </div>
  );
}

export default function TravelCheckpoint() {
  const router = useRouter();
  const [activeChip, setActiveChip] = useState(0);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleSearch = () => {
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const [showMore, setShowMore] = useState(false);

  const handleTab = (i: number) => {
    setActiveTab(i);
    setShowMore(false);
    if (i === 0) {
      // Search — scroll to top & focus search
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => document.getElementById('search-input')?.focus(), 400);
    } else if (i === 1) {
      // Stay — navigate to stays page
      router.push('/stays');
    } else if (i === 2) {
      // Alerts — scroll to alerts section
      document.getElementById('price-alerts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (i === 3) {
      // More — toggle menu
      setShowMore(prev => !prev);
    }
  };

  const tabItems = [
    { icon: Plane, label: 'Search' },
    { icon: Building2, label: 'Stay' },
    { icon: Bell, label: 'Alerts' },
    { icon: Settings, label: 'More' },
  ];

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: COLORS.bgPage,
      minHeight: '100vh',
      maxWidth: 430,
      margin: '0 auto',
      position: 'relative',
      paddingBottom: 90,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: ${COLORS.textTertiary}; font-style: italic; }
        ::-webkit-scrollbar { display: none; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes subtleFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
      `}</style>

      {/* Subtle paper texture overlay */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(13,124,114,0.02) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Header */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px',
        position: 'relative', zIndex: 10,
      }}>
        <span style={{
          fontFamily: "'Space Grotesk', 'DM Sans', sans-serif",
          fontSize: 18,
          letterSpacing: '-0.03em',
          color: COLORS.textPrimary,
        }}>
          <span style={{ fontWeight: 400 }}>Travel</span><span style={{ fontWeight: 700 }}>Checkpoint</span>
        </span>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: COLORS.accentLight,
          border: `2px solid ${COLORS.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: COLORS.accent, fontWeight: 700, fontSize: 14,
          fontFamily: "'Fraunces', serif",
        }}>G</div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '0 20px', position: 'relative', zIndex: 5 }}>

        {/* Hero */}
        <div style={{ marginTop: 40, marginBottom: 28 }}>
          <h1 style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 38, fontWeight: 600,
            color: COLORS.textPrimary,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            animation: 'fadeIn 0.5s ease both',
          }}>
            Where to?
          </h1>
          <p style={{
            marginTop: 10,
            fontSize: 15, lineHeight: 1.5,
            color: COLORS.textSecondary,
            animation: 'fadeIn 0.5s ease 0.1s both',
          }}>
            Search flights, hotels, and private jets in one place.
          </p>
        </div>

        {/* Search Input */}
        <div style={{
          position: 'relative',
          marginBottom: 16,
          animation: 'fadeIn 0.5s ease 0.15s both',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: COLORS.bgSurface,
            border: `1.5px solid ${searchFocused ? COLORS.accent : COLORS.border}`,
            borderRadius: 16,
            padding: '6px 6px 6px 18px',
            transition: 'all 0.2s ease',
            boxShadow: searchFocused ? '0 0 0 3px rgba(13,124,114,0.08)' : 'none',
          }}>
            <Search size={18} color={COLORS.textTertiary} style={{ flexShrink: 0 }} />
            <input
              type="text"
              id="search-input"
              placeholder="Dubai to anywhere..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                padding: '12px 10px',
                fontSize: 16, fontFamily: "'DM Sans', sans-serif",
                color: COLORS.textPrimary,
                outline: 'none', width: '100%',
              }}
            />
            <button style={{
              background: 'transparent', border: `1px solid ${COLORS.border}`,
              borderRadius: 10, padding: '8px 10px',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
              color: COLORS.textTertiary, marginRight: 6,
              transition: 'all 0.15s ease',
            }}>
              <Mic size={16} />
            </button>
            <button
              onClick={handleSearch}
              style={{
                background: COLORS.accent,
                border: 'none', borderRadius: 10,
                padding: '10px 18px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                color: '#fff', fontSize: 14, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.accentHover}
              onMouseLeave={e => e.currentTarget.style.background = COLORS.accent}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto',
          paddingBottom: 4, marginBottom: 8,
          animation: 'fadeIn 0.5s ease 0.2s both',
        }}>
          {chips.map((c, i) => (
            <Chip key={c} label={c} active={activeChip === i} onClick={() => setActiveChip(i)} />
          ))}
        </div>

        {/* Divider */}
        <div style={{
          borderBottom: `1px dashed ${COLORS.border}`,
          margin: '20px 0 0',
        }} />

        {/* Recent Searches */}
        <SectionLabel right="See all">Recent</SectionLabel>
        {recentSearches.map((s, i) => (
          <Card key={i} delay={300 + i * 80} leftBorder={s.status === 'tracked'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 15, fontWeight: 600,
                    color: COLORS.textPrimary,
                  }}>{s.from}</span>
                  <ArrowRight size={14} color={COLORS.textTertiary} />
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 15, fontWeight: 600,
                    color: COLORS.textPrimary,
                  }}>{s.to}</span>
                </div>
                <span style={{
                  fontSize: 13, color: COLORS.textSecondary, marginTop: 4,
                  display: 'block',
                }}>{s.date} · {s.cabin}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {s.status && (
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: s.status === 'new results' ? COLORS.accent : COLORS.textTertiary,
                    background: s.status === 'new results' ? COLORS.accentLight : 'transparent',
                    padding: s.status === 'new results' ? '3px 8px' : 0,
                    borderRadius: 100,
                  }}>{s.status}</span>
                )}
                <ChevronRight size={16} color={COLORS.textTertiary} />
              </div>
            </div>
          </Card>
        ))}

        {/* Price Alerts */}
        <div id="price-alerts" style={{ scrollMarginTop: 20 }} />
        <SectionLabel right="3 active">Price Alerts</SectionLabel>
        {priceAlerts.map((a, i) => (
          <Card key={i} delay={600 + i * 80}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14, fontWeight: 600,
                    color: COLORS.textPrimary,
                  }}>{a.from}</span>
                  <ArrowRight size={12} color={COLORS.textTertiary} />
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14, fontWeight: 600,
                    color: COLORS.textPrimary,
                  }}>{a.to}</span>
                </div>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 18, fontWeight: 700,
                  color: COLORS.textPrimary,
                }}>{a.price}</span>
              </div>
              <PriceChangePill change={a.change} />
            </div>
          </Card>
        ))}

        {/* Empty Legs */}
        <SectionLabel right="3 nearby">Private Jets</SectionLabel>
        {emptyLegs.map((leg, i) => (
          <Card key={i} delay={900 + i * 80}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  color: COLORS.accent,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>{leg.broker}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 15, fontWeight: 600,
                    color: COLORS.textPrimary,
                  }}>{leg.from}</span>
                  <div style={{
                    flex: '0 0 auto',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <div style={{ width: 20, height: 1, background: COLORS.border }} />
                    <Plane size={14} color={COLORS.textTertiary} style={{ transform: 'rotate(45deg)' }} />
                    <div style={{ width: 20, height: 1, background: COLORS.border }} />
                  </div>
                  <span style={{
                    fontSize: 14, fontWeight: 500,
                    color: COLORS.textPrimary,
                  }}>{leg.to}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 18, fontWeight: 700,
                  color: COLORS.textPrimary,
                }}>{leg.price}</span>
                <span style={{
                  display: 'block',
                  fontSize: 11, color: COLORS.textTertiary, marginTop: 2,
                }}>{leg.when}</span>
              </div>
            </div>

            {/* Details row */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingTop: 10, marginTop: 10,
              borderTop: `1px solid ${COLORS.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plane size={12} /> {leg.aircraft}
                </span>
                <span style={{ fontSize: 12, color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={12} /> {leg.pax} pax
                </span>
              </div>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: COLORS.success,
                background: COLORS.successBg,
                padding: '3px 8px',
                borderRadius: 100,
              }}>
                {leg.perPerson}/person
              </span>
            </div>
          </Card>
        ))}

        {/* Spacer for bottom nav */}
        <div style={{ height: 20 }} />
      </main>

      {/* Bottom Navigation — Frosted Glass */}
      <nav style={{
        position: 'fixed',
        bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        background: 'rgba(250, 250, 247, 0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: `1px solid ${COLORS.border}`,
        display: 'flex', justifyContent: 'space-around',
        padding: '10px 0 18px',
        zIndex: 100,
      }}>
        {tabItems.map((tab, i) => {
          const Icon = tab.icon;
          const isActive = activeTab === i;
          return (
            <button key={i} onClick={() => handleTab(i)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '4px 16px',
              transition: 'all 0.15s ease',
            }}>
              <div style={{
                padding: '6px 16px',
                borderRadius: 100,
                background: isActive ? COLORS.accentLight : 'transparent',
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon
                  size={20}
                  color={isActive ? COLORS.accent : COLORS.textTertiary}
                  strokeWidth={isActive ? 2.2 : 1.5}
                />
              </div>
              <span style={{
                fontSize: 11, fontWeight: isActive ? 600 : 500,
                color: isActive ? COLORS.accent : COLORS.textTertiary,
                fontFamily: "'DM Sans', sans-serif",
              }}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
