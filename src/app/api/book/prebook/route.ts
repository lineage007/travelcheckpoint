import { NextRequest, NextResponse } from 'next/server';

// Step 1 of the LiteAPI booking flow: turn an offerId from the rates search into a
// prebook (checkout session). With usePaymentSdk the response carries the
// secretKey/transactionId the hosted payment element needs — card data never
// touches our servers.
const API_KEY = (process.env.LITEAPI_KEY || '').trim();
const BOOK_BASE = 'https://book.liteapi.travel/v3.0';

export async function POST(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: 'missing-key' }, { status: 503 });

  let offerId: string | undefined;
  try {
    ({ offerId } = await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }
  if (!offerId || typeof offerId !== 'string' || offerId.length > 4000) {
    return NextResponse.json({ error: 'missing-offer' }, { status: 400 });
  }

  try {
    const res = await fetch(`${BOOK_BASE}/rates/prebook`, {
      method: 'POST',
      headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ offerId, usePaymentSdk: true }),
      signal: AbortSignal.timeout(25000),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      // 408 with codes 4016/4040 = the offer went stale between search and checkout.
      const stale = res.status === 408;
      return NextResponse.json(
        { error: stale ? 'offer-expired' : 'prebook-failed', detail: json?.error?.message || '' },
        { status: stale ? 410 : 502 },
      );
    }

    const d = json.data || json;
    const roomType = (d.roomTypes || [])[0] || {};
    const rate = (roomType.rates || [])[0] || {};
    return NextResponse.json({
      prebookId: d.prebookId,
      transactionId: d.transactionId || null,
      secretKey: d.secretKey || null,
      price: d.price ?? roomType.offerRetailRate?.amount ?? null,
      currency: d.currency || roomType.offerRetailRate?.currency || 'USD',
      commission: d.commission ?? null,
      hotelName: d.hotel?.name || '',
      checkin: d.checkin || '',
      checkout: d.checkout || '',
      roomName: rate.name || '',
      boardName: rate.boardName || '',
      refundableTag: rate.cancellationPolicies?.refundableTag || d.cancellationPolicies?.refundableTag || '',
      cancelPolicyInfos: rate.cancellationPolicies?.cancelPolicyInfos || d.cancellationPolicies?.cancelPolicyInfos || [],
      // The payment SDK's publicKey must match the API key's environment.
      sandbox: API_KEY.startsWith('sand_'),
    });
  } catch {
    return NextResponse.json({ error: 'prebook-failed' }, { status: 502 });
  }
}
