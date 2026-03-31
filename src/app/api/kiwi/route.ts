import { NextRequest, NextResponse } from 'next/server';
import { callMcpTool } from '@/lib/mcp-client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') || 'DXB';
  const to = searchParams.get('to') || 'LHR';
  const depart = searchParams.get('depart') || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
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

    // Parse the response
    let flights: Array<{
      airline?: string; airlines?: string[]; price?: number;
      departure_time?: string; duration_hours?: number; duration_minutes?: number;
      stops?: number; route?: string; booking_link?: string;
      is_virtual_interline?: boolean;
    }> = [];
    try {
      const parsed = JSON.parse(textContent);
      flights = Array.isArray(parsed) ? parsed : (parsed.flights || parsed.results || parsed.data || []);
    } catch {
      return NextResponse.json({ results: [], raw: textContent.slice(0, 2000), source: 'kiwi-mcp' });
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
      isCreativeRoute: f.is_virtual_interline || false,
      source: 'kiwi',
    }));

    return NextResponse.json({ results, count: results.length, source: 'kiwi-mcp' });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e), source: 'kiwi-mcp' });
  }
}
