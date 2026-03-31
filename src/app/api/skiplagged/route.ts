import { NextRequest, NextResponse } from 'next/server';

const SKIPLAGGED_PROXY = process.env.SKIPLAGGED_PROXY_URL || 'http://localhost:8686';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || 'DXB';
  const to = searchParams.get('to') || 'LHR';
  const depart = searchParams.get('depart') || '';
  const adults = searchParams.get('adults') || '1';

  try {
    const url = `${SKIPLAGGED_PROXY}/search?from=${from}&to=${to}&depart=${depart}&adults=${adults}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    
    if (!res.ok) {
      return NextResponse.json({ results: [], error: `Proxy returned ${res.status}` });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e) });
  }
}
