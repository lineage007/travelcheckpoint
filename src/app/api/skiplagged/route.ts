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

    // Try JSON parse first, then fall back to markdown parsing
    interface SkipFlight {
      airline?: string; price?: number; departure_time?: string;
      duration_minutes?: number; stops?: number; isHiddenCity?: boolean;
      legs?: Array<{ from?: string; to?: string; airline?: string; departure?: string; arrival?: string; flight_number?: string }>;
    }
    let flights: SkipFlight[] = [];
    try {
      const parsed = JSON.parse(textContent);
      flights = Array.isArray(parsed) ? parsed : (parsed.flights || parsed.results || []);
    } catch {
      // Parse markdown format: "### 1. airline — $price — duration — stops"
      const lines = textContent.split('\n');
      for (const line of lines) {
        // Match patterns like: "### 1. Turkish Airlines — $342 — 14h 35m — 1 stop"
        // or: "- **$342** — Turkish Airlines — 14h 35m — 1 stop"
        const priceMatch = line.match(/\$(\d[\d,]*)/);
        const airlinePatterns = [
          /(?:###\s*\d+\.\s*)([^—]+)/,
          /\*\*([^*]+)\*\*/,
          /(?:—\s*)([A-Z][a-z]+(?:\s[A-Z][a-z]+)*\s*(?:Airlines?|Airways?)?)/,
        ];
        
        if (priceMatch) {
          let airline = '';
          for (const pat of airlinePatterns) {
            const m = line.match(pat);
            if (m && !m[1].startsWith('$')) { airline = m[1].trim(); break; }
          }
          const durationMatch = line.match(/(\d+)h\s*(\d+)m/);
          const stopsMatch = line.match(/(\d+)\s*stop/);
          
          flights.push({
            airline: airline || 'Multiple',
            price: parseInt(priceMatch[1].replace(',', '')),
            duration_minutes: durationMatch ? parseInt(durationMatch[1]) * 60 + parseInt(durationMatch[2]) : 0,
            stops: stopsMatch ? parseInt(stopsMatch[1]) : 0,
          });
        }
      }
    }

    const results = flights.map(f => ({
      airline: f.airline || '',
      price: f.price || 0,
      from,
      to,
      actualDestination: to,
      isHiddenCity: f.isHiddenCity || false,
      duration: f.duration_minutes || 0,
      stops: f.stops || 0,
      departure: f.departure_time || '',
      legs: f.legs || [],
      source: 'skiplagged',
    })).filter(f => f.price > 0);

    return NextResponse.json({ results, count: results.length, source: 'skiplagged-mcp' });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e), source: 'skiplagged-mcp' });
  }
}
