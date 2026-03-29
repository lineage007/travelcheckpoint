'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plane, Building2, TrendingDown, TrendingUp, Bell, ChevronRight, Zap } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #FAFAF7 0%, #F2EFE8 100%)' }}>
      {/* Header */}
      <header style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
          <span style={{ fontWeight: 400 }}>Travel</span><span style={{ fontWeight: 700 }}>Checkpoint</span>
        </span>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '13px', fontFamily: 'var(--font-display)', fontWeight: 600,
        }}>G</div>
      </header>

      {/* Hero search */}
      <div style={{ padding: '60px 20px 32px', maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 600,
          color: '#C4A265', fontStyle: 'italic', lineHeight: 1.15, marginBottom: '8px',
        }}>
          Where to?
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)',
          marginBottom: '24px', lineHeight: 1.5,
        }}>
          Search flights, hotels, and private jets in one place.
        </p>

        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: 'var(--bg-surface)', border: `1.5px solid ${focused ? 'var(--accent)' : 'var(--border-default)'}`,
            borderRadius: '16px', padding: '18px 20px',
            boxShadow: focused ? '0 0 0 3px rgba(13, 124, 114, 0.1)' : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}>
            <Plane size={18} color="var(--text-tertiary)" strokeWidth={1.5} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Dubai to anywhere..."
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--text-primary)',
              }}
            />
            <button onClick={handleSearch} style={{
              width: '36px', height: '36px', borderRadius: '50%', border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}>
              <Search size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '32px' }}>
          {[
            { label: 'Cash Fares', active: true },
            { label: 'Points' },
            { label: 'Hidden City' },
            { label: 'Private Jets' },
          ].map((chip, i) => (
            <button key={i} style={{
              background: chip.active ? 'var(--accent)' : 'var(--bg-page)',
              color: chip.active ? '#fff' : 'var(--text-secondary)',
              border: chip.active ? 'none' : '1px solid var(--border-default)',
              borderRadius: '100px', padding: '8px 16px', whiteSpace: 'nowrap',
              fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {chip.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px dashed var(--border-default)', marginBottom: '28px' }} />

        {/* Recent searches */}
        <div className="fade-up-1">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
              color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>Recent</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
              See all <ChevronRight size={12} style={{ verticalAlign: 'middle' }} />
            </span>
          </div>

          {[
            { route: 'DXB → LHR', date: 'Mar 25', cabin: 'Business', tag: 'tracked', tagColor: 'var(--accent)' },
            { route: 'DXB → SYD', date: 'Mar 22', cabin: 'Business', tag: 'new results', tagColor: 'var(--status-success)' },
            { route: 'DXB → IST', date: 'Mar 20', cabin: 'Economy' },
          ].map((item, i) => (
            <div key={i} className={`fade-up-${i + 2}`} onClick={() => router.push(`/search?q=${item.route.replace(' → ', ' to ')} ${item.cabin}`)} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              borderLeft: '3px solid var(--accent)', borderRadius: '12px',
              padding: '14px 16px', marginBottom: '10px', cursor: 'pointer',
              transition: 'all 0.2s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{item.route}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{item.date} · {item.cabin}</div>
                </div>
                {item.tag && (
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 600,
                    color: item.tagColor, background: `${item.tagColor}10`,
                    padding: '3px 10px', borderRadius: '100px',
                  }}>{item.tag}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Price alerts */}
        <div className="fade-up-3" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
              color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>Price Alerts</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              <Bell size={12} style={{ verticalAlign: 'middle' }} /> 3 active
            </span>
          </div>

          {[
            { route: 'DXB → LHR', price: '$2,140', change: '↓ 12%', type: 'success' as const },
            { route: 'DXB → CDG', price: '$1,920', change: '↑ 8%', type: 'danger' as const },
            { route: 'DXB → SIN', price: '$980', change: '→ 0%', type: 'warning' as const },
          ].map((alert, i) => (
            <div key={i} className={`fade-up-${i + 3}`} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              borderRadius: '12px', padding: '14px 16px', marginBottom: '10px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{alert.route}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>{alert.price}</div>
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600,
                color: `var(--status-${alert.type})`,
                background: `var(--status-${alert.type}-bg)`,
                padding: '4px 10px', borderRadius: '100px',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}>
                {alert.type === 'success' ? <TrendingDown size={12} /> : alert.type === 'danger' ? <TrendingUp size={12} /> : null}
                {alert.change}
              </span>
            </div>
          ))}
        </div>

        {/* Empty legs */}
        <div className="fade-up-4" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{
              fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700,
              color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>Private Jets Near You</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-tertiary)' }}>3 nearby</span>
          </div>

          {[
            { route: 'DXB → London Luton', aircraft: 'Citation XLS · 8 pax', price: '$4,200', perPerson: '$525/person', time: 'Today 11:00', broker: 'LunaJets' },
            { route: 'DXB → Nice', aircraft: 'Falcon 2000 · 10 pax', price: '$6,800', perPerson: '$680/person', time: 'Tomorrow 09:00', broker: 'PrivateFly' },
          ].map((leg, i) => (
            <div key={i} className={`fade-up-${i + 4}`} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              borderRadius: '12px', padding: '16px', marginBottom: '10px',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Subtle airplane watermark */}
              <div style={{ position: 'absolute', top: '8px', right: '8px', opacity: 0.04 }}>
                <Plane size={48} />
              </div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{leg.route}</div>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '10px' }}>{leg.aircraft}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{leg.price}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '8px' }}>{leg.perPerson}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>{leg.time}</div>
                  <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-tertiary)' }}>via {leg.broker}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Spacer for bottom nav */}
        <div style={{ height: '80px' }} />
      </div>

      {/* Bottom nav — frosted glass */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(250, 250, 247, 0.85)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-default)',
        padding: '8px 0 env(safe-area-inset-bottom, 8px)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        {[
          { icon: <Search size={20} strokeWidth={1.5} />, label: 'Search', active: true, href: '/' },
          { icon: <Building2 size={20} strokeWidth={1.5} />, label: 'Stay', href: '/stays' },
          { icon: <Bell size={20} strokeWidth={1.5} />, label: 'Alerts', href: '/' },
          { icon: <Zap size={20} strokeWidth={1.5} />, label: 'More', href: '/' },
        ].map((item, i) => (
          <button key={i} onClick={() => item.href !== '/' ? router.push(item.href) : null} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: item.active ? 'var(--accent)' : 'var(--text-tertiary)',
            padding: '4px 16px',
          }}>
            {item.icon}
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: item.active ? 600 : 400 }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
