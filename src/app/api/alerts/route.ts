import { NextRequest, NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════
// PRICE ALERTS — Telegram notifications
//
// POST /api/alerts  { origin, destination, cabin, passengers, baseline }
//   → saves an alert row to the in-memory store (or env-backed store)
//   → returns { alertId, message }
//
// GET  /api/alerts?run=1
//   → evaluates each tracked route against current prices,
//     fires Telegram for drops > DROP_THRESHOLD_PCT
//
// Required env vars:
//   TELEGRAM_BOT_TOKEN  — from BotFather
//   TELEGRAM_CHAT_ID    — your personal chat ID
// Optional:
//   DROP_THRESHOLD_PCT  — default 10, fires alert if price drops more than this %
// ═══════════════════════════════════════════════════

const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim();
const DROP_THRESHOLD = parseFloat(process.env.DROP_THRESHOLD_PCT || '10');

// In-process store — survives restarts only when running locally.
// For persistent alerts across Vercel cold starts Gary should set
// ALERTS_JSON env var to a JSON-encoded initial list, or wire a KV store.
// This is deliberate: the feature is useful in dev today and the upgrade
// path is clear without adding a DB dependency now.
interface AlertRow {
  id: string;
  origin: string;
  destination: string;
  cabin: string;
  passengers: number;
  baselineCash: number | null;
  baselineAward: number | null;
  createdAt: string;
  lastCheckedAt: string | null;
  label: string;
}

let ALERT_STORE: AlertRow[] = (() => {
  try {
    const raw = process.env.ALERTS_JSON || '[]';
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AlertRow[]) : [];
  } catch {
    return [];
  }
})();

async function sendTelegram(text: string): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
}

async function fetchBestPrices(
  origin: string,
  destination: string,
  cabin: string,
  passengers: number
): Promise<{ cash: number | null; award: number | null }> {
  const date = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
  // H2: Derive base URL from explicit setting, Vercel auto-env, or localhost for local dev.
  const base = process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  try {
    const res = await fetch(
      `${base}/api/search?origin=${origin}&destination=${destination}&cabin=${cabin}&date=${date}&passengers=${passengers}`,
      { signal: AbortSignal.timeout(20000) }
    );
    if (!res.ok) return { cash: null, award: null };
    const data: {
      results?: {
        cash?: Array<{ price: number | null; isLivePrice?: boolean }>;
        awards?: Array<{ miles: number }>;
      };
    } = await res.json();
    const liveCash = (data.results?.cash || [])
      .filter((f) => typeof f.price === 'number' && (f.price ?? 0) > 0 && f.isLivePrice !== false)
      .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    const liveAward = (data.results?.awards || [])
      .filter((a) => a.miles > 0)
      .sort((a, b) => a.miles - b.miles);
    return {
      cash: liveCash[0]?.price ?? null,
      award: liveAward[0]?.miles ?? null,
    };
  } catch {
    return { cash: null, award: null };
  }
}

export async function POST(request: NextRequest) {
  // C1: Pre-shared secret guard — prevents unauthenticated callers from flooding the alert store.
  // Set TC_SECRET in Vercel env vars. Requests without the correct header are rejected.
  const tcSecret = process.env.TC_SECRET;
  if (tcSecret && request.headers.get('X-TC-Secret') !== tcSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!BOT_TOKEN || !CHAT_ID) {
    return NextResponse.json(
      { error: 'Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID env vars.' },
      { status: 503 }
    );
  }

  let body: {
    origin?: unknown;
    destination?: unknown;
    cabin?: unknown;
    passengers?: unknown;
    baselineCash?: unknown;
    baselineAward?: unknown;
    label?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const origin = String(body.origin || 'DXB').toUpperCase().trim();
  const destination = String(body.destination || '').toUpperCase().trim();
  if (!/^[A-Z]{3}$/.test(origin) || !/^[A-Z]{3}$/.test(destination)) {
    return NextResponse.json({ error: 'Invalid airport codes' }, { status: 400 });
  }

  const cabin = (['economy', 'premium', 'business', 'first'] as const).includes(body.cabin as 'economy' | 'premium' | 'business' | 'first')
    ? (body.cabin as string)
    : 'business';
  const parsedPax = parseInt(String(body.passengers || '1'), 10);
  const passengers = Number.isFinite(parsedPax) ? Math.min(Math.max(parsedPax, 1), 9) : 1;
  const baselineCash = typeof body.baselineCash === 'number' ? body.baselineCash : null;
  const baselineAward = typeof body.baselineAward === 'number' ? body.baselineAward : null;
  const label = typeof body.label === 'string' ? body.label.slice(0, 100) : `${origin} → ${destination} ${cabin}`;

  const id = `${origin}-${destination}-${cabin}-${passengers}-${Date.now()}`;
  const row: AlertRow = {
    id,
    origin,
    destination,
    cabin,
    passengers,
    baselineCash,
    baselineAward,
    createdAt: new Date().toISOString(),
    lastCheckedAt: null,
    label,
  };

  // Dedup: replace any existing alert for same route+cabin+pax
  ALERT_STORE = ALERT_STORE.filter(
    (a) => !(a.origin === origin && a.destination === destination && a.cabin === cabin && a.passengers === passengers)
  );
  ALERT_STORE.push(row);

  await sendTelegram(
    `<b>TravelCheckpoint alert set</b>\n` +
    `Route: ${label}\n` +
    (baselineCash ? `Baseline cash: $${baselineCash.toLocaleString()}\n` : '') +
    (baselineAward ? `Baseline award: ${(baselineAward / 1000).toFixed(0)}K miles\n` : '') +
    `You'll be notified when the price drops more than ${DROP_THRESHOLD}%.`
  );

  return NextResponse.json({ alertId: id, tracked: ALERT_STORE.length, message: 'Alert set. Telegram notification sent.' });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const run = searchParams.get('run') === '1';

  if (!run) {
    return NextResponse.json({
      alerts: ALERT_STORE.map(({ id, origin, destination, cabin, passengers, baselineCash, baselineAward, createdAt, lastCheckedAt, label }) => ({
        id, origin, destination, cabin, passengers, baselineCash, baselineAward, createdAt, lastCheckedAt, label,
      })),
      count: ALERT_STORE.length,
      telegramConfigured: Boolean(BOT_TOKEN && CHAT_ID),
    });
  }

  if (!BOT_TOKEN || !CHAT_ID) {
    return NextResponse.json({ error: 'Telegram not configured.' }, { status: 503 });
  }

  if (ALERT_STORE.length === 0) {
    return NextResponse.json({ checked: 0, fired: 0, message: 'No alerts to check.' });
  }

  const results: { id: string; fired: boolean; reason: string }[] = [];

  for (const alert of ALERT_STORE) {
    try {
      const { cash, award } = await fetchBestPrices(alert.origin, alert.destination, alert.cabin, alert.passengers);
      alert.lastCheckedAt = new Date().toISOString();

      const lines: string[] = [];

      if (alert.baselineCash !== null && cash !== null) {
        const drop = ((alert.baselineCash - cash) / alert.baselineCash) * 100;
        if (drop >= DROP_THRESHOLD) {
          lines.push(`Cash dropped ${drop.toFixed(0)}%: $${alert.baselineCash.toLocaleString()} → $${cash.toLocaleString()}`);
        }
      } else if (cash !== null && alert.baselineCash === null) {
        lines.push(`Cash available: $${cash.toLocaleString()} (no prior baseline)`);
      }

      if (alert.baselineAward !== null && award !== null) {
        const drop = ((alert.baselineAward - award) / alert.baselineAward) * 100;
        if (drop >= DROP_THRESHOLD) {
          lines.push(`Award dropped ${drop.toFixed(0)}%: ${(alert.baselineAward / 1000).toFixed(0)}K → ${(award / 1000).toFixed(0)}K miles`);
        }
      } else if (award !== null && alert.baselineAward === null) {
        lines.push(`Award available: ${(award / 1000).toFixed(0)}K miles (no prior baseline)`);
      }

      if (lines.length > 0) {
        await sendTelegram(
          `<b>TravelCheckpoint price alert</b>\n` +
          `Route: ${alert.label}\n` +
          lines.join('\n') +
          `\nSearch: /search?q=${encodeURIComponent(alert.label)}`
        );
        results.push({ id: alert.id, fired: true, reason: lines.join('; ') });
      } else {
        results.push({ id: alert.id, fired: false, reason: 'No significant drop' });
      }
    } catch {
      results.push({ id: alert.id, fired: false, reason: 'Check failed' });
    }
  }

  return NextResponse.json({
    checked: results.length,
    fired: results.filter((r) => r.fired).length,
    results,
    timestamp: new Date().toISOString(),
  });
}
