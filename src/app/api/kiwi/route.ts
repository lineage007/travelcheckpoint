import { NextRequest, NextResponse } from 'next/server';
import { callMcpTool } from '@/lib/mcp-client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || 'DXB';
  const to = searchParams.get('to') || 'LHR';
  const departRaw = searchParams.get('depart') || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  // Convert YYYY-MM-DD to DD/MM/YYYY for Kiwi
  const [y, m, d] = departRaw.split('-');
  const depart = `${d}/${m}/${y}`;
  const cabin = searchParams.get('cabin') || 'economy';
  const adults = parseInt(searchParams.get('adults') || '1');

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

    const results = flights.map(f => ({
      airline: f.airline || (f.airlines || []).join(' + ') || '',
      price: f.price || 0,
      from,
      to,
      departure: f.departure_time || '',
      duration: f.duration_minutes || (f.duration_hours ? f.duration_hours * 60 : 0),
      stops: f.stops || 0,
      route: f.route || `${from} → ${to}`,
      bookingLink: f.booking_link || '',
      isCreativeRoute: f.is_virtual_interline || (flights.length > 0),
      source: 'kiwi',
    })).filter(f => f.price > 0);

    return NextResponse.json({ results, count: results.length, source: 'kiwi-mcp' });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e), source: 'kiwi-mcp' });
  }
}
