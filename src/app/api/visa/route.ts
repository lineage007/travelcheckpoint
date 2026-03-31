import { NextRequest, NextResponse } from 'next/server';

type VisaInfo = { status: string; days?: number; note?: string };
const V: Record<string, Record<string, VisaInfo>> = {
  TR: {
    GB: { status: 'visa-required', note: 'UK visa required' }, US: { status: 'visa-required', note: 'B1/B2 visa' },
    DE: { status: 'visa-required', note: 'Schengen' }, FR: { status: 'visa-required', note: 'Schengen' },
    IT: { status: 'visa-required', note: 'Schengen' }, ES: { status: 'visa-required', note: 'Schengen' },
    NL: { status: 'visa-required', note: 'Schengen' }, GR: { status: 'visa-required', note: 'Schengen' },
    PT: { status: 'visa-required', note: 'Schengen' }, CH: { status: 'visa-required', note: 'Schengen' },
    AT: { status: 'visa-required', note: 'Schengen' }, SE: { status: 'visa-required', note: 'Schengen' },
    DK: { status: 'visa-required', note: 'Schengen' }, NO: { status: 'visa-required', note: 'Schengen' },
    CZ: { status: 'visa-required', note: 'Schengen' }, HU: { status: 'visa-required', note: 'Schengen' },
    PL: { status: 'visa-required', note: 'Schengen' }, IE: { status: 'visa-required' },
    JP: { status: 'visa-free', days: 90 }, KR: { status: 'visa-free', days: 90 },
    SG: { status: 'visa-free', days: 30 }, MY: { status: 'visa-free', days: 90 },
    TH: { status: 'visa-free', days: 30 }, ID: { status: 'visa-free', days: 30 },
    AE: { status: 'visa-free', days: 90 }, QA: { status: 'visa-free', days: 90 },
    BH: { status: 'visa-free', days: 90 }, GE: { status: 'visa-free', days: 365 },
    AZ: { status: 'visa-free', days: 90 }, BR: { status: 'visa-free', days: 90 },
    AR: { status: 'visa-free', days: 90 }, TN: { status: 'visa-free', days: 90 },
    MA: { status: 'visa-free', days: 90 }, HK: { status: 'visa-free', days: 90 },
    MU: { status: 'visa-free', days: 90 }, SC: { status: 'visa-free', days: 90 },
    FJ: { status: 'visa-free', days: 120 }, PH: { status: 'visa-free', days: 30 },
    MV: { status: 'visa-on-arrival', days: 30 }, EG: { status: 'visa-on-arrival', days: 30 },
    KH: { status: 'visa-on-arrival', days: 30 }, TZ: { status: 'visa-on-arrival', days: 90 },
    SA: { status: 'e-visa' }, OM: { status: 'e-visa' }, LK: { status: 'e-visa' },
    IN: { status: 'e-visa' }, KE: { status: 'e-visa' }, VN: { status: 'e-visa' },
    AU: { status: 'visa-required' }, NZ: { status: 'visa-required' }, CN: { status: 'visa-required' },
    MX: { status: 'visa-required' }, CA: { status: 'visa-required' },
  },
  AU: {
    GB: { status: 'visa-free', days: 180 }, US: { status: 'visa-free', days: 90, note: 'ESTA' },
    DE: { status: 'visa-free', days: 90 }, FR: { status: 'visa-free', days: 90 },
    IT: { status: 'visa-free', days: 90 }, ES: { status: 'visa-free', days: 90 },
    JP: { status: 'visa-free', days: 90 }, SG: { status: 'visa-free', days: 90 },
    MY: { status: 'visa-free', days: 90 }, TH: { status: 'visa-free', days: 30 },
    KR: { status: 'visa-free', days: 90 }, HK: { status: 'visa-free', days: 90 },
    NZ: { status: 'visa-free', days: 90 }, AE: { status: 'visa-free', days: 90 },
    GR: { status: 'visa-free', days: 90 }, PT: { status: 'visa-free', days: 90 },
    ID: { status: 'visa-on-arrival', days: 30 }, MV: { status: 'visa-on-arrival', days: 30 },
    TR: { status: 'e-visa' }, IN: { status: 'e-visa' }, CN: { status: 'visa-required' },
  },
  AE: {
    GB: { status: 'visa-free', days: 180 }, US: { status: 'visa-free', days: 90, note: 'ESTA' },
    DE: { status: 'visa-free', days: 90 }, FR: { status: 'visa-free', days: 90 },
    JP: { status: 'visa-free', days: 30 }, SG: { status: 'visa-free', days: 30 },
    MY: { status: 'visa-free', days: 90 }, TH: { status: 'visa-free', days: 30 },
    ID: { status: 'visa-free', days: 30 }, KR: { status: 'visa-free', days: 30 },
    TR: { status: 'visa-free', days: 90 }, MV: { status: 'visa-on-arrival', days: 30 },
    AU: { status: 'visa-required' }, IN: { status: 'e-visa' },
  },
};

const A2C: Record<string, string> = {
  LHR:'GB',LGW:'GB',MAN:'GB',EDI:'GB',JFK:'US',LAX:'US',SFO:'US',MIA:'US',ORD:'US',BOS:'US',SEA:'US',IAD:'US',
  CDG:'FR',FRA:'DE',MUC:'DE',FCO:'IT',MXP:'IT',MAD:'ES',BCN:'ES',AMS:'NL',
  NRT:'JP',HND:'JP',KIX:'JP',ICN:'KR',SIN:'SG',KUL:'MY',BKK:'TH',HKT:'TH',DPS:'ID',CGK:'ID',
  MLE:'MV',CMB:'LK',DEL:'IN',BOM:'IN',PEK:'CN',PVG:'CN',HKG:'HK',TPE:'TW',MNL:'PH',SGN:'VN',HAN:'VN',
  DXB:'AE',AUH:'AE',DOH:'QA',MCT:'OM',BAH:'BH',RUH:'SA',JED:'SA',CAI:'EG',RAK:'MA',
  IST:'TR',TZX:'TR',AYT:'TR',BJV:'TR',ATH:'GR',LIS:'PT',ZRH:'CH',VIE:'AT',ARN:'SE',CPH:'DK',OSL:'NO',DUB:'IE',
  PRG:'CZ',BUD:'HU',WAW:'PL',SYD:'AU',MEL:'AU',BNE:'AU',PER:'AU',AKL:'NZ',
  JNB:'ZA',CPT:'ZA',NBO:'KE',DAR:'TZ',MRU:'MU',SEZ:'SC',NAN:'FJ',ZNZ:'TZ',
  GRU:'BR',EZE:'AR',MEX:'MX',CUN:'MX',HNL:'US',YYZ:'CA',YVR:'CA',TBS:'GE',GYD:'AZ',
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const passport = (searchParams.get('passport') || 'TR').toUpperCase();
  const dest = (searchParams.get('destination') || '').toUpperCase();
  const country = A2C[dest] || dest;
  const info = V[passport]?.[country];
  if (!info) return NextResponse.json({ status: 'unknown', passport, destination: country, note: 'Check timaticweb.com' });
  return NextResponse.json({ ...info, passport, destination: country });
}
