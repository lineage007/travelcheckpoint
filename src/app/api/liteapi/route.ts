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
  CUN:{name:'Cancun',countryCode:'MX'},AKL:{name:'Auckland',countryCode:'NZ'},
  TZX:{name:'Trabzon',countryCode:'TR'},AYT:{name:'Antalya',countryCode:'TR'},BJV:{name:'Bodrum',countryCode:'TR'},
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const destination = (searchParams.get('destination') || '').toUpperCase();
  const checkin = searchParams.get('checkin') || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const checkout = searchParams.get('checkout') || new Date(Date.now() + 8 * 86400000).toISOString().split('T')[0];
  const adults = parseInt(searchParams.get('adults') || '2');
  const currency = searchParams.get('currency') || 'USD';

  if (!API_KEY) return NextResponse.json({ results: [], error: 'LITEAPI_KEY not set' });

  const cityInfo = AIRPORT_TO_CITY[destination];
  if (!cityInfo) return NextResponse.json({ results: [], error: `Unknown airport: ${destination}` });

  try {
    // Step 1: Get hotel list for the city
    const listUrl = `${BASE}/data/hotels?countryCode=${cityInfo.countryCode}&cityName=${encodeURIComponent(cityInfo.name)}&limit=15`;
    const listRes = await fetch(listUrl, {
      headers: { 'X-API-Key': API_KEY, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!listRes.ok) {
      return NextResponse.json({ results: [], error: `LiteAPI list ${listRes.status}` });
    }

    const listData = await listRes.json();

    interface LiteHotelData {
      id?: string;
      name?: string;
      starRating?: number;
      address?: string;
      latitude?: number;
      longitude?: number;
      main_photo?: string;
      hotelDescription?: string;
    }

    const hotelList = (listData.data || []) as LiteHotelData[];
    if (hotelList.length === 0) {
      return NextResponse.json({ results: [], error: 'No hotels found', city: cityInfo.name });
    }

    // Step 2: Get rates for these hotels
    const hotelIds = hotelList.slice(0, 10).map(h => h.id).filter(Boolean);
    
    const ratesRes = await fetch(`${BASE}/hotels/rates`, {
      method: 'POST',
      headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        hotelIds,
        checkin,
        checkout,
        occupancies: [{ adults }],
        currency,
        guestNationality: 'AE',
      }),
      signal: AbortSignal.timeout(20000),
    });

    interface LiteRateRoom {
      roomName?: string;
      offerId?: string;
      rate?: { retailRate?: { total?: { amount?: string; currency?: string } }; maxOccupancy?: number };
      boardType?: string;
      cancellationPolicies?: { cancelPolicyInfos?: { type?: string }[] };
    }

    interface LiteRateHotel {
      hotelId?: string;
      rooms?: LiteRateRoom[];
      currency?: string;
    }

    let ratesData: { data?: LiteRateHotel[] } = { data: [] };
    if (ratesRes.ok) {
      ratesData = await ratesRes.json();
    }

    // Build a rates lookup
    const ratesMap = new Map<string, { price: number; currency: string; roomType: string; board: string; freeCancellation: boolean }>();
    for (const rh of (ratesData.data || [])) {
      const cheapest = (rh.rooms || []).sort((a, b) => {
        const pa = parseFloat(a.rate?.retailRate?.total?.amount || '999999');
        const pb = parseFloat(b.rate?.retailRate?.total?.amount || '999999');
        return pa - pb;
      })[0];
      if (cheapest && rh.hotelId) {
        const freeCancel = (cheapest.cancellationPolicies?.cancelPolicyInfos || []).some(p => p.type === 'FREE_CANCELLATION');
        ratesMap.set(rh.hotelId, {
          price: parseFloat(cheapest.rate?.retailRate?.total?.amount || '0'),
          currency: cheapest.rate?.retailRate?.total?.currency || currency,
          roomType: cheapest.roomName || 'Standard Room',
          board: cheapest.boardType || '',
          freeCancellation: freeCancel,
        });
      }
    }

    // Merge hotel info + rates
    const results = hotelList.map(h => {
      const rate = ratesMap.get(h.id || '');
      return {
        id: h.id || '',
        name: h.name || '',
        stars: h.starRating || 0,
        address: h.address || '',
        rating: 0,
        reviews: 0,
        image: h.main_photo || '',
        price: rate?.price || 0,
        originalPrice: 0,
        currency: rate?.currency || currency,
        roomType: rate?.roomType || '',
        board: rate?.board || '',
        freeCancellation: rate?.freeCancellation || false,
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
