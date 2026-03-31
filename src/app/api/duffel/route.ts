import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.DUFFEL_API_KEY || '';
const BASE = 'https://api.duffel.com';

// Step 1: Create an offer request
async function createOfferRequest(origin: string, destination: string, date: string, cabin: string, passengers: number) {
  const cabinMap: Record<string, string> = { economy: 'economy', business: 'business', first: 'first' };

  const pax = Array.from({ length: passengers }, () => ({ type: 'adult' }));

  const body = {
    data: {
      slices: [{
        origin,
        destination,
        departure_date: date,
      }],
      passengers: pax,
      cabin_class: cabinMap[cabin.toLowerCase()] || 'economy',
      return_offers: false,
    },
  };

  const res = await fetch(`${BASE}/air/offer_requests`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Duffel-Version': 'v2',
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Duffel ${res.status}: ${err.slice(0, 300)}`);
  }

  return res.json();
}

interface DuffelSlice {
  segments?: DuffelSegment[];
  duration?: string;
  origin?: { iata_code?: string; city_name?: string };
  destination?: { iata_code?: string; city_name?: string };
}

interface DuffelSegment {
  operating_carrier?: { name?: string; iata_code?: string };
  marketing_carrier?: { name?: string; iata_code?: string };
  operating_carrier_flight_number?: string;
  departing_at?: string;
  arriving_at?: string;
  origin?: { iata_code?: string };
  destination?: { iata_code?: string };
  duration?: string;
}

interface DuffelOffer {
  id?: string;
  total_amount?: string;
  total_currency?: string;
  slices?: DuffelSlice[];
  owner?: { name?: string; iata_code?: string };
  payment_requirements?: { requires_instant_payment?: boolean };
  expires_at?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const origin = searchParams.get('origin') || 'DXB';
  const destination = searchParams.get('destination') || 'LHR';
  const date = searchParams.get('date') || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const cabin = searchParams.get('cabin') || 'economy';
  const passengers = parseInt(searchParams.get('passengers') || '1');

  if (!API_KEY) {
    return NextResponse.json({ results: [], error: 'DUFFEL_API_KEY not set' });
  }

  try {
    const data = await createOfferRequest(origin, destination, date, cabin, passengers);
    const offers: DuffelOffer[] = data.data?.offers || [];

    const results = offers.slice(0, 15).map((offer) => {
      const slice = offer.slices?.[0];
      const segments = slice?.segments || [];
      const airlines = [...new Set(segments.map(s => s.operating_carrier?.name || s.marketing_carrier?.name || ''))];
      const totalDuration = slice?.duration || '';

      return {
        id: offer.id || '',
        price: parseFloat(offer.total_amount || '0'),
        currency: offer.total_currency || 'USD',
        airlines,
        airlineCodes: [...new Set(segments.map(s => s.operating_carrier?.iata_code || s.marketing_carrier?.iata_code || ''))],
        from: slice?.origin?.iata_code || origin,
        to: slice?.destination?.iata_code || destination,
        fromCity: slice?.origin?.city_name || '',
        toCity: slice?.destination?.city_name || '',
        departure: segments[0]?.departing_at || '',
        arrival: segments[segments.length - 1]?.arriving_at || '',
        duration: totalDuration,
        stops: segments.length - 1,
        segments: segments.map(s => ({
          airline: s.operating_carrier?.name || s.marketing_carrier?.name || '',
          flightNo: `${s.marketing_carrier?.iata_code || ''}${s.operating_carrier_flight_number || ''}`,
          from: s.origin?.iata_code || '',
          to: s.destination?.iata_code || '',
          departure: s.departing_at || '',
          arrival: s.arriving_at || '',
          duration: s.duration || '',
        })),
        bookable: true,
        offerId: offer.id,
        expiresAt: offer.expires_at || '',
        source: 'duffel',
      };
    });

    return NextResponse.json({
      results: results.sort((a, b) => a.price - b.price),
      count: results.length,
      currency: results[0]?.currency || 'USD',
    });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e) });
  }
}
