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

Typical commissions: Booking.com 25–40% of *their* commission (~4% of booking value), Agoda 4–7%, Expedia ~2–6%, Kiwi ~3%, Skyscanner CPC/rev-share.

**Important when adding env vars:** use `printf '%s' 'VALUE' | vercel env add NAME production` — `echo` appends a newline, which is how several existing keys got trailing-newline corruption (the code now trims defensively, but don't feed it more).

Not wired (no usable public program): Google Flights/Hotels, Kayak (network-based, invite), Airbnb (program closed), Skiplagged.

## Channel 2 — LiteAPI native bookings (real "book on our site" revenue share)

The hotel rates now shown on the site come from LiteAPI, and **every rate already includes a commission figure** (the API returns `commission` per rate — e.g. $58–$98/booking on London hotels; the route passes it through in each result). LiteAPI's model: bookings made through your key earn that commission, paid out monthly.

What exists today: rates display (fixed 2026-07-13). What's missing for actual on-site booking:
1. **Production LiteAPI key** — current key is `sand_` (sandbox). Upgrade at dashboard.liteapi.travel (free; revenue-share model). Swap `LITEAPI_KEY` in Vercel.
2. **Booking flow build** — LiteAPI prebook → book endpoints, guest details form, and payment. LiteAPI offers a hosted payment SDK ("Payment SDK / whitelabel checkout") that avoids us touching cards directly — strongly preferred over rolling our own Stripe integration.
3. **Gary decision required** (money-moving + terms acceptance): accepting LiteAPI's terms, payout details, and enabling live payments are yours to do per the autonomy contract.

Same applies to flights via Duffel (current `DUFFEL_API_KEY` is a test key): Duffel supports markup/managed content, but live ticketing means IATA-adjacent terms + payments — bigger lift, propose only if hotel bookings prove out.

## Suggested order
1. Register Booking.com + Agoda affiliates (fastest approvals, hotel links already dominate the Stay tab) → set the two env vars → redeploy.
2. Kiwi Tequila (creative-route cards already deep-link to Kiwi checkout).
3. LiteAPI production key → rates become commissionable the day the booking flow ships.
4. Decide on LiteAPI hosted checkout build (est. 1–2 days of work) once the prod key exists.
