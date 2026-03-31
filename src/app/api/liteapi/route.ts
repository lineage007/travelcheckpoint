import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.LITEAPI_KEY || '';
const BASE = 'https://api.liteapi.travel/v3.0';

const AIRPORT_TO_CITY: Record<string, { name: string; countryCode: string }> = {
  LHR:{name:'London',countryCode:'GB'},CDG:{name:'Paris',countryCode:'FR'},FRA:{name:'Frankfurt',countryCode:'DE'},
  FCO:{name:'Rome',countryCode:'IT'},MXP:{name:'Milan',countryCode:'IT'},MAD:{name:'Madrid',countryCode:'ES'},
  BCN:{name:'Barcelona',countryCode:'ES'},AMS:{name:'Amsterdam',countryCode:'NL'},ATH:{name:'Athens',countryCode:'GR'},
  LIS:{name:'Lisbon',countryCode:'PT'},ZRH:{name:'Zurich',countryCode:'CH'},VIE:{name:'Vienna',countryCode:'AT'},
  NRT:{name:'Tokyo',countryCode:'JP'},HND:{name:'Tokyo',countryCode:'JP'},KIX:{name:'Osaka',countryCode:'JP'},
  ICN:{name:'Seoul',countryCode:'KR'},SIN:{name:'Singapore',countryCode:'SG'},KUL:{name:'Kuala Lumpur',countryCode:'MY'},
  BKK:{name:'Bangkok',countryCode:'TH'},HKT:{name:'Phuket',countryCode:'TH'},DPS:{name:'Bali',countryCode:'ID'},
  CGK:{name:'Jakarta',countryCode:'ID'},MLE:{name:'Male',countryCode:'MV'},DEL:{name:'Delhi',countryCode:'IN'},
  BOM:{name:'Mumbai',countryCode:'IN'},IST:{name:'Istanbul',countryCode:'TR'},DXB:{name:'Dubai',countryCode:'AE'},
  AUH:{name:'Abu Dhabi',countryCode:'AE'},DOH:{name:'Doha',countryCode:'QA'},JFK:{name:'New York',countryCode:'US'},
  LAX:{name:'Los Angeles',countryCode:'US'},SFO:{name:'San Francisco',countryCode:'US'},MIA:{name:'Miami',countryCode:'US'},
  ORD:{name:'Chicago',countryCode:'US'},SYD:{name:'Sydney',countryCode:'AU'},MEL:{name:'Melbourne',countryCode:'AU'},
  HKG:{name:'Hong Kong',countryCode:'HK'},PEK:{name:'Beijing',countryCode:'CN'},PVG:{name:'Shanghai',countryCode:'CN'},
  CAI:{name:'Cairo',countryCode:'EG'},NBO:{name:'Nairobi',countryCode:'KE'},CPT:{name:'Cape Town',countryCode:'ZA'},
  MRU:{name:'Mauritius',countryCode:'MU'},SEZ:{name:'Mahe',countryCode:'SC'},RAK:{name:'Marrakech',countryCode:'MA'},
  MCT:{name:'Muscat',countryCode:'OM'},BAH:{name:'Manama',countryCode:'BH'},RUH:{name:'Riyadh',countryCode:'SA'},
  GRU:{name:'Sao Paulo',countryCode:'BR'},CUN:{name:'Cancun',countryCode:'MX'},AKL:{name:'Auckland',countryCode:'NZ'},
  TZX:{name:'Trabzon',countryCode:'TR'},AYT:{name:'Antalya',countryCode:'TR'},BJV:{name:'Bodrum',countryCode:'TR'},
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const destination = (searchParams.get('destination') || '').toUpperCase();
  const checkin = searchParams.get('checkin') || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const checkout = searchParams.get('checkout') || new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0];
  const adults = searchParams.get('adults') || '2';
  const currency = searchParams.get('currency') || 'USD';

  if (!API_KEY) return NextResponse.json({ results: [], error: 'LITEAPI_KEY not set' });

  const cityInfo = AIRPORT_TO_CITY[destination];
  if (!cityInfo) return NextResponse.json({ results: [], error: `Unknown airport code: ${destination}` });

  try {
    // Step 1: Search hotels
    const searchUrl = `${BASE}/hotels?cityName=${encodeURIComponent(cityInfo.name)}&countryCode=${cityInfo.countryCode}&checkin=${checkin}&checkout=${checkout}&adults=${adults}&currency=${currency}&limit=15`;
    
    const res = await fetch(searchUrl, {
      headers: {
        'X-API-Key': API_KEY,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json({ results: [], error: `LiteAPI ${res.status}`, details: errText.slice(0, 300) });
    }

    const data = await res.json();

    interface LiteHotelRoom {
      roomName?: string;
      rate?: number;
      originalRate?: number;
      boardType?: string;
      cancellationPolicy?: { type?: string };
    }

    interface LiteHotel {
      hotelId?: string;
      name?: string;
      stars?: number;
      address?: string;
      latitude?: number;
      longitude?: number;
      reviewScore?: number;
      reviewCount?: number;
      mainPhoto?: string;
      rooms?: LiteHotelRoom[];
      currency?: string;
    }

    const hotels = (data.data || []) as LiteHotel[];

    const results = hotels.map(h => {
      const cheapestRoom = (h.rooms || []).sort((a, b) => (a.rate || 999) - (b.rate || 999))[0];
      return {
        id: h.hotelId || '',
        name: h.name || '',
        stars: h.stars || 0,
        address: h.address || '',
        lat: h.latitude,
        lng: h.longitude,
        rating: h.reviewScore || 0,
        reviews: h.reviewCount || 0,
        image: h.mainPhoto || '',
        price: cheapestRoom?.rate || 0,
        originalPrice: cheapestRoom?.originalRate || 0,
        currency: h.currency || currency,
        roomType: cheapestRoom?.roomName || '',
        board: cheapestRoom?.boardType || '',
        freeCancellation: cheapestRoom?.cancellationPolicy?.type === 'free',
        source: 'liteapi',
      };
    }).filter(h => h.price > 0).sort((a, b) => a.price - b.price);

    return NextResponse.json({
      results,
      count: results.length,
      city: cityInfo.name,
      checkin,
      checkout,
      currency,
    });
  } catch (e) {
    return NextResponse.json({ results: [], error: String(e) });
  }
}
