import { NextRequest, NextResponse } from 'next/server';
import { callMcpTool } from '@/lib/mcp-client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') || searchParams.get('destination') || 'Dubai';
  const checkin = searchParams.get('checkin') || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const checkout = searchParams.get('checkout') || new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0];
  const adults = parseInt(searchParams.get('adults') || '2');

  try {
    const result = await callMcpTool('trivago', 'trivago-accommodation-search', {
      query: city,
      check_in: checkin,
      check_out: checkout,
      adults,
      rooms: 1,
      sort_by: 'price',
      max_results: 15,
    });

    const textContent = (result.content || [])
      .filter((c: { type: string }) => c.type === 'text')
      .map((c: { text: string }) => c.text)
      .join('\n');

    let hotels: Array<{
      name?: string; price?: number; currency?: string;
      rating?: number; stars?: number; address?: string;
      image?: string; url?: string; provider?: string;
      deals?: Array<{ provider?: string; price?: number; url?: string }>;
    }> = [];
    try {
      const parsed = JSON.parse(textContent);
      hotels = Array.isArray(parsed) ? parsed : (parsed.hotels || parsed.results || parsed.accommodations || []);
    } catch {
      return NextResponse.json({ results: [], raw: textContent.slice(0, 2000), source: 'trivago-mcp' });
    }

    const results = hotels.map(h => ({
      name: h.name || '',
      price: h.price || 0,
      currency: h.currency || 'USD',
      rating: h.rating || 0,
      stars: h.stars || 0,
      address: h.address || '',
      image: h.image || '',
      url: h.url || '',
      provider: h.provider || 'Trivago',
      deals: h.deals || [],
      source: 'trivago',
    }));

    return NextResponse.json({ results, count: results.length, source: 'trivago-mcp' });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e), source: 'trivago-mcp' });
  }
}
