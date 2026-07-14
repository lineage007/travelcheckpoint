import { NextResponse } from 'next/server';

// USD-base FX rates for the client currency toggle. Cached in-process for 6h —
// display conversion doesn't need tick-level accuracy.
const CURRENCIES = ['aud', 'usd', 'eur', 'gbp', 'aed', 'try'] as const;
const TTL_MS = 6 * 60 * 60 * 1000;

let cache: { at: number; rates: Record<string, number> } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json({ base: 'USD', rates: cache.rates, cached: true });
  }
  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rates: Record<string, number> = {};
    for (const c of CURRENCIES) {
      const r = data?.usd?.[c];
      if (typeof r === 'number' && r > 0) rates[c.toUpperCase()] = r;
    }
    rates.USD = 1;
    if (Object.keys(rates).length < 3) throw new Error('insufficient rates');
    cache = { at: Date.now(), rates };
    return NextResponse.json({ base: 'USD', rates, cached: false });
  } catch {
    // Stale cache beats no rates; final fallback is USD-only (toggle hides others).
    if (cache) return NextResponse.json({ base: 'USD', rates: cache.rates, cached: true, stale: true });
    return NextResponse.json({ base: 'USD', rates: { USD: 1 }, error: 'rates-unavailable' });
  }
}
