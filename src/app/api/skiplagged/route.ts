import { NextRequest, NextResponse } from 'next/server';
import { callMcpTool } from '@/lib/mcp-client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || 'DXB';
  const to = searchParams.get('to') || 'LHR';
  const depart = searchParams.get('depart') || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const adults = parseInt(searchParams.get('adults') || '1');
  const cabin = searchParams.get('cabin') || 'economy';

  try {
    const result = await callMcpTool('skiplagged', 'sk_flights_search', {
      origin: from,
      destination: to,
      departureDate: depart,
      adults,
      cabinClass: cabin === 'business' ? 'business' : cabin === 'first' ? 'first' : 'economy',
    });

    // MCP returns content as text blocks
    const textContent = (result.content || [])
      .filter((c: { type: string }) => c.type === 'text')
      .map((c: { text: string }) => c.text)
      .join('\n');

    // Try to parse the response
    let flights: Array<{
      airline?: string; price?: number; departure_time?: string;
      duration_minutes?: number; stops?: number; legs?: Array<{
        from?: string; to?: string; airline?: string;
        departure?: string; arrival?: string; flight_number?: string;
      }>;
      is_hidden_city?: boolean; actual_destination?: string;
    }> = [];
    try {
      const parsed = JSON.parse(textContent);
      flights = Array.isArray(parsed) ? parsed : (parsed.flights || parsed.results || []);
    } catch {
      // MCP might return formatted text — extract what we can
      return NextResponse.json({ results: [], raw: textContent.slice(0, 2000), source: 'skiplagged-mcp' });
    }

    const results = flights.map(f => ({
      airline: f.airline || '',
      price: f.price || 0,
      from,
      to,
      actualDestination: f.actual_destination || to,
      isHiddenCity: f.is_hidden_city || false,
      duration: f.duration_minutes || 0,
      stops: f.stops || 0,
      departure: f.departure_time || '',
      legs: f.legs || [],
      source: 'skiplagged',
    }));

    return NextResponse.json({ results, count: results.length, source: 'skiplagged-mcp' });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e), source: 'skiplagged-mcp' });
  }
}
