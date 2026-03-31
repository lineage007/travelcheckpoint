import { NextRequest, NextResponse } from 'next/server';

const A2C: Record<string, { code: string; name: string; symbol: string }> = {
  LHR:{code:'gbp',name:'British Pound',symbol:'£'},LGW:{code:'gbp',name:'British Pound',symbol:'£'},
  CDG:{code:'eur',name:'Euro',symbol:'€'},FRA:{code:'eur',name:'Euro',symbol:'€'},FCO:{code:'eur',name:'Euro',symbol:'€'},
  MXP:{code:'eur',name:'Euro',symbol:'€'},MAD:{code:'eur',name:'Euro',symbol:'€'},BCN:{code:'eur',name:'Euro',symbol:'€'},
  AMS:{code:'eur',name:'Euro',symbol:'€'},ATH:{code:'eur',name:'Euro',symbol:'€'},LIS:{code:'eur',name:'Euro',symbol:'€'},
  VIE:{code:'eur',name:'Euro',symbol:'€'},DUB:{code:'eur',name:'Euro',symbol:'€'},
  NRT:{code:'jpy',name:'Japanese Yen',symbol:'¥'},HND:{code:'jpy',name:'Japanese Yen',symbol:'¥'},KIX:{code:'jpy',name:'Japanese Yen',symbol:'¥'},
  ICN:{code:'krw',name:'Korean Won',symbol:'₩'},BKK:{code:'thb',name:'Thai Baht',symbol:'฿'},HKT:{code:'thb',name:'Thai Baht',symbol:'฿'},
  DPS:{code:'idr',name:'Indonesian Rupiah',symbol:'Rp'},CGK:{code:'idr',name:'Indonesian Rupiah',symbol:'Rp'},
  SIN:{code:'sgd',name:'Singapore Dollar',symbol:'S$'},KUL:{code:'myr',name:'Malaysian Ringgit',symbol:'RM'},
  MLE:{code:'usd',name:'US Dollar',symbol:'$'},DEL:{code:'inr',name:'Indian Rupee',symbol:'₹'},BOM:{code:'inr',name:'Indian Rupee',symbol:'₹'},
  IST:{code:'try',name:'Turkish Lira',symbol:'₺'},TZX:{code:'try',name:'Turkish Lira',symbol:'₺'},AYT:{code:'try',name:'Turkish Lira',symbol:'₺'},
  CAI:{code:'egp',name:'Egyptian Pound',symbol:'E£'},JFK:{code:'usd',name:'US Dollar',symbol:'$'},LAX:{code:'usd',name:'US Dollar',symbol:'$'},
  SFO:{code:'usd',name:'US Dollar',symbol:'$'},MIA:{code:'usd',name:'US Dollar',symbol:'$'},ORD:{code:'usd',name:'US Dollar',symbol:'$'},
  SYD:{code:'aud',name:'Australian Dollar',symbol:'A$'},MEL:{code:'aud',name:'Australian Dollar',symbol:'A$'},
  HKG:{code:'hkd',name:'HK Dollar',symbol:'HK$'},PEK:{code:'cny',name:'Chinese Yuan',symbol:'¥'},PVG:{code:'cny',name:'Chinese Yuan',symbol:'¥'},
  GRU:{code:'brl',name:'Brazilian Real',symbol:'R$'},ZRH:{code:'chf',name:'Swiss Franc',symbol:'CHF'},
  CPH:{code:'dkk',name:'Danish Krone',symbol:'kr'},ARN:{code:'sek',name:'Swedish Krona',symbol:'kr'},OSL:{code:'nok',name:'Norwegian Krone',symbol:'kr'},
  MNL:{code:'php',name:'Philippine Peso',symbol:'₱'},SGN:{code:'vnd',name:'Vietnamese Dong',symbol:'₫'},
  NBO:{code:'kes',name:'Kenyan Shilling',symbol:'KSh'},JNB:{code:'zar',name:'South African Rand',symbol:'R'},
  DXB:{code:'aed',name:'UAE Dirham',symbol:'د.إ'},DOH:{code:'qar',name:'Qatari Riyal',symbol:'QR'},
  MRU:{code:'mur',name:'Mauritian Rupee',symbol:'₨'},RAK:{code:'mad',name:'Moroccan Dirham',symbol:'MAD'},
  PRG:{code:'czk',name:'Czech Koruna',symbol:'Kč'},BUD:{code:'huf',name:'Hungarian Forint',symbol:'Ft'},
  WAW:{code:'pln',name:'Polish Zloty',symbol:'zł'},YYZ:{code:'cad',name:'Canadian Dollar',symbol:'C$'},
  AKL:{code:'nzd',name:'New Zealand Dollar',symbol:'NZ$'},SEZ:{code:'scr',name:'Seychellois Rupee',symbol:'₨'},
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = (searchParams.get('from') || 'aed').toLowerCase();
  const dest = (searchParams.get('destination') || '').toUpperCase();
  const c = A2C[dest];
  if (!c) return NextResponse.json({ error: 'Unknown destination' });

  try {
    const res = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${from}.json`, {
      signal: AbortSignal.timeout(10000), next: { revalidate: 3600 },
    });
    if (!res.ok) return NextResponse.json({ error: 'Currency API down' });
    const data = await res.json();
    const rate = data[from]?.[c.code];
    if (!rate) return NextResponse.json({ error: 'Rate not found' });
    return NextResponse.json({
      from: from.toUpperCase(), to: c.code.toUpperCase(), name: c.name, symbol: c.symbol, rate,
      display: `1 ${from.toUpperCase()} = ${rate < 1 ? rate.toFixed(4) : rate < 100 ? rate.toFixed(2) : Math.round(rate).toLocaleString()} ${c.symbol}`,
    });
  } catch (e) { return NextResponse.json({ error: String(e) }); }
}
