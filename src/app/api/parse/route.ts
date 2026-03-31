import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════
// LOCAL NLP PARSER — Zero API cost, instant response
// Supports region searches (e.g. "UAE to Europe")
// ═══════════════════════════════════════════════════

const AIRPORTS: Record<string, { code: string; city: string }> = {
  'dubai': { code: 'DXB', city: 'Dubai' }, 'abu dhabi': { code: 'AUH', city: 'Abu Dhabi' },
  'london': { code: 'LHR', city: 'London' }, 'heathrow': { code: 'LHR', city: 'London' },
  'gatwick': { code: 'LGW', city: 'London' }, 'paris': { code: 'CDG', city: 'Paris' },
  'istanbul': { code: 'IST', city: 'Istanbul' }, 'new york': { code: 'JFK', city: 'New York' },
  'nyc': { code: 'JFK', city: 'New York' }, 'newark': { code: 'EWR', city: 'New York' },
  'la': { code: 'LAX', city: 'Los Angeles' }, 'los angeles': { code: 'LAX', city: 'Los Angeles' },
  'sydney': { code: 'SYD', city: 'Sydney' }, 'melbourne': { code: 'MEL', city: 'Melbourne' },
  'tokyo': { code: 'NRT', city: 'Tokyo' }, 'singapore': { code: 'SIN', city: 'Singapore' },
  'bangkok': { code: 'BKK', city: 'Bangkok' }, 'bali': { code: 'DPS', city: 'Bali' },
  'maldives': { code: 'MLE', city: 'Maldives' }, 'male': { code: 'MLE', city: 'Maldives' },
  'hong kong': { code: 'HKG', city: 'Hong Kong' }, 'kuala lumpur': { code: 'KUL', city: 'Kuala Lumpur' },
  'kl': { code: 'KUL', city: 'Kuala Lumpur' }, 'doha': { code: 'DOH', city: 'Doha' },
  'riyadh': { code: 'RUH', city: 'Riyadh' }, 'jeddah': { code: 'JED', city: 'Jeddah' },
  'cairo': { code: 'CAI', city: 'Cairo' }, 'mumbai': { code: 'BOM', city: 'Mumbai' },
  'delhi': { code: 'DEL', city: 'Delhi' }, 'colombo': { code: 'CMB', city: 'Colombo' },
  'san francisco': { code: 'SFO', city: 'San Francisco' }, 'sf': { code: 'SFO', city: 'San Francisco' },
  'miami': { code: 'MIA', city: 'Miami' }, 'rome': { code: 'FCO', city: 'Rome' },
  'milan': { code: 'MXP', city: 'Milan' }, 'barcelona': { code: 'BCN', city: 'Barcelona' },
  'madrid': { code: 'MAD', city: 'Madrid' }, 'amsterdam': { code: 'AMS', city: 'Amsterdam' },
  'frankfurt': { code: 'FRA', city: 'Frankfurt' }, 'zurich': { code: 'ZRH', city: 'Zurich' },
  'athens': { code: 'ATH', city: 'Athens' }, 'phuket': { code: 'HKT', city: 'Phuket' },
  'manila': { code: 'MNL', city: 'Manila' }, 'jakarta': { code: 'CGK', city: 'Jakarta' },
  'seoul': { code: 'ICN', city: 'Seoul' }, 'osaka': { code: 'KIX', city: 'Osaka' },
  'toronto': { code: 'YYZ', city: 'Toronto' }, 'vancouver': { code: 'YVR', city: 'Vancouver' },
  'auckland': { code: 'AKL', city: 'Auckland' }, 'johannesburg': { code: 'JNB', city: 'Johannesburg' },
  'cape town': { code: 'CPT', city: 'Cape Town' }, 'nairobi': { code: 'NBO', city: 'Nairobi' },
  'muscat': { code: 'MCT', city: 'Muscat' }, 'bahrain': { code: 'BAH', city: 'Bahrain' },
  'kuwait': { code: 'KWI', city: 'Kuwait' }, 'trabzon': { code: 'TZX', city: 'Trabzon' },
  'bodrum': { code: 'BJV', city: 'Bodrum' }, 'antalya': { code: 'AYT', city: 'Antalya' },
  'mauritius': { code: 'MRU', city: 'Mauritius' }, 'seychelles': { code: 'SEZ', city: 'Seychelles' },
  'chicago': { code: 'ORD', city: 'Chicago' }, 'washington': { code: 'IAD', city: 'Washington' },
  'boston': { code: 'BOS', city: 'Boston' }, 'seattle': { code: 'SEA', city: 'Seattle' },
  'perth': { code: 'PER', city: 'Perth' }, 'brisbane': { code: 'BNE', city: 'Brisbane' },
  'hanoi': { code: 'HAN', city: 'Hanoi' }, 'ho chi minh': { code: 'SGN', city: 'Ho Chi Minh' },
  'saigon': { code: 'SGN', city: 'Ho Chi Minh' }, 'taipei': { code: 'TPE', city: 'Taipei' },
  'beijing': { code: 'PEK', city: 'Beijing' }, 'shanghai': { code: 'PVG', city: 'Shanghai' },
  'zanzibar': { code: 'ZNZ', city: 'Zanzibar' }, 'marrakech': { code: 'RAK', city: 'Marrakech' },
  'lisbon': { code: 'LIS', city: 'Lisbon' }, 'dublin': { code: 'DUB', city: 'Dublin' },
  'edinburgh': { code: 'EDI', city: 'Edinburgh' }, 'manchester': { code: 'MAN', city: 'Manchester' },
  'sao paulo': { code: 'GRU', city: 'São Paulo' }, 'mexico city': { code: 'MEX', city: 'Mexico City' },
  'cancun': { code: 'CUN', city: 'Cancún' }, 'hawaii': { code: 'HNL', city: 'Hawaii' },
  'honolulu': { code: 'HNL', city: 'Hawaii' }, 'fiji': { code: 'NAN', city: 'Fiji' },
  'bora bora': { code: 'BOB', city: 'Bora Bora' }, 'nice': { code: 'NCE', city: 'Nice' },
  'vienna': { code: 'VIE', city: 'Vienna' }, 'prague': { code: 'PRG', city: 'Prague' },
  'budapest': { code: 'BUD', city: 'Budapest' }, 'warsaw': { code: 'WAW', city: 'Warsaw' },
  'copenhagen': { code: 'CPH', city: 'Copenhagen' }, 'stockholm': { code: 'ARN', city: 'Stockholm' },
  'oslo': { code: 'OSL', city: 'Oslo' }, 'helsinki': { code: 'HEL', city: 'Helsinki' },
  'brussels': { code: 'BRU', city: 'Brussels' }, 'munich': { code: 'MUC', city: 'Munich' },
  'dusseldorf': { code: 'DUS', city: 'Düsseldorf' }, 'geneva': { code: 'GVA', city: 'Geneva' },
};

// Region → all major airports to search
const REGION_AIRPORTS: Record<string, { code: string; city: string }[]> = {
  'europe': [
    { code: 'LHR', city: 'London' }, { code: 'CDG', city: 'Paris' }, { code: 'IST', city: 'Istanbul' },
    { code: 'FCO', city: 'Rome' }, { code: 'BCN', city: 'Barcelona' }, { code: 'AMS', city: 'Amsterdam' },
    { code: 'FRA', city: 'Frankfurt' }, { code: 'MAD', city: 'Madrid' }, { code: 'ATH', city: 'Athens' },
    { code: 'ZRH', city: 'Zurich' }, { code: 'MXP', city: 'Milan' }, { code: 'LIS', city: 'Lisbon' },
    { code: 'VIE', city: 'Vienna' }, { code: 'PRG', city: 'Prague' }, { code: 'BUD', city: 'Budapest' },
    { code: 'DUB', city: 'Dublin' }, { code: 'CPH', city: 'Copenhagen' }, { code: 'MUC', city: 'Munich' },
  ],
  'asia': [
    { code: 'BKK', city: 'Bangkok' }, { code: 'SIN', city: 'Singapore' }, { code: 'NRT', city: 'Tokyo' },
    { code: 'HKG', city: 'Hong Kong' }, { code: 'KUL', city: 'Kuala Lumpur' }, { code: 'DPS', city: 'Bali' },
    { code: 'ICN', city: 'Seoul' }, { code: 'DEL', city: 'Delhi' }, { code: 'BOM', city: 'Mumbai' },
    { code: 'CMB', city: 'Colombo' }, { code: 'HKT', city: 'Phuket' }, { code: 'SGN', city: 'Ho Chi Minh' },
  ],
  'southeast asia': [
    { code: 'BKK', city: 'Bangkok' }, { code: 'SIN', city: 'Singapore' }, { code: 'KUL', city: 'Kuala Lumpur' },
    { code: 'DPS', city: 'Bali' }, { code: 'HKT', city: 'Phuket' }, { code: 'SGN', city: 'Ho Chi Minh' },
    { code: 'MNL', city: 'Manila' }, { code: 'CGK', city: 'Jakarta' }, { code: 'HAN', city: 'Hanoi' },
  ],
  'usa': [
    { code: 'JFK', city: 'New York' }, { code: 'LAX', city: 'Los Angeles' }, { code: 'MIA', city: 'Miami' },
    { code: 'SFO', city: 'San Francisco' }, { code: 'ORD', city: 'Chicago' }, { code: 'IAD', city: 'Washington' },
    { code: 'BOS', city: 'Boston' }, { code: 'SEA', city: 'Seattle' },
  ],
  'america': [
    { code: 'JFK', city: 'New York' }, { code: 'LAX', city: 'Los Angeles' }, { code: 'MIA', city: 'Miami' },
    { code: 'SFO', city: 'San Francisco' }, { code: 'ORD', city: 'Chicago' }, { code: 'IAD', city: 'Washington' },
  ],
  'united states': [
    { code: 'JFK', city: 'New York' }, { code: 'LAX', city: 'Los Angeles' }, { code: 'MIA', city: 'Miami' },
    { code: 'SFO', city: 'San Francisco' }, { code: 'ORD', city: 'Chicago' }, { code: 'IAD', city: 'Washington' },
  ],
  'australia': [
    { code: 'SYD', city: 'Sydney' }, { code: 'MEL', city: 'Melbourne' }, { code: 'BNE', city: 'Brisbane' },
    { code: 'PER', city: 'Perth' },
  ],
  'middle east': [
    { code: 'DXB', city: 'Dubai' }, { code: 'AUH', city: 'Abu Dhabi' }, { code: 'DOH', city: 'Doha' },
    { code: 'BAH', city: 'Bahrain' }, { code: 'MCT', city: 'Muscat' }, { code: 'RUH', city: 'Riyadh' },
    { code: 'KWI', city: 'Kuwait' },
  ],
  'africa': [
    { code: 'JNB', city: 'Johannesburg' }, { code: 'CPT', city: 'Cape Town' }, { code: 'NBO', city: 'Nairobi' },
    { code: 'CAI', city: 'Cairo' }, { code: 'RAK', city: 'Marrakech' }, { code: 'ZNZ', city: 'Zanzibar' },
    { code: 'MRU', city: 'Mauritius' }, { code: 'SEZ', city: 'Seychelles' },
  ],
  'uk': [
    { code: 'LHR', city: 'London' }, { code: 'MAN', city: 'Manchester' }, { code: 'EDI', city: 'Edinburgh' },
    { code: 'LGW', city: 'London Gatwick' },
  ],
  'scandinavia': [
    { code: 'CPH', city: 'Copenhagen' }, { code: 'ARN', city: 'Stockholm' }, { code: 'OSL', city: 'Oslo' },
    { code: 'HEL', city: 'Helsinki' },
  ],
  'caribbean': [
    { code: 'CUN', city: 'Cancún' }, { code: 'MIA', city: 'Miami' },
  ],
};

// Single-airport region fallbacks
const REGION_SINGLE: Record<string, { code: string; city: string }> = {
  'france': { code: 'CDG', city: 'Paris' }, 'germany': { code: 'FRA', city: 'Frankfurt' },
  'italy': { code: 'FCO', city: 'Rome' }, 'spain': { code: 'MAD', city: 'Madrid' },
  'greece': { code: 'ATH', city: 'Athens' }, 'turkey': { code: 'IST', city: 'Istanbul' },
  'netherlands': { code: 'AMS', city: 'Amsterdam' }, 'holland': { code: 'AMS', city: 'Amsterdam' },
  'switzerland': { code: 'ZRH', city: 'Zurich' }, 'portugal': { code: 'LIS', city: 'Lisbon' },
  'ireland': { code: 'DUB', city: 'Dublin' }, 'scotland': { code: 'EDI', city: 'Edinburgh' },
  'uae': { code: 'DXB', city: 'Dubai' }, 'emirates': { code: 'DXB', city: 'Dubai' },
  'japan': { code: 'NRT', city: 'Tokyo' }, 'thailand': { code: 'BKK', city: 'Bangkok' },
  'indonesia': { code: 'DPS', city: 'Bali' }, 'malaysia': { code: 'KUL', city: 'Kuala Lumpur' },
  'india': { code: 'DEL', city: 'Delhi' }, 'china': { code: 'PEK', city: 'Beijing' },
  'south korea': { code: 'ICN', city: 'Seoul' }, 'korea': { code: 'ICN', city: 'Seoul' },
  'vietnam': { code: 'SGN', city: 'Ho Chi Minh' }, 'philippines': { code: 'MNL', city: 'Manila' },
  'sri lanka': { code: 'CMB', city: 'Colombo' }, 'egypt': { code: 'CAI', city: 'Cairo' },
  'morocco': { code: 'RAK', city: 'Marrakech' }, 'south africa': { code: 'JNB', city: 'Johannesburg' },
  'kenya': { code: 'NBO', city: 'Nairobi' }, 'canada': { code: 'YYZ', city: 'Toronto' },
  'mexico': { code: 'MEX', city: 'Mexico City' }, 'brazil': { code: 'GRU', city: 'São Paulo' },
  'new zealand': { code: 'AKL', city: 'Auckland' }, 'qatar': { code: 'DOH', city: 'Doha' },
  'saudi': { code: 'RUH', city: 'Riyadh' }, 'saudi arabia': { code: 'RUH', city: 'Riyadh' },
  'oman': { code: 'MCT', city: 'Muscat' }, 'bahrain': { code: 'BAH', city: 'Bahrain' },
  'kuwait': { code: 'KWI', city: 'Kuwait' },
  'england': { code: 'LHR', city: 'London' }, 'nordic': { code: 'ARN', city: 'Stockholm' },
  'south america': { code: 'GRU', city: 'São Paulo' }, 'states': { code: 'JFK', city: 'New York' },
};

function findAirport(text: string): { code: string; city: string } | null {
  const lower = text.toLowerCase().trim();
  const iataMatch = text.match(/\b([A-Z]{3})\b/);
  if (iataMatch) {
    const code = iataMatch[1];
    const entry = Object.values(AIRPORTS).find(a => a.code === code);
    if (entry) return entry;
    return { code, city: code };
  }
  const sorted = Object.entries(AIRPORTS).sort((a, b) => b[0].length - a[0].length);
  for (const [name, data] of sorted) {
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(lower)) return data;
  }
  return null;
}

function findRegion(text: string): { code: string; city: string }[] | null {
  const lower = text.toLowerCase().trim();
  // Check multi-airport regions first
  const regionsSorted = Object.entries(REGION_AIRPORTS).sort((a, b) => b[0].length - a[0].length);
  for (const [name, airports] of regionsSorted) {
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(lower)) return airports;
  }
  // Check single-airport regions
  const singleSorted = Object.entries(REGION_SINGLE).sort((a, b) => b[0].length - a[0].length);
  for (const [name, data] of singleSorted) {
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(lower)) return [data];
  }
  return null;
}

function parseDates(text: string): { dates: string[]; isRange: boolean } {
  const now = new Date();
  const lower = text.toLowerCase();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  
  // "next X days" / "within X days" / "in the next X days"
  const nextDays = lower.match(/(?:next|within|in the next|coming)\s+(\d+)\s*days?/);
  if (nextDays) {
    const n = parseInt(nextDays[1]);
    const dates = [];
    for (let i = 0; i < n; i++) dates.push(fmt(new Date(now.getTime() + (i + 1) * 86400000)));
    return { dates, isRange: true };
  }
  
  // "this week" / "this weekend"
  if (/\bthis\s*week\b/.test(lower)) {
    const dates = [];
    for (let i = 0; i < 7; i++) dates.push(fmt(new Date(now.getTime() + i * 86400000)));
    return { dates, isRange: true };
  }
  if (/\bthis\s*weekend\b/.test(lower)) {
    const dayOfWeek = now.getDay();
    const fri = new Date(now.getTime() + ((5 - dayOfWeek + 7) % 7) * 86400000);
    return { dates: [fmt(fri), fmt(new Date(fri.getTime() + 86400000)), fmt(new Date(fri.getTime() + 2 * 86400000))], isRange: true };
  }
  
  if (lower.includes('today')) return { dates: [fmt(now)], isRange: false };
  if (lower.includes('tomorrow')) return { dates: [fmt(new Date(now.getTime() + 86400000))], isRange: false };
  if (lower.includes('next week')) return { dates: [fmt(new Date(now.getTime() + 7 * 86400000))], isRange: false };
  if (lower.includes('next month')) { const d = new Date(now); d.setMonth(d.getMonth() + 1); return { dates: [fmt(d)], isRange: false }; }
  
  const inDays = lower.match(/in (\d+)\s*days?/);
  if (inDays) return { dates: [fmt(new Date(now.getTime() + parseInt(inDays[1]) * 86400000))], isRange: false };
  const inWeeks = lower.match(/in (\d+)\s*weeks?/);
  if (inWeeks) return { dates: [fmt(new Date(now.getTime() + parseInt(inWeeks[1]) * 7 * 86400000))], isRange: false };
  
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const monthMatch = lower.match(new RegExp(`(\\d{1,2})\\s*(?:st|nd|rd|th)?\\s*(${months.join('|')})|(${months.join('|')})\\s*(\\d{1,2})`));
  if (monthMatch) {
    const day = parseInt(monthMatch[1] || monthMatch[4]);
    const month = months.indexOf((monthMatch[2] || monthMatch[3]).toLowerCase());
    const d = new Date(now.getFullYear(), month, day);
    if (d < now) d.setFullYear(now.getFullYear() + 1);
    return { dates: [fmt(d)], isRange: false };
  }
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return { dates: [isoMatch[1]], isRange: false };
  const slashMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (slashMatch) {
    const a = parseInt(slashMatch[1]), b = parseInt(slashMatch[2]);
    const year = slashMatch[3] ? (parseInt(slashMatch[3]) < 100 ? 2000 + parseInt(slashMatch[3]) : parseInt(slashMatch[3])) : now.getFullYear();
    const d = new Date(year, b - 1, a);
    if (d < now && !slashMatch[3]) d.setFullYear(year + 1);
    return { dates: [fmt(d)], isRange: false };
  }
  return { dates: [fmt(new Date(now.getTime() + 7 * 86400000))], isRange: false };
}

export async function POST(request: NextRequest) {
  const { query } = await request.json();
  if (!query) return NextResponse.json({ error: 'No query provided' }, { status: 400 });

  const lower = query.toLowerCase();
  const parts = lower.split(/\s+to\s+|\s*[→\-–>]+\s*/);
  
  // Parse origin
  let origin = findAirport(parts[0] || '') || findRegion(parts[0] || '')?.[0] || null;
  if (!origin) origin = { code: 'DXB', city: 'Dubai' }; // Default to Dubai
  
  // Parse destination — check if it's a region (multi-airport) or single city
  const destText = parts.length > 1 ? parts.slice(1).join(' ') : '';
  const destCity = findAirport(destText);
  const destRegion = !destCity ? findRegion(destText) : null;
  
  // Parse common fields
  let cabin = 'business';
  if (/\b(first\s*class|first)\b/.test(lower)) cabin = 'first';
  else if (/\b(premium\s*econ|premium)\b/.test(lower)) cabin = 'premium';
  else if (/\b(economy|econ|cheap)\b/.test(lower)) cabin = 'economy';
  
  let passengers = 1;
  const paxMatch = lower.match(/(\d+)\s*(people|pax|passengers|adults|person)|family\s*of\s*(\d+)/);
  if (paxMatch) passengers = parseInt(paxMatch[1] || paxMatch[3]);
  if (/\bcouple\b|two of us/.test(lower)) passengers = 2;
  
  let maxBudget: number | null = null;
  const budgetMatch = lower.match(/(?:under|below|max|budget|less than)\s*\$?\s*([\d,]+)/);
  if (budgetMatch) maxBudget = parseInt(budgetMatch[1].replace(/,/g, ''));
  
  let maxPoints: number | null = null;
  const pointsMatch = lower.match(/([\d,]+)\s*k?\s*(points|miles|pts)/);
  if (pointsMatch) { maxPoints = parseInt(pointsMatch[1].replace(/,/g, '')); if (lower.includes('k') && maxPoints < 1000) maxPoints *= 1000; }
  
  const { dates: departDates, isRange: isDateRange } = parseDates(query);
  const departDate = departDates[0];
  const flexible = /\b(flexible|anytime|any\s*date|whenever|no fixed)\b/.test(lower);
  
  // Parse max stops
  let maxStops: number | null = null;
  if (/\b(direct|nonstop|non-stop|no stops?)\b/.test(lower)) maxStops = 0;
  else if (/\b(one stop|1 stop|max 1 stop)\b/.test(lower)) maxStops = 1;
  else if (/\b(two stops?|2 stops?|max 2 stops?)\b/.test(lower)) maxStops = 2;
  // "all the options" / "any stops" / "one stop or two stops" → show everything but tag it
  const wantsAllStops = /\b(all\s*(?:the\s*)?options|any\s*stops?|one\s*stop\s*or\s*two|1\s*stop\s*or\s*2)\b/.test(lower);
  if (wantsAllStops) maxStops = null; // no filter, show all

  const preferences: string[] = [];
  if (/\b(direct|nonstop|non-stop)\b/.test(lower) && !wantsAllStops) preferences.push('direct');
  if (/\b(cheap|cheapest|budget|value)\b/.test(lower)) preferences.push('cheapest');
  if (/\b(points|miles|award)\b/.test(lower)) preferences.push('points');
  if (wantsAllStops) preferences.push('allStops');

  // If region search → return multiple destinations
  if (destRegion && destRegion.length > 1) {
    // Extract just the region name (remove cabin/date/pax words)
    const cleanRegion = destText.replace(/\b(tomorrow|today|next week|next month|business|economy|first|premium|class|cheap|cheapest|\d+\s*people|\d+\s*pax|family of \d+)\b/gi, '').trim();
    return NextResponse.json({
      parsed: {
        origin: origin.code,
        originCity: origin.city,
        isRegionSearch: true,
        regionName: cleanRegion || destText.trim(),
        destinations: destRegion.map(d => ({ code: d.code, city: d.city })),
        departDate,
        departDates,
        isDateRange,
        cabin,
        passengers,
        maxStops,
        flexible,
        maxBudget,
        maxPoints,
        currency: 'USD',
        preferences,
      },
      raw: query,
    });
  }

  // Single destination
  const destination = destCity || destRegion?.[0] || { code: 'LHR', city: 'London' };
  
  return NextResponse.json({
    parsed: {
      origin: origin.code,
      destination: destination.code,
      originCity: origin.city,
      destinationCity: destination.city,
      isRegionSearch: false,
      departDate,
      departDates,
      isDateRange,
      cabin,
      passengers,
      maxStops,
      flexible,
      maxBudget,
      maxPoints,
      currency: 'USD',
      preferences,
    },
    raw: query,
  });
}
