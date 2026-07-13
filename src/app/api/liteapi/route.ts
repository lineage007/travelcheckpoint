import { NextRequest, NextResponse } from 'next/server';
import { addDaysToIsoDate, clampInt, normalizeAirportCode, safeIsoDate } from '@/lib/travel-utils';

// .trim(): several Vercel env values carry a trailing newline from `echo | vercel env add`.
// fetch() trims header values so requests still work, but never rely on that.
const API_KEY = (process.env.LITEAPI_KEY || '').trim();
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
  const destination = normalizeAirportCode(searchParams.get('destination'), 'LHR');
  const checkin = safeIsoDate(searchParams.get('checkin'), 7);
  const rawCheckout = safeIsoDate(searchParams.get('checkout'), 10);
  const checkout = rawCheckout <= checkin ? addDaysToIsoDate(checkin, 3) : rawCheckout;
  const adults = clampInt(searchParams.get('adults'), 2, 1, 9);
  const currency = searchParams.get('currency') || 'USD';

  if (!destination) return NextResponse.json({ results: [], error: 'Invalid airport code' }, { status: 400 });
  if (!API_KEY) return NextResponse.json({ results: [], count: 0, providerStatus: 'missing-key', source: 'liteapi' });

  const cityInfo = AIRPORT_TO_CITY[destination];
  if (!cityInfo) return NextResponse.json({ results: [], count: 0, providerStatus: 'unsupported-destination', source: 'liteapi' });

  try {
    // Step 1: Get hotel list for the city
    const listUrl = `${BASE}/data/hotels?countryCode=${cityInfo.countryCode}&cityName=${encodeURIComponent(cityInfo.name)}&limit=15`;
    const listRes = await fetch(listUrl, {
      headers: { 'X-API-Key': API_KEY, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });

    if (!listRes.ok) {
      return NextResponse.json({ results: [], count: 0, providerStatus: 'unavailable', source: 'liteapi' });
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
      return NextResponse.json({ results: [], count: 0, providerStatus: 'no-results', source: 'liteapi', city: cityInfo.name });
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

    // LiteAPI v3 rates shape: data[].roomTypes[].rates[] with retailRate.total as an
    // ARRAY of {amount, currency}, plus roomType-level offerRetailRate and a per-rate
    // commission array (LiteAPI's built-in revenue share).
    interface LiteMoney { amount?: number; currency?: string }
    interface LiteRate {
      name?: string;
      boardName?: string;
      boardType?: string;
      retailRate?: { total?: LiteMoney[] };
      cancellationPolicies?: { refundableTag?: string; cancelPolicyInfos?: { type?: string }[] };
      commission?: LiteMoney[];
    }
    interface LiteRoomType { offerRetailRate?: LiteMoney; rates?: LiteRate[] }
    interface LiteRateHotel { hotelId?: string; roomTypes?: LiteRoomType[] }

    let ratesData: { data?: LiteRateHotel[]; error?: { code?: number; message?: string } } = { data: [] };
    if (ratesRes.ok) {
      const ratesJson = await ratesRes.json();
      // LiteAPI returns {error: {code, message}} when no rates
      if (ratesJson.data) ratesData = ratesJson;
    }

    const nights = Math.max(1, Math.round((new Date(`${checkout}T00:00:00Z`).getTime() - new Date(`${checkin}T00:00:00Z`).getTime()) / 86400000));

    // Build a rates lookup — cheapest room type per hotel, price shown per night.
    const ratesMap = new Map<string, { price: number; totalPrice: number; currency: string; roomType: string; board: string; freeCancellation: boolean; commission: number }>();
    for (const rh of (ratesData.data || [])) {
      if (!rh.hotelId) continue;
      const roomTypes = (rh.roomTypes || []).filter(rt => (rt.offerRetailRate?.amount || 0) > 0 || (rt.rates?.[0]?.retailRate?.total?.[0]?.amount || 0) > 0);
      const cheapestRt = roomTypes.sort((a, b) => {
        const pa = a.offerRetailRate?.amount ?? a.rates?.[0]?.retailRate?.total?.[0]?.amount ?? Infinity;
        const pb = b.offerRetailRate?.amount ?? b.rates?.[0]?.retailRate?.total?.[0]?.amount ?? Infinity;
        return pa - pb;
      })[0];
      if (!cheapestRt) continue;
      const rate = cheapestRt.rates?.[0];
      const total = cheapestRt.offerRetailRate?.amount ?? rate?.retailRate?.total?.[0]?.amount ?? 0;
      if (total <= 0) continue;
      const tag = rate?.cancellationPolicies?.refundableTag;
      ratesMap.set(rh.hotelId, {
        price: Math.round(total / nights),
        totalPrice: Math.round(total),
        currency: cheapestRt.offerRetailRate?.currency || rate?.retailRate?.total?.[0]?.currency || currency,
        roomType: rate?.name || 'Standard Room',
        board: rate?.boardName || rate?.boardType || '',
        freeCancellation: tag === 'RFN' || (rate?.cancellationPolicies?.cancelPolicyInfos || []).some(p => p.type === 'FREE_CANCELLATION'),
        commission: rate?.commission?.[0]?.amount || 0,
      });
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
        price: rate?.price || null,
        totalPrice: rate?.totalPrice || null,
        nights,
        originalPrice: 0,
        currency: rate?.currency || currency,
        roomType: rate?.roomType || 'Check rates',
        board: rate?.board || '',
        freeCancellation: rate?.freeCancellation || false,
        commission: rate?.commission || 0,
        source: 'liteapi',
      };
    });

    // If we have rates, sort by price. If sandbox (no rates), still show hotels
    const withRates = results.filter(h => typeof h.price === 'number' && h.price > 0).sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
    const finalResults = withRates.length > 0 ? withRates : results.slice(0, 10);
    const sandboxMode = withRates.length === 0 && results.length > 0;

    return NextResponse.json({
      results: finalResults,
      count: finalResults.length,
      city: cityInfo.name,
      checkin,
      checkout,
      currency,
      sandbox: sandboxMode,
      providerStatus: withRates.length > 0 ? 'live-rates' : 'hotel-list-only',
      source: 'liteapi',
    });
  } catch {
    return NextResponse.json({ results: [], count: 0, providerStatus: 'unavailable', source: 'liteapi' });
  }
}
