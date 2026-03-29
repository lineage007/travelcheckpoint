import { NextRequest, NextResponse } from 'next/server';

const SEATS_API_KEY = process.env.SEATS_AERO_API_KEY || '';

// Airline name mapping
const AIRLINE_NAMES: Record<string, string> = {
  EK: 'Emirates', QR: 'Qatar Airways', EY: 'Etihad', TK: 'Turkish Airlines',
  BA: 'British Airways', LH: 'Lufthansa', SQ: 'Singapore Airlines', CX: 'Cathay Pacific',
  NH: 'ANA', JL: 'Japan Airlines', AC: 'Air Canada', UA: 'United', AA: 'American Airlines',
  DL: 'Delta', AF: 'Air France', KL: 'KLM', LX: 'Swiss', OS: 'Austrian', SK: 'SAS',
  TP: 'TAP Portugal', TG: 'Thai Airways', MH: 'Malaysia Airlines', GA: 'Garuda',
  SV: 'Saudia', GF: 'Gulf Air', WY: 'Oman Air', AI: 'Air India', VS: 'Virgin Atlantic',
};

// Source to loyalty program mapping
const SOURCE_PROGRAMS: Record<string, { name: string; transferFrom: string[] }> = {
  emirates: { name: 'Emirates Skywards', transferFrom: ['Amex MR', 'Citi TY', 'Marriott'] },
  qantas: { name: 'Qantas Frequent Flyer', transferFrom: ['Amex MR'] },
  united: { name: 'United MileagePlus', transferFrom: ['Amex MR (via Marriott)', 'Chase UR'] },
  aeroplan: { name: 'Aeroplan', transferFrom: ['Amex MR', 'Chase UR'] },
  american: { name: 'AAdvantage', transferFrom: ['Marriott'] },
  alaska: { name: 'Alaska Mileage Plan', transferFrom: ['Marriott'] },
  virgin_atlantic: { name: 'Virgin Atlantic Flying Club', transferFrom: ['Amex MR', 'Chase UR', 'Citi TY'] },
  singapore: { name: 'KrisFlyer', transferFrom: ['Amex MR', 'Chase UR', 'Citi TY'] },
  turkish: { name: 'Miles&Smiles', transferFrom: ['Citi TY'] },
  etihad: { name: 'Etihad Guest', transferFrom: ['Amex MR', 'Citi TY'] },
  cathay: { name: 'Asia Miles', transferFrom: ['Amex MR', 'Citi TY'] },
  lufthansa: { name: 'Miles & More', transferFrom: ['Amex MR'] },
};

const SOURCES = ['emirates', 'etihad', 'turkish', 'virgin_atlantic', 'singapore', 'aeroplan', 'united', 'american', 'alaska', 'qantas', 'cathay', 'lufthansa'];

interface AwardResult {
  id: string;
  type: 'points';
  airline: string;
  airlineCode: string;
  route: string;
  origin: string;
  destination: string;
  date: string;
  cabin: string;
  miles: number;
  taxes: number;
  taxesCurrency: string;
  seats: number;
  isDirect: boolean;
  source: string;
  program: string;
  transferFrom: string[];
}

async function searchAwards(origin: string, destination: string, cabin: string, startDate: string, endDate: string): Promise<AwardResult[]> {
  if (!SEATS_API_KEY) return [];
  
  const results: AwardResult[] = [];
  const cabinKey = cabin === 'first' ? 'F' : cabin === 'business' ? 'J' : cabin === 'premium' ? 'W' : 'Y';

  // Search across multiple sources in parallel
  const searches = SOURCES.map(async (source) => {
    try {
      const url = `https://seats.aero/partnerapi/availability?source=${source}&origin=${origin}&destination=${destination}&cabin=${cabin}`;
      const res = await fetch(url, {
        headers: { 'Partner-Authorization': SEATS_API_KEY, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      const items = data.data || data || [];
      
      return items
        .filter((r: Record<string, unknown>) => {
          const date = r.Date as string;
          if (startDate && date < startDate) return false;
          if (endDate && date > endDate) return false;
          return r[`${cabinKey}Available`] === true;
        })
        .filter((r: Record<string, unknown>) => {
          const route = r.Route as Record<string, string> | undefined;
          if (!route) return false;
          return route.OriginAirport === origin && route.DestinationAirport === destination;
        })
        .map((r: Record<string, unknown>): AwardResult => {
          const route = r.Route as Record<string, string>;
          const airlineCode = (r[`${cabinKey}Airlines`] as string || r[`${cabinKey}DirectAirlines`] as string || '').split(',')[0];
          const program = SOURCE_PROGRAMS[source];
          return {
            id: r.ID as string,
            type: 'points',
            airline: AIRLINE_NAMES[airlineCode] || airlineCode || source,
            airlineCode,
            route: `${route.OriginAirport} → ${route.DestinationAirport}`,
            origin: route.OriginAirport,
            destination: route.DestinationAirport,
            date: r.Date as string,
            cabin: cabinKey === 'J' ? 'Business' : cabinKey === 'F' ? 'First' : cabinKey === 'W' ? 'Premium Economy' : 'Economy',
            miles: (r[`${cabinKey}MileageCostRaw`] as number) || parseInt(r[`${cabinKey}MileageCost`] as string || '0'),
            taxes: ((r[`${cabinKey}TotalTaxesRaw`] as number) || 0) / 100, // Convert cents to dollars
            taxesCurrency: (r.TaxesCurrency as string) || 'USD',
            seats: (r[`${cabinKey}RemainingSeats`] as number) || 0,
            isDirect: (r[`${cabinKey}Direct`] as boolean) || false,
            source,
            program: program?.name || source,
            transferFrom: program?.transferFrom || [],
          };
        });
    } catch {
      return [];
    }
  });

  const allResults = await Promise.all(searches);
  allResults.forEach(batch => results.push(...batch));

  // Sort by miles cost (ascending)
  results.sort((a, b) => a.miles - b.miles);
  
  return results;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = (searchParams.get('origin') || 'DXB').toUpperCase();
  const destination = (searchParams.get('destination') || 'LHR').toUpperCase();
  const cabin = searchParams.get('cabin') || 'business';
  const startDate = searchParams.get('start_date') || '';
  const endDate = searchParams.get('end_date') || '';

  try {
    const awards = await searchAwards(origin, destination, cabin, startDate, endDate);
    
    return NextResponse.json({
      query: { origin, destination, cabin, startDate, endDate },
      results: {
        awards: awards.slice(0, 50),
        cash: [], // TODO: wire fli
        hiddenCity: [], // TODO: wire skiplagged
        emptyLegs: [], // TODO: wire charter APIs
      },
      meta: {
        totalAwards: awards.length,
        sourcesSearched: SOURCES.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Search failed', details: String(error) }, { status: 500 });
  }
}
