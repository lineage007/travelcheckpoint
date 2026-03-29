import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

interface ParsedQuery {
  origin: string;
  destination: string;
  originCity: string;
  destinationCity: string;
  departDate: string;
  returnDate: string;
  cabin: string;
  passengers: number;
  tripType: 'one-way' | 'round-trip' | 'multi-city';
  flexible: boolean;
  maxBudget: number | null;
  maxPoints: number | null;
  currency: string;
  preferences: string[];
}

export async function POST(request: NextRequest) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const { query } = await request.json();
  if (!query) {
    return NextResponse.json({ error: 'No query provided' }, { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const nextWeekStart = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const nextWeekEnd = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: `Parse this flight search query into structured JSON. Today is ${today}.

Query: "${query}"

Return ONLY valid JSON with these fields:
{
  "origin": "3-letter IATA code (default DXB if not specified or if UAE/Dubai mentioned)",
  "destination": "3-letter IATA code",
  "originCity": "city name",
  "destinationCity": "city name",
  "departDate": "YYYY-MM-DD (use ${nextWeekStart} if 'next week', ${tomorrow} if 'tomorrow', best guess for relative dates)",
  "returnDate": "YYYY-MM-DD or empty string if one-way",
  "cabin": "economy|premium|business|first (default business)",
  "passengers": number (default 1, parse 'family of X', 'X people', etc),
  "tripType": "one-way|round-trip",
  "flexible": true if dates are flexible or 'anytime' mentioned,
  "maxBudget": number in USD or null,
  "maxPoints": number or null,
  "currency": "USD" (or AED if UAE context),
  "preferences": ["direct", "cheapest", "points", "cash", etc]
}

Airport codes: Dubai=DXB, Abu Dhabi=AUH, London=LHR, Heathrow=LHR, Gatwick=LGW, Paris=CDG, Istanbul=IST, New York=JFK, Newark=EWR, LA=LAX, Sydney=SYD, Melbourne=MEL, Tokyo=NRT/HND, Singapore=SIN, Bangkok=BKK, Bali=DPS, Maldives=MLE, Hong Kong=HKG, Kuala Lumpur=KUL, Doha=DOH, Riyadh=RUH, Jeddah=JED, Cairo=CAI, Mumbai=BOM, Delhi=DEL, Colombo=CMB, Male=MLE, San Francisco=SFO, Miami=MIA, Rome=FCO, Milan=MXP, Barcelona=BCN, Madrid=MAD, Amsterdam=AMS, Frankfurt=FRA, Zurich=ZRH, Athens=ATH, Phuket=HKT, Manila=MNL, Jakarta=CGK, Seoul=ICN, Osaka=KIX, Toronto=YYZ, Vancouver=YVR, Auckland=AKL, Johannesburg=JNB, Cape Town=CPT, Nairobi=NBO, Muscat=MCT, Bahrain=BAH, Kuwait=KWI, Trabzon=TZX, Bodrum=BJV, Antalya=AYT, Mauritius=MRU, Seychelles=SEZ

JSON only, no explanation:`
        }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: 'Anthropic API error', status: res.status, details: errText.slice(0, 200) }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content?.[0]?.text || '{}';
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse query', raw_response: text.slice(0, 200) }, { status: 500 });
    }

    const parsed: ParsedQuery = JSON.parse(jsonMatch[0]);
    
    return NextResponse.json({ parsed, raw: query });
  } catch (error) {
    return NextResponse.json({ error: 'Parse failed', details: String(error) }, { status: 500 });
  }
}
