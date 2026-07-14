# TravelCheckpoint Monetisation

Two revenue channels are wired into the codebase. Both are dormant until you (Gary) register the accounts and set the env vars — the code passes links through unchanged when no ID is configured.

## Channel 1 — Affiliate / referral links (live plumbing, zero build remaining)

Every outbound booking link on the site passes through `monetise()` in [src/lib/affiliates.ts](src/lib/affiliates.ts). Configure any of these and every matching link site-wide carries your partner ID:

| Program | Sign up at | You get | Env var (set in Vercel, then redeploy) |
|---|---|---|---|
| Booking.com Affiliate Partner | spadmin.booking.com (Affiliate Partner Programme) | `aid` number | `NEXT_PUBLIC_BOOKING_AID` |
| Agoda Partners | partners.agoda.com | `cid` number | `NEXT_PUBLIC_AGODA_CID` |
| Expedia Group Affiliates (Partnerize) | affiliates.expediagroup.com | `camref` code | `NEXT_PUBLIC_EXPEDIA_CAMREF` |
| Hotels.com (same Partnerize account) | affiliates.expediagroup.com | separate `camref` | `NEXT_PUBLIC_HOTELSCOM_CAMREF` |
| Kiwi.com Tequila affiliate | tequila.kiwi.com | `affilid` | `NEXT_PUBLIC_KIWI_AFFILID` |
| Skyscanner Partner Network | partners.skyscanner.net | `associateid` | `NEXT_PUBLIC_SKYSCANNER_ASSOCIATEID` |
| GetYourGuide Partner (activities) | partner.getyourguide.com | `partner_id` | `NEXT_PUBLIC_GYG_PARTNER_ID` |
| Viator Partner (activities) | partnerresources.viator.com | `pid` | `NEXT_PUBLIC_VIATOR_PID` |

Typical commissions: Booking.com 25–40% of *their* commission (~4% of booking value), Agoda 4–7%, Expedia ~2–6%, Kiwi ~3%, Skyscanner CPC/rev-share.

**Important when adding env vars:** use `printf '%s' 'VALUE' | vercel env add NAME production` — `echo` appends a newline, which is how several existing keys got trailing-newline corruption (the code now trims defensively, but don't feed it more).

Not wired (no usable public program): Google Flights/Hotels, Kayak (network-based, invite), Airbnb (program closed), Skiplagged.

## Channel 2 — LiteAPI native bookings ✅ BUILT (2026-07-13), awaiting production key

On-site hotel booking is **live and tested end-to-end in sandbox**: hotel card "Book now" → `/book` (prebook + guest details + LiteAPI hosted payment element — card data never touches us) → `/book/confirm` (finalize + confirmation with booking ID, cancellation terms). Sandbox test run: Hampton by Hilton London, USD 1,129.04, booking CONFIRMED, **$58.56 commission** on the one booking.

Code map: [src/app/api/book/prebook/route.ts](src/app/api/book/prebook/route.ts), [src/app/api/book/complete/route.ts](src/app/api/book/complete/route.ts), [src/app/book/page.tsx](src/app/book/page.tsx), [src/app/book/confirm/page.tsx](src/app/book/confirm/page.tsx).

**To turn on real revenue (Gary actions — money-moving/terms):**
1. Get a production key at dashboard.liteapi.travel (free, revenue-share; set payout details there).
2. Replace `LITEAPI_KEY` in Vercel with the prod key (`printf '%s' 'KEY' | vercel env add LITEAPI_KEY production`) and redeploy.
3. That's it — the code auto-switches: `sand_` keys run the payment SDK in sandbox mode with test cards; prod keys run live payments. The sandbox banner disappears automatically.

Commission per booking is visible in every rates response (`commission` field) and in the LiteAPI dashboard.

## Channel 3 — Flights (next)

- **LiteAPI now has flight booking endpoints** (`/flights/prebooks` + book, same payment SDK pattern) — once the production account exists for hotels, flights can reuse ~80% of the checkout built here. This is the fastest path to flight revenue.
- Duffel live ticketing (current key is test-mode) is the deeper alternative — markup model, but IATA-adjacent terms + payments setup. Bigger lift; consider after LiteAPI flights.
- Kiwi Tequila affiliate covers creative-route bookings in the meantime (Channel 1).

## Suggested order
1. **LiteAPI production key** → hotel bookings earn commission immediately (flow is already built and tested).
2. Booking.com + Agoda affiliate IDs → the compare/OTA links start earning too.
3. LiteAPI flights build (reuses the checkout; ~1 day) once the prod account exists.
4. Kiwi Tequila + Skyscanner affiliate IDs for the remaining flight links.
