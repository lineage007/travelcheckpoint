import { NextRequest, NextResponse } from 'next/server';
import { clampInt, normalizeAirportCode, safeIsoDate } from '@/lib/travel-utils';

const SKIPLAGGED_PROXY = process.env.SKIPLAGGED_PROXY_URL || '';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = normalizeAirportCode(searchParams.get('from'), 'DXB');
  const to = normalizeAirportCode(searchParams.get('to'), 'LHR');
  const depart = safeIsoDate(searchParams.get('depart'), 7);
  const adults = String(clampInt(searchParams.get('adults'), 1, 1, 9));

  if (!from || !to) return NextResponse.json({ results: [], error: 'Invalid airport code' }, { status: 400 });
  if (!SKIPLAGGED_PROXY) {
    return NextResponse.json({
      results: [],
      count: 0,
      source: 'skiplagged',
      status: 'not-configured',
      fallbackUrl: `https://skiplagged.com/flights/${from}/${to}/${depart}`,
    });
  }

  try {
    const url = `${SKIPLAGGED_PROXY}/search?from=${from}&to=${to}&depart=${depart}&adults=${adults}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    
    if (!res.ok) {
      return NextResponse.json({ results: [], error: `Proxy returned ${res.status}` });
    }
    
    const data = await res.json();
    return NextResponse.json({ ...data, source: 'skiplagged', status: 'live' });
  } catch {
    return NextResponse.json({
      results: [],
      count: 0,
      source: 'skiplagged',
      status: 'unavailable',
      fallbackUrl: `https://skiplagged.com/flights/${from}/${to}/${depart}`,
    });
  }
}
