import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || 'DXB';
  const to = searchParams.get('to') || 'LHR';
  const depart = searchParams.get('depart') || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const cabin = searchParams.get('cabin') || 'M';
  const adults = searchParams.get('adults') || '1';

  const cabinMap: Record<string, string> = { economy: 'M', business: 'C', first: 'F' };
  const selectedCabin = cabinMap[cabin.toLowerCase()] || cabin;
  const dd = depart.split('-');
  const dateFormatted = `${dd[2]}/${dd[1]}/${dd[0]}`;

  try {
    const url = `https://api.tequila.kiwi.com/v2/search?fly_from=${from}&fly_to=${to}&date_from=${dateFormatted}&date_to=${dateFormatted}&curr=USD&adults=${adults}&selected_cabins=${selectedCabin}&vehicle_type=aircraft&limit=15&sort=price&asc=1`;
    const res = await fetch(url, {
      headers: { 'apikey': process.env.KIWI_API_KEY || '' },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json({ results: [], error: `Kiwi ${res.status}` });
    }

    const data = await res.json();

    interface KiwiRoute { airline?: string; flyFrom?: string; flyTo?: string; flight_no?: string; local_departure?: string; local_arrival?: string }
    interface KiwiFlight { price?: number; flyFrom?: string; flyTo?: string; local_departure?: string; local_arrival?: string; duration?: { total?: number }; route?: KiwiRoute[]; has_airport_change?: boolean; deep_link?: string; quality?: number }

    const results = ((data.data || []) as KiwiFlight[]).slice(0, 15).map((f) => {
      const route = f.route || [];
      const airlines = [...new Set(route.map((r) => r.airline || ''))];
      return {
        price: f.price || 0,
        airlines,
        from: f.flyFrom || from,
        to: f.flyTo || to,
        departure: f.local_departure || '',
        arrival: f.local_arrival || '',
        duration: Math.round((f.duration?.total || 0) / 3600),
        stops: route.length - 1,
        isVirtualInterline: airlines.length > 1,
        hasGuarantee: f.has_airport_change || airlines.length > 1,
        bookingLink: f.deep_link || '',
        quality: f.quality || 0,
        legs: route.map((r) => ({
          from: r.flyFrom, to: r.flyTo, airline: r.airline,
          flightNo: r.flight_no, departure: r.local_departure, arrival: r.local_arrival,
        })),
      };
    });

    return NextResponse.json({ results, count: results.length, currency: 'USD' });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e) });
  }
}
