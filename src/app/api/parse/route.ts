import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════
// LOCAL NLP PARSER — Zero API cost, instant response
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
};

// Region / country → primary airport mapping
const REGIONS: Record<string, { code: string; city: string }> = {
  'europe': { code: 'LHR', city: 'London' },
  'uk': { code: 'LHR', city: 'London' }, 'england': { code: 'LHR', city: 'London' },
  'france': { code: 'CDG', city: 'Paris' }, 'germany': { code: 'FRA', city: 'Frankfurt' },
  'italy': { code: 'FCO', city: 'Rome' }, 'spain': { code: 'MAD', city: 'Madrid' },
  'greece': { code: 'ATH', city: 'Athens' }, 'turkey': { code: 'IST', city: 'Istanbul' },
  'netherlands': { code: 'AMS', city: 'Amsterdam' }, 'holland': { code: 'AMS', city: 'Amsterdam' },
  'switzerland': { code: 'ZRH', city: 'Zurich' }, 'portugal': { code: 'LIS', city: 'Lisbon' },
  'ireland': { code: 'DUB', city: 'Dublin' }, 'scotland': { code: 'EDI', city: 'Edinburgh' },
  'uae': { code: 'DXB', city: 'Dubai' }, 'emirates': { code: 'DXB', city: 'Dubai' },
  'usa': { code: 'JFK', city: 'New York' }, 'america': { code: 'JFK', city: 'New York' },
  'united states': { code: 'JFK', city: 'New York' }, 'states': { code: 'JFK', city: 'New York' },
  'australia': { code: 'SYD', city: 'Sydney' }, 'japan': { code: 'NRT', city: 'Tokyo' },
  'thailand': { code: 'BKK', city: 'Bangkok' }, 'indonesia': { code: 'DPS', city: 'Bali' },
  'malaysia': { code: 'KUL', city: 'Kuala Lumpur' }, 'india': { code: 'DEL', city: 'Delhi' },
  'china': { code: 'PEK', city: 'Beijing' }, 'south korea': { code: 'ICN', city: 'Seoul' },
  'korea': { code: 'ICN', city: 'Seoul' }, 'vietnam': { code: 'SGN', city: 'Ho Chi Minh' },
  'philippines': { code: 'MNL', city: 'Manila' }, 'sri lanka': { code: 'CMB', city: 'Colombo' },
  'egypt': { code: 'CAI', city: 'Cairo' }, 'morocco': { code: 'RAK', city: 'Marrakech' },
  'south africa': { code: 'JNB', city: 'Johannesburg' }, 'kenya': { code: 'NBO', city: 'Nairobi' },
  'canada': { code: 'YYZ', city: 'Toronto' }, 'mexico': { code: 'MEX', city: 'Mexico City' },
  'brazil': { code: 'GRU', city: 'São Paulo' }, 'new zealand': { code: 'AKL', city: 'Auckland' },
  'qatar': { code: 'DOH', city: 'Doha' }, 'saudi': { code: 'RUH', city: 'Riyadh' },
  'saudi arabia': { code: 'RUH', city: 'Riyadh' }, 'oman': { code: 'MCT', city: 'Muscat' },
  'bahrain': { code: 'BAH', city: 'Bahrain' }, 'kuwait': { code: 'KWI', city: 'Kuwait' },
  'asia': { code: 'BKK', city: 'Bangkok' }, 'southeast asia': { code: 'BKK', city: 'Bangkok' },
  'middle east': { code: 'DXB', city: 'Dubai' }, 'africa': { code: 'NBO', city: 'Nairobi' },
  'caribbean': { code: 'CUN', city: 'Cancún' }, 'south america': { code: 'GRU', city: 'São Paulo' },
  'scandinavia': { code: 'ARN', city: 'Stockholm' }, 'nordic': { code: 'ARN', city: 'Stockholm' },
};

function findAirport(text: string): { code: string; city: string } | null {
  const lower = text.toLowerCase().trim();
  // Check for IATA codes first (3 uppercase letters)
  const iataMatch = text.match(/\b([A-Z]{3})\b/);
  if (iataMatch) {
    const code = iataMatch[1];
    const entry = Object.values(AIRPORTS).find(a => a.code === code);
    if (entry) return entry;
    return { code, city: code };
  }
  // Check city names (longest match first, word boundary required)
  const sorted = Object.entries(AIRPORTS).sort((a, b) => b[0].length - a[0].length);
  for (const [name, data] of sorted) {
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(lower)) return data;
  }
  // Check regions/countries (word boundary required)
  const regionsSorted = Object.entries(REGIONS).sort((a, b) => b[0].length - a[0].length);
  for (const [name, data] of regionsSorted) {
    const re = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(lower)) return data;
  }
  return null;
}

function parseDate(text: string): string {
  const now = new Date();
  const lower = text.toLowerCase();
  
  if (lower.includes('tomorrow')) {
    const d = new Date(now.getTime() + 86400000);
    return d.toISOString().split('T')[0];
  }
  if (lower.includes('next week')) {
    const d = new Date(now.getTime() + 7 * 86400000);
    return d.toISOString().split('T')[0];
  }
  if (lower.includes('next month')) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  }
  
  // Match "in X days/weeks"
  const inDays = lower.match(/in (\d+)\s*days?/);
  if (inDays) { const d = new Date(now.getTime() + parseInt(inDays[1]) * 86400000); return d.toISOString().split('T')[0]; }
  const inWeeks = lower.match(/in (\d+)\s*weeks?/);
  if (inWeeks) { const d = new Date(now.getTime() + parseInt(inWeeks[1]) * 7 * 86400000); return d.toISOString().split('T')[0]; }
  
  // Match month names
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const monthMatch = lower.match(new RegExp(`(\\d{1,2})\\s*(?:st|nd|rd|th)?\\s*(${months.join('|')})|(${months.join('|')})\\s*(\\d{1,2})`));
  if (monthMatch) {
    const day = parseInt(monthMatch[1] || monthMatch[4]);
    const monthName = (monthMatch[2] || monthMatch[3]).toLowerCase();
    const month = months.indexOf(monthName);
    const year = now.getFullYear();
    const d = new Date(year, month, day);
    if (d < now) d.setFullYear(year + 1);
    return d.toISOString().split('T')[0];
  }
  
  // Match YYYY-MM-DD
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  
  // Match DD/MM or MM/DD
  const slashMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (slashMatch) {
    const a = parseInt(slashMatch[1]), b = parseInt(slashMatch[2]);
    const year = slashMatch[3] ? (parseInt(slashMatch[3]) < 100 ? 2000 + parseInt(slashMatch[3]) : parseInt(slashMatch[3])) : now.getFullYear();
    // Assume DD/MM for non-US
    const d = new Date(year, b - 1, a);
    if (d < now && !slashMatch[3]) d.setFullYear(year + 1);
    return d.toISOString().split('T')[0];
  }
  
  // Default: 7 days from now
  return new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
}

export async function POST(request: NextRequest) {
  const { query } = await request.json();
  if (!query) return NextResponse.json({ error: 'No query provided' }, { status: 400 });

  const lower = query.toLowerCase();
  
  // Parse origin and destination
  // Split on "to", "→", "->", "–"
  const parts = lower.split(/\s+to\s+|\s*[→\-–>]+\s*/);
  let origin = findAirport(parts[0] || '');
  let destination = parts.length > 1 ? findAirport(parts.slice(1).join(' ')) : null;
  
  // If no clear split, try to find two airports in the text
  if (!destination) {
    const allMatches: { code: string; city: string; pos: number }[] = [];
    const sorted = Object.entries(AIRPORTS).sort((a, b) => b[0].length - a[0].length);
    for (const [name, data] of sorted) {
      const idx = lower.indexOf(name);
      if (idx >= 0 && !allMatches.some(m => m.code === data.code)) {
        allMatches.push({ ...data, pos: idx });
      }
    }
    allMatches.sort((a, b) => a.pos - b.pos);
    if (allMatches.length >= 2) {
      origin = { code: allMatches[0].code, city: allMatches[0].city };
      destination = { code: allMatches[1].code, city: allMatches[1].city };
    }
  }
  
  // Default origin to DXB
  if (!origin) origin = { code: 'DXB', city: 'Dubai' };
  if (!destination) destination = { code: 'LHR', city: 'London' };
  
  // Parse cabin class
  let cabin = 'business';
  if (/\b(first\s*class|first)\b/.test(lower)) cabin = 'first';
  else if (/\b(premium\s*econ|premium)\b/.test(lower)) cabin = 'premium';
  else if (/\b(economy|econ|cheap)\b/.test(lower)) cabin = 'economy';
  
  // Parse passengers
  let passengers = 1;
  const paxMatch = lower.match(/(\d+)\s*(people|pax|passengers|adults|person)|family\s*of\s*(\d+)/);
  if (paxMatch) passengers = parseInt(paxMatch[1] || paxMatch[3]);
  const coupleMatch = lower.match(/\bcouple\b|two of us/);
  if (coupleMatch) passengers = 2;
  
  // Parse budget
  let maxBudget: number | null = null;
  const budgetMatch = lower.match(/(?:under|below|max|budget|less than)\s*\$?\s*([\d,]+)/);
  if (budgetMatch) maxBudget = parseInt(budgetMatch[1].replace(/,/g, ''));
  const budgetMatch2 = lower.match(/\$([\d,]+)/);
  if (!maxBudget && budgetMatch2) maxBudget = parseInt(budgetMatch2[1].replace(/,/g, ''));
  
  // Parse points budget
  let maxPoints: number | null = null;
  const pointsMatch = lower.match(/([\d,]+)\s*k?\s*(points|miles|pts)/);
  if (pointsMatch) {
    maxPoints = parseInt(pointsMatch[1].replace(/,/g, ''));
    if (lower.includes('k') && maxPoints < 1000) maxPoints *= 1000;
  }
  
  // Parse date
  const departDate = parseDate(query);
  
  // Parse return date
  let returnDate = '';
  const returnMatch = lower.match(/return(?:ing)?\s+(?:on\s+)?(.+?)(?:\s*,|\s*$)/);
  if (returnMatch) returnDate = parseDate(returnMatch[1]);
  
  // Flexible?
  const flexible = /\b(flexible|anytime|any\s*date|whenever|no fixed)\b/.test(lower);
  
  // Trip type
  const tripType = returnDate || /\b(round\s*trip|return)\b/.test(lower) ? 'round-trip' : 'one-way';
  
  // Preferences
  const preferences: string[] = [];
  if (/\b(direct|nonstop|non-stop)\b/.test(lower)) preferences.push('direct');
  if (/\b(cheap|cheapest|budget|value)\b/.test(lower)) preferences.push('cheapest');
  if (/\b(points|miles|award)\b/.test(lower)) preferences.push('points');
  if (/\b(cash|money)\b/.test(lower)) preferences.push('cash');
  if (/\b(luxury|best|premium)\b/.test(lower) && cabin !== 'premium') preferences.push('luxury');

  return NextResponse.json({
    parsed: {
      origin: origin.code,
      destination: destination.code,
      originCity: origin.city,
      destinationCity: destination.city,
      departDate,
      returnDate,
      cabin,
      passengers,
      tripType,
      flexible,
      maxBudget,
      maxPoints,
      currency: 'USD',
      preferences,
    },
    raw: query,
  });
}
