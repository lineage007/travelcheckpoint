'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

// Google Flights-style price calendar. Prices come from three layers:
// 1. the current search results (passed in as knownPrices),
// 2. a 24h localStorage memory of every price this browser has seen for the route,
// 3. live background probes of missing days (cash-only, priceOnly=1 — no award quota).
const C = { card: '#101018', border: 'rgba(255,255,255,0.08)', accent: '#8B5CF6', text: '#ffffff', sub: 'rgba(255,255,255,0.4)', green: '#22C55E' };

const MAX_PROBES_PER_MONTH = 10;
const MEMORY_TTL_MS = 24 * 60 * 60 * 1000;

const iso = (d: Date) => d.toISOString().split('T')[0];
const shortMoney = (sym: string, n: number) =>
  n >= 10000 ? `${sym}${Math.round(n / 1000)}k` : n >= 1000 ? `${sym}${(n / 1000).toFixed(1)}k` : `${sym}${Math.round(n)}`;

interface Props {
  origin: string;
  dest: string;
  cabin: string;
  baseDate: string;
  knownPrices: Record<string, number>; // date → best live USD price from current results
  symbol: string;
  rate: number; // USD → display currency
  onPick: (date: string) => void;
  onClose: () => void;
}

type PriceMap = Record<string, number | null>; // null = probed, nothing live

export default function PriceCalendar({ origin, dest, cabin, baseDate, knownPrices, symbol, rate, onPick, onClose }: Props) {
  const todayIso = iso(new Date());
  const [month, setMonth] = useState(() => (baseDate && baseDate >= todayIso ? baseDate : todayIso).slice(0, 7));
  const [fetched, setFetched] = useState<PriceMap>({});
  const [probingMonths, setProbingMonths] = useState<string[]>([]);
  const probedMonths = useRef(new Set<string>());
  const memKey = `tc_pm:${origin}-${dest}-${cabin}`;

  // Merge layers: live results win over probes win over memory.
  const prices = useMemo<PriceMap>(() => {
    let memory: Record<string, { p: number | null; at: number }> = {};
    try { memory = JSON.parse(window.localStorage.getItem(memKey) || '{}'); } catch { /* ignore */ }
    const merged: PriceMap = {};
    for (const [d, v] of Object.entries(memory)) {
      if (Date.now() - (v?.at || 0) < MEMORY_TTL_MS) merged[d] = v.p;
    }
    Object.assign(merged, fetched);
    for (const [d, p] of Object.entries(knownPrices)) merged[d] = p;
    return merged;
  }, [fetched, knownPrices, memKey]);

  // Probe missing days of the visible month (bounded, cash-only).
  useEffect(() => {
    if (probedMonths.current.has(month)) return;
    probedMonths.current = new Set(probedMonths.current).add(month);
    let cancelled = false;

    (async () => {
      await Promise.resolve();
      const [y, m] = month.split('-').map(Number);
      const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const candidates: string[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const d = `${month}-${String(day).padStart(2, '0')}`;
        if (d >= todayIso && prices[d] === undefined) candidates.push(d);
      }
      // Sample evenly across the month so coverage isn't front-loaded.
      const step = Math.max(1, Math.ceil(candidates.length / MAX_PROBES_PER_MONTH));
      const targets = candidates.filter((_, i) => i % step === 0).slice(0, MAX_PROBES_PER_MONTH);
      if (targets.length === 0) return;
      setProbingMonths(pm => [...pm, month]);

      const results: PriceMap = {};
      // Concurrency 3 — the cash source is a scraper; be gentle.
      for (let i = 0; i < targets.length && !cancelled; i += 3) {
        await Promise.all(targets.slice(i, i + 3).map(async (d) => {
          try {
            const res = await fetch(`/api/search?origin=${origin}&destination=${dest}&cabin=${encodeURIComponent(cabin)}&date=${d}&passengers=1&skipAwards=1&priceOnly=1`, { signal: AbortSignal.timeout(25000) });
            const data = await res.json();
            interface ProbeCash { price?: number | null; isLivePrice?: boolean }
            const best = ((data.results?.cash || []) as ProbeCash[])
              .filter(c => c.isLivePrice !== false && typeof c.price === 'number' && (c.price as number) > 0)
              .sort((a, b) => (a.price as number) - (b.price as number))[0]?.price ?? null;
            results[d] = best as number | null;
          } catch { /* leave unknown */ }
        }));
        if (!cancelled && Object.keys(results).length > 0) {
          setFetched(f => ({ ...f, ...results }));
          try {
            const memory = JSON.parse(window.localStorage.getItem(memKey) || '{}');
            for (const [d, p] of Object.entries(results)) memory[d] = { p, at: Date.now() };
            window.localStorage.setItem(memKey, JSON.stringify(memory));
          } catch { /* ignore */ }
        }
      }
      if (!cancelled) setProbingMonths(pm => pm.filter(x => x !== month));
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, origin, dest, cabin]);

  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday-first
  const monthLabel = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const probing = probingMonths.includes(month);

  const monthPrices = Object.entries(prices).filter(([d, p]) => d.startsWith(month) && typeof p === 'number') as [string, number][];
  const cheapest = monthPrices.sort((a, b) => a[1] - b[1])[0]?.[0];

  const prevMonth = () => { const d = new Date(Date.UTC(y, m - 2, 1)); if (iso(d).slice(0, 7) >= todayIso.slice(0, 7)) setMonth(iso(d).slice(0, 7)); };
  const nextMonth = () => { const d = new Date(Date.UTC(y, m, 1)); const limit = new Date(); limit.setMonth(limit.getMonth() + 11); if (d <= limit) setMonth(iso(d).slice(0, 7)); };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-label="Pick a departure date"
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '18px', padding: '18px', width: '100%', maxWidth: '420px', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color: C.text }}>{origin} → {dest}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', color: C.sub }}>best cash fare per departure day{probing ? ' · updating…' : ''}</div>
          </div>
          <button onClick={onClose} aria-label="Close calendar" style={{ background: 'none', border: 'none', color: C.sub, cursor: 'pointer', padding: '6px' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0' }}>
          <button onClick={prevMonth} aria-label="Previous month" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, cursor: 'pointer', padding: '6px 8px', display: 'flex' }}><ChevronLeft size={15} /></button>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: C.text }}>{monthLabel}</span>
          <button onClick={nextMonth} aria-label="Next month" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text, cursor: 'pointer', padding: '6px 8px', display: 'flex' }}><ChevronRight size={15} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '4px' }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '10px', color: C.sub, padding: '4px 0' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
          {Array.from({ length: firstWeekday }).map((_, i) => <div key={`pad-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const d = `${month}-${String(i + 1).padStart(2, '0')}`;
            const p = prices[d];
            const past = d < todayIso;
            const selected = d === baseDate;
            const isCheapest = d === cheapest;
            return (
              <button key={d} disabled={past} onClick={() => onPick(d)}
                style={{
                  background: selected ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.03)',
                  border: selected ? `1px solid ${C.accent}` : isCheapest ? '1px solid rgba(34,197,94,0.5)' : '1px solid transparent',
                  borderRadius: '9px', padding: '6px 0 5px', cursor: past ? 'default' : 'pointer', opacity: past ? 0.25 : 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minHeight: '44px',
                }}>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '12px', fontWeight: 600, color: C.text }}>{i + 1}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: isCheapest ? C.green : typeof p === 'number' ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.18)' }}>
                  {typeof p === 'number' ? shortMoney(symbol, p * rate) : p === null ? '—' : '·'}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: C.green }}>■ cheapest known</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: C.sub }}>· not checked yet</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: C.sub }}>— no live fare found</span>
        </div>
      </div>
    </div>
  );
}
