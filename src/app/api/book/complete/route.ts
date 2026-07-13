import { NextRequest, NextResponse } from 'next/server';

// Step 2 of the LiteAPI booking flow: finalize the reservation after the hosted
// payment element has taken payment (method TRANSACTION_ID). In sandbox, LiteAPI
// also allows ACC_CREDIT_CARD which simulates payment without a card — we permit
// that ONLY with a sandbox key so automated tests can exercise the flow.
const API_KEY = (process.env.LITEAPI_KEY || '').trim();
const BOOK_BASE = 'https://book.liteapi.travel/v3.0';

interface Holder { firstName?: string; lastName?: string; email?: string; phone?: string }
interface Guest { occupancyNumber?: number; firstName?: string; lastName?: string; email?: string; remarks?: string }

export async function POST(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: 'missing-key' }, { status: 503 });

  let body: { prebookId?: string; transactionId?: string; holder?: Holder; guests?: Guest[]; sandboxDirect?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  const { prebookId, transactionId, holder, guests, sandboxDirect } = body;
  if (!prebookId) return NextResponse.json({ error: 'missing-prebook' }, { status: 400 });
  if (!holder?.firstName || !holder?.lastName || !holder?.email) {
    return NextResponse.json({ error: 'missing-holder' }, { status: 400 });
  }

  const isSandbox = API_KEY.startsWith('sand_');
  let payment: Record<string, string>;
  if (sandboxDirect && isSandbox) {
    payment = { method: 'ACC_CREDIT_CARD' };
  } else if (transactionId) {
    payment = { method: 'TRANSACTION_ID', transactionId };
  } else {
    return NextResponse.json({ error: 'missing-payment' }, { status: 400 });
  }

  const guestList: Guest[] = (guests && guests.length > 0 ? guests : [{ ...holder }]).map((g, i) => ({
    occupancyNumber: g.occupancyNumber || i + 1,
    firstName: g.firstName || holder.firstName,
    lastName: g.lastName || holder.lastName,
    email: g.email || holder.email,
    ...(g.remarks ? { remarks: g.remarks } : {}),
  }));

  try {
    const res = await fetch(`${BOOK_BASE}/rates/book`, {
      method: 'POST',
      headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ prebookId, holder, guests: guestList, payment }),
      signal: AbortSignal.timeout(45000),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: 'book-failed', detail: json?.error?.message || `HTTP ${res.status}` },
        { status: 502 },
      );
    }

    const d = json.data || json;
    return NextResponse.json({
      bookingId: d.bookingId,
      status: d.status,
      hotelConfirmationCode: d.hotelConfirmationCode || '',
      hotelName: d.hotel?.name || '',
      checkin: d.checkin || '',
      checkout: d.checkout || '',
      price: d.price ?? null,
      currency: d.currency || 'USD',
      commission: d.commission ?? null,
      refundableTag: d.cancellationPolicies?.refundableTag || '',
      lastFreeCancellationDate: d.cancellationPolicies?.cancelPolicyInfos?.[0]?.cancelTime || '',
      sandbox: isSandbox,
    });
  } catch {
    return NextResponse.json({ error: 'book-failed' }, { status: 502 });
  }
}
