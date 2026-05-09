import { NextRequest, NextResponse } from 'next/server';
import { callMcpTool } from '@/lib/mcp-client';
import { clampInt, normalizeAirportCode, safeIsoDate } from '@/lib/travel-utils';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = normalizeAirportCode(searchParams.get('from'), 'DXB');
  const to = normalizeAirportCode(searchParams.get('to'), 'LHR');
  const departRaw = safeIsoDate(searchParams.get('depart'), 7);
  // Convert YYYY-MM-DD to DD/MM/YYYY for Kiwi
  const [y, m, d] = departRaw.split('-');
  const depart = `${d}/${m}/${y}`;
  const requestedCabin = (searchParams.get('cabin') || 'economy').toLowerCase();
  const cabin = ['economy', 'premium', 'business', 'first'].includes(requestedCabin) ? requestedCabin : 'economy';
  const adults = clampInt(searchParams.get('adults'), 1, 1, 9);

  if (!from || !to) return NextResponse.json({ results: [], error: 'Invalid airport code' }, { status: 400 });

  try {
    const result = await callMcpTool('kiwi', 'search-flight', {
      flyFrom: from,
      flyTo: to,
      departureDate: depart,
      cabinClass: cabin === 'business' ? 'C' : cabin === 'first' ? 'F' : 'M',
      adults,
    });

    // MCP returns content as text blocks
    const textContent = (result.content || [])
      .filter((c: { type: string }) => c.type === 'text')
      .map((c: { text: string }) => c.text)
      .join('\n');

    // Parse — might be JSON or markdown
    interface KiwiFlight {
      airline?: string; airlines?: string[]; price?: number;
      departure_time?: string; duration_hours?: number; duration_minutes?: number;
      stops?: number; route?: string; booking_link?: string;
      is_virtual_interline?: boolean;
    }
    let flights: KiwiFlight[] = [];
    try {
      const parsed = JSON.parse(textContent);
      flights = Array.isArray(parsed) ? parsed : (parsed.flights || parsed.results || parsed.data || []);
    } catch {
      // Parse markdown: lines with prices, airlines, durations
      const lines = textContent.split('\n');
      for (const line of lines) {
        const priceMatch = line.match(/[€$£](\d[\d,]*)/);
        if (priceMatch) {
          const durationMatch = line.match(/(\d+)h\s*(\d+)m/) || line.match(/(\d+)\s*hours?\s*(\d+)?\s*min/);
          const stopsMatch = line.match(/(\d+)\s*stop/) || line.match(/direct/i);
          // Extract airline names
          const airlineMatch = line.match(/(?:Airlines?|Airways?|Air\s\w+|Emirates|Etihad|Qatar|Turkish|Singapore|Cathay|Lufthansa|KLM|Thai|ANA|JAL|Garuda|Malaysia|IndiGo|AirAsia|Batik|Scoot|Lion|Citilink|Saudia|Gulf|Oman|Royal Jordanian)/gi);
          
          flights.push({
            airline: airlineMatch ? airlineMatch[0] : '',
            price: parseInt(priceMatch[1].replace(',', '')),
            duration_minutes: durationMatch ? parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2] || '0') : 0,
            stops: stopsMatch ? (typeof stopsMatch === 'object' && stopsMatch[0]?.toLowerCase() === 'direct' ? 0 : parseInt(stopsMatch[1])) : 0,
            booking_link: (line.match(/https?:\/\/[^\s)]+/) || [''])[0],
          });
        }
      }
    }

    const results = flights.map(f => {
      const airlines = f.airlines?.length ? f.airlines : (f.airline ? [f.airline] : ['Kiwi Route']);
      return {
        airline: airlines.join(' + '),
        airlines,
        price: f.price || 0,
        from,
        to,
        departure: f.departure_time || '',
        duration: f.duration_minutes || (f.duration_hours ? f.duration_hours * 60 : 0),
        stops: f.stops || 0,
        route: f.route || `${from} → ${to}`,
        bookingLink: f.booking_link || '',
        isCreativeRoute: f.is_virtual_interline || (flights.length > 0),
        isVirtualInterline: f.is_virtual_interline || (flights.length > 0),
        source: 'kiwi',
        status: 'live',
      };
    }).filter(f => f.price > 0);

    return NextResponse.json({ results, count: results.length, source: 'kiwi-mcp', status: results.length ? 'live' : 'no-results' });
  } catch {
    return NextResponse.json({ results: [], count: 0, source: 'kiwi-mcp', status: 'unavailable' });
  }
}
