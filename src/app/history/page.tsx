'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Trash2, ExternalLink } from 'lucide-react';

const C = {
  bg: '#06060a',
  card: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.06)',
  accent: '#8B5CF6',
  text: '#ffffff',
  sub: 'rgba(255,255,255,0.4)',
  muted: 'rgba(255,255,255,0.2)',
};

interface HistoryEntry {
  q: string;
  searchedAt: string;
  bestCash: number | null;
  bestAward: number | null;
  origin: string;
  destination: string;
  cabin: string;
  passengers: number;
}

interface LiveCheck {
  cash: number | null;
  award: number | null;
  loading: boolean;
  checked: boolean;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function priceDelta(orig: number | null, cur: number | null): { label: string; color: string } | null {
  if (orig === null || cur === null || orig === 0) return null;
  const pct = ((cur - orig) / orig) * 100;
  if (Math.abs(pct) < 2) return null;
  const down = pct < 0;
  return {
    label: `${down ? '' : '+'}${pct.toFixed(0)}%`,
    color: down ? '#22C55E' : '#EF4444',
  };
}

export default function HistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [liveChecks, setLiveChecks] = useState<Record<string, LiveCheck>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('tc_search_history');
      if (raw) {
        const parsed: HistoryEntry[] = JSON.parse(raw);
        if (Array.isArray(parsed)) setEntries(parsed);
      }
    } catch { /* corrupt storage */ }
  }, []);

  const removeEntry = (q: string) => {
    const next = entries.filter(e => e.q !== q);
    setEntries(next);
    try {
      window.localStorage.setItem('tc_search_history', JSON.stringify(next));
    } catch { /* */ }
  };

  const clearAll = () => {
    setEntries([]);
    try {
      window.localStorage.removeItem('tc_search_history');
    } catch { /* */ }
  };

  const recheck = async (entry: HistoryEntry) => {
    const key = entry.q;
    setLiveChecks(prev => ({ ...prev, [key]: { cash: null, award: null, loading: true, checked: false } }));
    try {
      const date = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const res = await fetch(
        `/api/search?origin=${entry.origin}&destination=${entry.destination}&cabin=${entry.cabin}&date=${date}&passengers=${entry.passengers}`,
        { signal: AbortSignal.timeout(20000) }
      );
      if (!res.ok) throw new Error('search failed');
      const data: { results?: { cash?: Array<{ price: number | null; isLivePrice?: boolean }>; awards?: Array<{ miles: number }> } } = await res.json();
      const liveCash = (data.results?.cash || []).filter((f) => typeof f.price === 'number' && (f.price ?? 0) > 0 && f.isLivePrice !== false);
      liveCash.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      const awards = (data.results?.awards || []).filter((a) => a.miles > 0);
      awards.sort((a, b) => a.miles - b.miles);
      setLiveChecks(prev => ({
        ...prev,
        [key]: {
          cash: liveCash[0]?.price ?? null,
          award: awards[0]?.miles ?? null,
          loading: false,
          checked: true,
        },
      }));
    } catch {
      setLiveChecks(prev => ({ ...prev, [key]: { cash: null, award: null, loading: false, checked: true } }));
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'var(--font-body)' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');`}</style>

      {/* Header */}
      <div style={{ background: 'rgba(6,6,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${C.border}`, padding: '14px 16px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.sub, display: 'flex', alignItems: 'center' }}>
            <ArrowLeft size={20} />
          </button>
          <span style={{ fontSize: '18px', fontWeight: 600, letterSpacing: '-0.02em' }}>Search History</span>
          {entries.length > 0 && (
            <button
              onClick={clearAll}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: C.sub, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Trash2 size={13} /> Clear all
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px 16px' }}>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🕒</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: C.text, marginBottom: '8px' }}>No search history yet</div>
            <div style={{ fontSize: '13px', color: C.sub, marginBottom: '24px' }}>Searches you run will appear here with the best price found, so you can see if a route got cheaper.</div>
            <button
              onClick={() => router.push('/')}
              style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
            >
              Start searching
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: '12px', color: C.sub, marginBottom: '16px' }}>
              {entries.length} saved search{entries.length !== 1 ? 'es' : ''} — tap Re-check to see current prices
            </div>
            {entries.map((entry) => {
              const live = liveChecks[entry.q];
              const cashDelta = live?.checked ? priceDelta(entry.bestCash, live.cash) : null;
              const awardDelta = live?.checked ? priceDelta(entry.bestAward, live.award) : null;

              return (
                <div
                  key={entry.q}
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: '14px',
                    padding: '16px',
                    marginBottom: '10px',
                  }}
                >
                  {/* Top row: query + actions */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.q}
                      </div>
                      <div style={{ fontSize: '11px', color: C.sub, marginTop: '2px' }}>
                        {timeAgo(entry.searchedAt)} · {entry.origin} → {entry.destination} · {entry.cabin} · {entry.passengers} pax
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/search?q=${encodeURIComponent(entry.q)}`)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.accent, display: 'flex', alignItems: 'center' }}
                      title="Open search"
                    >
                      <ExternalLink size={15} />
                    </button>
                    <button
                      onClick={() => removeEntry(entry.q)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center' }}
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Price row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    {/* Cash */}
                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '10px' }}>
                      <div style={{ fontSize: '10px', color: C.sub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                        Best cash (when searched)
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: C.text }}>
                        {entry.bestCash ? `$${entry.bestCash.toLocaleString()}` : '—'}
                      </div>
                      {live?.checked && (
                        <div style={{ fontSize: '11px', marginTop: '4px' }}>
                          <span style={{ color: C.sub }}>Now: </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: C.text }}>
                            {live.cash ? `$${live.cash.toLocaleString()}` : '—'}
                          </span>
                          {cashDelta && (
                            <span style={{ color: cashDelta.color, marginLeft: '6px', fontWeight: 600 }}>{cashDelta.label}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Award */}
                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '10px', padding: '10px' }}>
                      <div style={{ fontSize: '10px', color: C.sub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                        Best award (when searched)
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 700, color: C.accent }}>
                        {entry.bestAward ? `${(entry.bestAward / 1000).toFixed(0)}K mi` : '—'}
                      </div>
                      {live?.checked && (
                        <div style={{ fontSize: '11px', marginTop: '4px' }}>
                          <span style={{ color: C.sub }}>Now: </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: C.accent }}>
                            {live.award ? `${(live.award / 1000).toFixed(0)}K mi` : '—'}
                          </span>
                          {awardDelta && (
                            <span style={{ color: awardDelta.color, marginLeft: '6px', fontWeight: 600 }}>{awardDelta.label}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Re-check button */}
                  <button
                    onClick={() => recheck(entry)}
                    disabled={live?.loading}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      border: `1px solid ${C.border}`,
                      background: live?.loading ? 'rgba(139,92,246,0.08)' : C.card,
                      color: live?.loading ? C.sub : C.accent,
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: live?.loading ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s',
                    }}
                  >
                    <RefreshCw size={13} style={{ animation: live?.loading ? 'spin 1s linear infinite' : 'none' }} />
                    {live?.loading ? 'Checking current prices...' : live?.checked ? 'Re-check again' : 'Re-check current prices'}
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
