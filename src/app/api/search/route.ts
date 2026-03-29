import { NextRequest, NextResponse } from 'next/server';

const SEATS_API_KEY = process.env.SEATS_AERO_API_KEY || '';

// ═══════════════════════════════════════════════════
// AIRLINE & PROGRAM MAPPINGS
// ═══════════════════════════════════════════════════

const AIRLINE_NAMES: Record<string, string> = {
  EK: 'Emirates', QR: 'Qatar Airways', EY: 'Etihad', TK: 'Turkish Airlines',
  BA: 'British Airways', LH: 'Lufthansa', SQ: 'Singapore Airlines', CX: 'Cathay Pacific',
  NH: 'ANA', JL: 'Japan Airlines', AC: 'Air Canada', UA: 'United', AA: 'American Airlines',
  DL: 'Delta', AF: 'Air France', KL: 'KLM', LX: 'Swiss', OS: 'Austrian',
  TG: 'Thai Airways', MH: 'Malaysia Airlines', SV: 'Saudia', GF: 'Gulf Air',
  WY: 'Oman Air', AI: 'Air India', VS: 'Virgin Atlantic', QF: 'Qantas',
  AS: 'Alaska Airlines', TP: 'TAP Portugal', AZ: 'ITA Airways',
};

const SOURCE_PROGRAMS: Record<string, { name: string; transferFrom: string[] }> = {
  emirates: { name: 'Emirates Skywards', transferFrom: ['Amex MR', 'Citi TY', 'Marriott'] },
  etihad: { name: 'Etihad Guest', transferFrom: ['Amex MR', 'Citi TY'] },
  turkish: { name: 'Miles&Smiles', transferFrom: ['Citi TY'] },
  virgin_atlantic: { name: 'Virgin Atlantic Flying Club', transferFrom: ['Amex MR', 'Chase UR', 'Citi TY'] },
  singapore: { name: 'KrisFlyer', transferFrom: ['Amex MR', 'Chase UR', 'Citi TY'] },
  aeroplan: { name: 'Aeroplan', transferFrom: ['Amex MR', 'Chase UR'] },
  united: { name: 'United MileagePlus', transferFrom: ['Chase UR'] },
  american: { name: 'AAdvantage', transferFrom: ['Marriott'] },
  alaska: { name: 'Alaska Mileage Plan', transferFrom: ['Marriott'] },
  qantas: { name: 'Qantas Frequent Flyer', transferFrom: ['Amex MR'] },
  cathay: { name: 'Asia Miles', transferFrom: ['Amex MR', 'Citi TY'] },
  lufthansa: { name: 'Miles & More', transferFrom: ['Amex MR'] },
};

const SOURCES = Object.keys(SOURCE_PROGRAMS);

// ═══════════════════════════════════════════════════
// 1. AWARD FLIGHTS (Seats.aero)
// ═══════════════════════════════════════════════════

interface AwardResult {
  id: string; type: 'points'; airline: string; airlineCode: string;
  route: string; origin: string; destination: string; date: string;
  cabin: string; miles: number; taxes: number; taxesCurrency: string;
  seats: number; isDirect: boolean; source: string; program: string;
  transferFrom: string[];
}

async function searchAwards(origin: string, destination: string, cabin: string): Promise<AwardResult[]> {
  if (!SEATS_API_KEY) return [];
  const cabinKey = cabin === 'first' ? 'F' : cabin === 'business' ? 'J' : cabin === 'premium' ? 'W' : 'Y';
  const results: AwardResult[] = [];

  const searches = SOURCES.map(async (source) => {
    try {
      const res = await fetch(
        `https://seats.aero/partnerapi/availability?source=${source}&origin=${origin}&destination=${destination}&cabin=${cabin}`,
        { headers: { 'Partner-Authorization': SEATS_API_KEY }, signal: AbortSignal.timeout(12000) }
      );
      if (!res.ok) return [];
      const data = await res.json();
      const items = data.data || data || [];

      return items
        .filter((r: Record<string, unknown>) => {
          const route = r.Route as Record<string, string> | undefined;
          if (!route) return false;
          return route.OriginAirport === origin && route.DestinationAirport === destination && r[`${cabinKey}Available`] === true;
        })
        .map((r: Record<string, unknown>): AwardResult => {
          const route = r.Route as Record<string, string>;
          const airlineCode = ((r[`${cabinKey}Airlines`] || r[`${cabinKey}DirectAirlines`] || '') as string).split(',')[0];
          const program = SOURCE_PROGRAMS[source];
          return {
            id: r.ID as string, type: 'points',
            airline: AIRLINE_NAMES[airlineCode] || airlineCode || source,
            airlineCode, route: `${route.OriginAirport} → ${route.DestinationAirport}`,
            origin: route.OriginAirport, destination: route.DestinationAirport,
            date: r.Date as string,
            cabin: cabinKey === 'J' ? 'Business' : cabinKey === 'F' ? 'First' : cabinKey === 'W' ? 'Premium Economy' : 'Economy',
            miles: (r[`${cabinKey}MileageCostRaw`] as number) || parseInt(r[`${cabinKey}MileageCost`] as string || '0'),
            taxes: ((r[`${cabinKey}TotalTaxesRaw`] as number) || 0) / 100,
            taxesCurrency: (r.TaxesCurrency as string) || 'USD',
            seats: (r[`${cabinKey}RemainingSeats`] as number) || 0,
            isDirect: (r[`${cabinKey}Direct`] as boolean) || false,
            source, program: program?.name || source,
            transferFrom: program?.transferFrom || [],
          };
        });
    } catch { return []; }
  });

  (await Promise.all(searches)).forEach(batch => results.push(...batch));
  results.sort((a, b) => a.miles - b.miles);
  return results;
}

// ═══════════════════════════════════════════════════
// 2. CASH FLIGHTS (Google Flights via npm package)
// ═══════════════════════════════════════════════════

interface CashResult {
  id: string; type: 'cash'; airline: string; flights: string;
  route: string; origin: string; destination: string;
  price: number; currency: string;
  departureTime: string; arrivalTime: string;
  duration: string; stops: number; date: string;
  cabin: string; bookingUrl: string;
}

async function searchCashFlights(origin: string, destination: string, date: string, cabin: string): Promise<CashResult[]> {
  const departDate = date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const serpApiKey = process.env.SERPAPI_KEY || '';
  
  // SerpAPI Google Flights — real prices from Google Flights
  if (serpApiKey) {
    try {
      const travelClass = cabin === 'first' ? 4 : cabin === 'business' ? 3 : cabin === 'premium' ? 2 : 1;
      const url = `https://serpapi.com/search.json?engine=google_flights&departure_id=${origin}&arrival_id=${destination}&outbound_date=${departDate}&type=2&travel_class=${travelClass}&currency=USD&hl=en&api_key=${serpApiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const data = await res.json();
        const allFlights = [...(data.best_flights || []), ...(data.other_flights || [])];
        return allFlights.map((f: Record<string, unknown>, i: number): CashResult => {
          const legs = (f.flights as Record<string, unknown>[]) || [];
          const firstLeg = legs[0] || {};
          const lastLeg = legs[legs.length - 1] || {};
          const airline = String(firstLeg.airline || 'Unknown');
          const flightNums = legs.map((l: Record<string, unknown>) => `${l.airline || ''} ${l.flight_number || ''}`).join(', ');
          const depAirport = (firstLeg.departure_airport as Record<string, string>) || {};
          const arrAirport = (lastLeg.arrival_airport as Record<string, string>) || {};
          return {
            id: `cash-${i}`,
            type: 'cash' as const,
            airline,
            flights: flightNums,
            route: `${origin} → ${destination}`,
            origin, destination,
            price: (f.price as number) || 0,
            currency: 'USD',
            departureTime: depAirport.time || '',
            arrivalTime: arrAirport.time || '',
            duration: `${(f.total_duration as number) || 0} min`,
            stops: legs.length - 1,
            date: departDate,
            cabin: cabin.charAt(0).toUpperCase() + cabin.slice(1),
            bookingUrl: `https://www.google.com/travel/flights?q=${origin}+to+${destination}+${departDate}+${cabin}`,
          };
        }).filter((f: CashResult) => f.price > 0).sort((a: CashResult, b: CashResult) => a.price - b.price);
      }
    } catch { /* fall through to links */ }
  }
  
  // Fallback: deep links to search engines
  const googleUrl = `https://www.google.com/travel/flights?q=${origin}+to+${destination}+on+${departDate}+${cabin}+class`;
  const skyUrl = `https://www.skyscanner.ae/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${departDate.replace(/-/g, '').slice(2)}/?adultsv2=1&cabinclass=${cabin}&ref=home`;
  
  return [
    {
      id: 'google-flights',
      type: 'cash' as const,
      airline: 'Google Flights',
      flights: 'Compare prices across all airlines',
      route: `${origin} → ${destination}`,
      origin, destination,
      price: 0,
      currency: 'USD',
      departureTime: '', arrivalTime: '', duration: '',
      stops: 0, date: departDate,
      cabin: cabin.charAt(0).toUpperCase() + cabin.slice(1),
      bookingUrl: googleUrl,
    },
    {
      id: 'skyscanner',
      type: 'cash' as const,
      airline: 'Skyscanner',
      flights: 'Compare prices across all airlines',
      route: `${origin} → ${destination}`,
      origin, destination,
      price: 0,
      currency: 'USD',
      departureTime: '', arrivalTime: '', duration: '',
      stops: 0, date: departDate,
      cabin: cabin.charAt(0).toUpperCase() + cabin.slice(1),
      bookingUrl: skyUrl,
    },
  ];
}

// ═══════════════════════════════════════════════════
// 3. EMPTY LEGS (aggregated from public sources)
// ═══════════════════════════════════════════════════

interface EmptyLegResult {
  id: string; type: 'empty'; aircraft: string; route: string;
  origin: string; destination: string; price: number; currency: string;
  maxPax: number; date: string; departureTime: string;
  broker: string; brokerUrl: string;
}

async function searchEmptyLegs(origin: string): Promise<EmptyLegResult[]> {
  // Empty leg APIs are mostly behind paywalls or require partnerships
  // For now, aggregate from known public feeds
  // TODO: Wire LunaJets, PrivateFly, Victor, JetSmarter APIs when keys available
  
  const regionLegs: EmptyLegResult[] = [];
  
  // Check if origin is in UAE/Gulf region
  const gulfAirports = ['DXB', 'AUH', 'SHJ', 'DWC', 'DOH', 'BAH', 'KWI', 'MCT', 'RUH', 'JED'];
  if (!gulfAirports.includes(origin)) return [];

  // Scrape available empty legs from public listing pages
  try {
    const res = await fetch('https://www.privatefly.com/api/empty-legs?region=middle-east', {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'TravelCheckpoint/1.0' },
    }).catch(() => null);
    
    if (res && res.ok) {
      const data = await res.json();
      // Parse response if available
      if (Array.isArray(data)) {
        data.slice(0, 10).forEach((leg: Record<string, unknown>, i: number) => {
          regionLegs.push({
            id: `empty-${i}`,
            type: 'empty',
            aircraft: (leg.aircraft as string) || 'Light Jet',
            route: `${leg.origin || origin} → ${leg.destination || 'TBD'}`,
            origin: (leg.origin as string) || origin,
            destination: (leg.destination as string) || '',
            price: (leg.price as number) || 0,
            currency: 'USD',
            maxPax: (leg.passengers as number) || 6,
            date: (leg.date as string) || '',
            departureTime: (leg.time as string) || '',
            broker: 'PrivateFly',
            brokerUrl: 'https://www.privatefly.com/empty-legs',
          });
        });
      }
    }
  } catch { /* API may not be public */ }

  // If no live data, return curated known empty leg sources for the region
  if (regionLegs.length === 0) {
    // These are sourced from public empty leg listing pages
    regionLegs.push(
      { id: 'el-1', type: 'empty', aircraft: 'Check LunaJets', route: `${origin} → Various`, origin, destination: 'Various', price: 0, currency: 'USD', maxPax: 0, date: 'Check live', departureTime: '', broker: 'LunaJets', brokerUrl: 'https://www.lunajets.com/en/empty-leg-flights/' },
      { id: 'el-2', type: 'empty', aircraft: 'Check PrivateFly', route: `${origin} → Various`, origin, destination: 'Various', price: 0, currency: 'USD', maxPax: 0, date: 'Check live', departureTime: '', broker: 'PrivateFly', brokerUrl: 'https://www.privatefly.com/empty-legs' },
      { id: 'el-3', type: 'empty', aircraft: 'Check Victor', route: `${origin} → Various`, origin, destination: 'Various', price: 0, currency: 'USD', maxPax: 0, date: 'Check live', departureTime: '', broker: 'Victor', brokerUrl: 'https://www.flyvictor.com/empty-legs/' },
    );
  }

  return regionLegs;
}

// ═══════════════════════════════════════════════════
// 4. HIDDEN CITY DETECTION
// ═══════════════════════════════════════════════════

interface HiddenCityResult {
  id: string; type: 'hidden'; airline: string; flights: string;
  route: string; exitAt: string; fullRoute: string;
  price: number; savings: number; currency: string;
  date: string; departureTime: string; arrivalTime: string;
  duration: string; cabin: string;
  warnings: string[];
}

async function searchHiddenCity(origin: string, destination: string, date: string, cabin: string): Promise<HiddenCityResult[]> {
  // Hidden city detection requires comparing prices across multiple routes
  // Skiplagged.com link for manual checking
  return [{
    id: 'hc-link',
    type: 'hidden' as const,
    airline: 'Check Skiplagged',
    flights: '',
    route: origin + ' → ' + destination,
    exitAt: destination,
    fullRoute: origin + ' → ' + destination + ' → onwards',
    price: 0,
    savings: 0,
    currency: 'USD',
    date: date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    departureTime: '',
    arrivalTime: '',
    duration: '',
    cabin: cabin.charAt(0).toUpperCase() + cabin.slice(1),
    warnings: ['Check skiplagged.com for hidden city routes from ' + origin + ' to ' + destination],
  }];
}

// ═══════════════════════════════════════════════════
// MAIN SEARCH ENDPOINT
// ═══════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = (searchParams.get('origin') || 'DXB').toUpperCase();
  const destination = (searchParams.get('destination') || 'LHR').toUpperCase();
  const cabin = searchParams.get('cabin') || 'business';
  const date = searchParams.get('date') || '';

  const startTime = Date.now();

  try {
    // Fan out all searches in parallel
    const [awards, cash, emptyLegs, hiddenCity] = await Promise.all([
      searchAwards(origin, destination, cabin),
      searchCashFlights(origin, destination, date, cabin),
      searchEmptyLegs(origin),
      searchHiddenCity(origin, destination, date, cabin),
    ]);

    const elapsed = Date.now() - startTime;

    // Calculate best value across all types
    const allResults = [
      ...awards.map(a => ({ ...a, sortValue: a.miles / 100 })), // rough miles-to-dollar conversion
      ...cash.map(c => ({ ...c, sortValue: c.price })),
      ...hiddenCity.map(h => ({ ...h, sortValue: h.price })),
    ];
    allResults.sort((a, b) => a.sortValue - b.sortValue);

    return NextResponse.json({
      query: { origin, destination, cabin, date },
      results: {
        bestValue: allResults.slice(0, 10),
        awards: awards.slice(0, 30),
        cash: cash.slice(0, 20),
        hiddenCity: hiddenCity.slice(0, 10),
        emptyLegs,
      },
      meta: {
        totalResults: awards.length + cash.length + hiddenCity.length + emptyLegs.length,
        awardResults: awards.length,
        cashResults: cash.length,
        hiddenCityResults: hiddenCity.length,
        emptyLegResults: emptyLegs.length,
        sourcesSearched: SOURCES.length + 1, // +1 for Google Flights
        elapsed: `${elapsed}ms`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Search failed', details: String(error) }, { status: 500 });
  }
}
