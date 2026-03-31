import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.SEATS_AERO_API_KEY || '';

// rooms.aero uses the same API key as seats.aero
// Endpoint: https://rooms.aero/api/search

interface RoomsResult {
  hotel: string;
  chain: string;
  location: string;
  pointsPerNight: number;
  cashRate: number;
  cashCurrency: string;
  centsPerPoint: number;
  roomType: string;
  availability: boolean;
  source: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const destination = searchParams.get('destination') || '';
  const checkin = searchParams.get('checkin') || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const checkout = searchParams.get('checkout') || new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0];

  if (!API_KEY) {
    return NextResponse.json({ results: [], error: 'SEATS_AERO_API_KEY not set' });
  }

  // Map airport codes to city names for rooms.aero
  const AIRPORT_TO_CITY: Record<string, string> = {
    LHR: 'London', LGW: 'London', CDG: 'Paris', FRA: 'Frankfurt', FCO: 'Rome', MXP: 'Milan',
    MAD: 'Madrid', BCN: 'Barcelona', AMS: 'Amsterdam', ATH: 'Athens', LIS: 'Lisbon',
    NRT: 'Tokyo', HND: 'Tokyo', KIX: 'Osaka', ICN: 'Seoul', SIN: 'Singapore',
    KUL: 'Kuala Lumpur', BKK: 'Bangkok', HKT: 'Phuket', DPS: 'Bali', CGK: 'Jakarta',
    MLE: 'Maldives', DEL: 'Delhi', BOM: 'Mumbai', IST: 'Istanbul', DXB: 'Dubai',
    AUH: 'Abu Dhabi', DOH: 'Doha', JFK: 'New York', LAX: 'Los Angeles', SFO: 'San Francisco',
    MIA: 'Miami', ORD: 'Chicago', SYD: 'Sydney', MEL: 'Melbourne', HKG: 'Hong Kong',
    PEK: 'Beijing', PVG: 'Shanghai', CAI: 'Cairo', NBO: 'Nairobi', CPT: 'Cape Town',
    MRU: 'Mauritius', SEZ: 'Seychelles',
  };

  const city = AIRPORT_TO_CITY[destination.toUpperCase()] || destination;

  try {
    // rooms.aero API
    const url = `https://rooms.aero/api/search?location=${encodeURIComponent(city)}&checkin=${checkin}&checkout=${checkout}`;
    const res = await fetch(url, {
      headers: {
        'Partner-Authorization': API_KEY,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json({
        results: [],
        error: `rooms.aero ${res.status}`,
        details: errText.slice(0, 200),
        fallback: true,
      });
    }

    const data = await res.json();

    // Normalize results
    interface RoomsApiResult {
      hotel_name?: string; chain?: string; city?: string; points_per_night?: number;
      cash_rate?: number; cash_currency?: string; cpp?: number; room_type?: string;
      available?: boolean; source?: string;
    }

    const results: RoomsResult[] = ((data.results || data.data || []) as RoomsApiResult[]).map((r) => ({
      hotel: r.hotel_name || '',
      chain: r.chain || '',
      location: r.city || city,
      pointsPerNight: r.points_per_night || 0,
      cashRate: r.cash_rate || 0,
      cashCurrency: r.cash_currency || 'USD',
      centsPerPoint: r.cpp || (r.cash_rate && r.points_per_night ? Math.round((r.cash_rate / r.points_per_night) * 100) / 100 : 0),
      roomType: r.room_type || 'Standard',
      availability: r.available !== false,
      source: r.source || 'rooms.aero',
    }));

    return NextResponse.json({
      results: results.sort((a, b) => b.centsPerPoint - a.centsPerPoint),
      count: results.length,
      city,
      checkin,
      checkout,
    });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e) });
  }
}
