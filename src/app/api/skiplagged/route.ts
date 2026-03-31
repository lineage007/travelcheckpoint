import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || 'DXB';
  const to = searchParams.get('to') || 'LHR';
  const depart = searchParams.get('depart') || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const adults = searchParams.get('adults') || '1';

  try {
    const url = `https://skiplagged.com/api/search.php?from=${from}&to=${to}&depart=${depart}&return=&format=v3&counts[adults]=${adults}&counts[children]=0`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return NextResponse.json({ results: [], error: 'Skiplagged unavailable' });

    const data = await res.json();
    const flights = data?.itineraries?.outbound || [];

    interface SkipLeg { airline?: string; from?: string; to?: string; departure?: string; arrival?: string; flight_number?: string }
    interface SkipFlight { legs?: SkipLeg[]; price?: number; duration?: number }

    const results = (flights as SkipFlight[]).slice(0, 20).map((f) => {
      const legs = f.legs || [];
      const firstLeg = legs[0] || {};
      const lastLeg = legs[legs.length - 1] || {};
      const airline = firstLeg.airline || '';
      const actualDest = lastLeg.to || to;
      const isHiddenCity = actualDest !== to;

      return {
        airline,
        price: (f.price || 0) / 100,
        from,
        to,
        actualDestination: actualDest,
        isHiddenCity,
        duration: Math.round((f.duration || 0) / 60),
        stops: legs.length - 1,
        departure: firstLeg.departure || '',
        legs: legs.map((l) => ({
          from: l.from, to: l.to, airline: l.airline,
          departure: l.departure, arrival: l.arrival,
          flightNo: l.flight_number,
        })),
      };
    });

    return NextResponse.json({ results, count: results.length });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e) });
  }
}
