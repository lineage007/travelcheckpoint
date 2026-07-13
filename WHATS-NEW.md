# What's New — 2026-07-13 (4): book hotels on-site (LiteAPI hosted checkout)

Hotels are now bookable **inside TravelCheckpoint**, with commission on every booking:

- Hotel cards (Stay tab + /stays) show a **Book now** button on any rate with a live offer.
- `/book`: prebook confirms the exact price (incl. board + cancellation terms), guest details form, then **LiteAPI's hosted payment element** — card data never touches our servers. Sandbox keys automatically run test mode (4242… card) with a visible banner; a production key switches the same code to live payments.
- `/book/confirm`: finalizes the reservation after payment and shows booking ID, hotel confirmation code, and cancellation terms; bookings are also kept in localStorage.
- Verified end-to-end in sandbox: search → Book now → payment → **CONFIRMED**, booking ID 15YXoteBi, $58.56 commission on a $1,129 stay.

To go live: swap `LITEAPI_KEY` for a production key — see MONETISATION.md.

---

# What's New — 2026-07-13 (3): live hotel rates + monetisation layer

## Live hotel nightly rates (fixed)

LiteAPI rates were being requested and then thrown away — the parser read `rooms` but LiteAPI v3 returns `roomTypes`. Hotel cards now show **live per-night prices, stay totals, real room names, board, and free-cancellation**, sorted cheapest first, and the provider pill reads LIVE HOTEL RATES. Each rate also carries LiteAPI's built-in commission figure (passed through in the API response) — $58–$98/booking on typical London hotels.

Also hardened every API route against trailing-newline env values (several Vercel keys were added with `echo`, which appends `\n`).

## Affiliate / referral monetisation layer

All outbound booking links now pass through `monetise()` ([src/lib/affiliates.ts](src/lib/affiliates.ts)), which injects partner IDs the moment the env vars exist — Booking.com (`aid`), Agoda (`cid`), Expedia + Hotels.com (Partnerize `camref`), Kiwi (`affilid`), Skyscanner (`associateid`). No IDs configured → links unchanged. Signup steps, env var names, and the LiteAPI native-booking path are documented in [MONETISATION.md](MONETISATION.md).

---

# What's New — 2026-07-13 (2): multi-city × multi-date search

Searches now fan out across **cities and dates at the same time**, so one query surfaces the cheapest city/date combos instead of a single snapshot:

- **Date ranges from natural language** — "next week" / "next month" / "flexible" now parse to a full window (7 days) instead of one day.
- **Budgeted fan-out** — up to ~30 provider searches per query (max 4 dates/city, concurrency-capped at 12) sampled evenly across the window. A Europe search covers 10 cities × 3 dates.
- **Date strip** — per-date best price above Cash Fares ("Mon 20 Jul · $1,521 · Fri 24 Jul · $1,312"), cheapest date outlined green, tap to filter results to that date.
- **±days flex chips** — Exact / ±1 day / ±3 days in the refinement bar expand any exact date into a window (`&flex=` URL param, shareable).
- **Cheapest-date tags** — multi-city overview cards show *which* date is cheapest per city ("best Mon 20 Jul"); result cards carry their date; trip header shows the searched window.
- Fixed duplicate React keys when merging multi-date results.

---

# What's New — batch 2026-07-13: every result is now bookable

## 1. Clickable results everywhere

The core fix: result cards used to show prices with no way to act on them. Now every card on the search page is a full-card link with a visible CTA and hover state:

- **Cash fares** → Google Flights pre-filled with route, date, cabin, and airline ("Book ↗")
- **Award seats** → the airline's own award portal (Emirates Skywards, Qatar Privilege Club, …), or seats.aero search when the program isn't mapped ("Book award ↗")
- **Hidden-city fares** → Skiplagged for the exact route and date
- **Creative routes** → Kiwi.com booking link from the API
- **Duffel live fares** → Google Flights for the airline (renamed section "Live Airline Fares" — honest until a real checkout exists)
- **Hotels** → card links to Google Hotels with check-in/out dates; OTA chips (Booking.com / Expedia / Google) recoloured to be readable on the dark theme
- **Points hotels** → Google Hotels for the property

## 2. Compare-on row

One-tap escape hatch above results: the exact route+date+cabin+pax on Google Flights, Skyscanner, Kayak, Kiwi, and Skiplagged. Always available even when a provider returns nothing.

## 3. Cash fare sorting + departure times

- Sort chips: **Price / Fastest / Departure**
- Cards now show departure time ("7:00 PM on Mon, Jul 20") and the date when a multi-date search merged results
- Duffel ISO durations humanized (PT7H54M → "7h 54m")

---

# What's New — batch 2026-05-27

## 1. Search History (`/history`)

New page at `/history` accessible from the home screen header.

- Every search is saved to localStorage automatically after results load (up to 50 entries).
- Each entry shows: query, route, cabin, passengers, timestamp, best cash price found, best award found at time of search.
- "Re-check current prices" button re-runs the search API in-browser and shows the current price next to the original — with a colour-coded delta (green if it dropped, red if it rose).
- Entries can be removed individually or all cleared.
- No backend required; all state is local.

## 2. Price Tracking + Telegram Alerts (`/api/alerts`)

New API endpoint at `POST /api/alerts`.

- "Track" button on every search result card sends the current route + baseline prices to the alerts API.
- API stores the alert in-process and fires a Telegram message confirming the alert was set.
- `GET /api/alerts?run=1` checks all tracked routes against current prices and fires Telegram notifications for any drops exceeding the threshold (default 10%).
- Wire this to a cron job (Vercel Cron, Railway, or a simple curl from anywhere) for continuous monitoring.

Required env vars:

```
TELEGRAM_BOT_TOKEN=<from BotFather>
TELEGRAM_CHAT_ID=<your personal chat ID — get it from @userinfobot>
DROP_THRESHOLD_PCT=10   # optional, default 10
```

Notes:
- Alert store is in-process. On Vercel it resets on cold starts. For persistence across deploys add `ALERTS_JSON` env var (JSON-encoded array) or wire a KV store — the upgrade path is documented in the route file.
- `NEXT_PUBLIC_BASE_URL` should be set to the deployed URL so the alerts runner can call the search API correctly (defaults to `http://localhost:3000`).

## 3. Multi-passenger / Family Search

Home page now has a passenger counter (± buttons, 1–9) between the search bar and suggestions.

- When pax > 1 and the query doesn't already mention a passenger count, it appends `, N people` before navigating.
- Suggestions updated to include family-sized examples ("UAE → Istanbul, family of 6, economy"; "DXB → Maldives, 4 people, next month").
- History link added to home page header.

## 4. Mobile Refinement Bar Fix

The search refinement row (origin/destination/date/pax/cabin/stops) previously wrapped and overflowed on narrow screens.

- Both rows now scroll horizontally (`overflow-x: auto`) with `min-width: max-content` so all controls stay on one line.
- All touch targets bumped to `min-height: 36–38px` — thumb-friendly.
- Visa + currency badges given explicit height alignment so they don't compress on small screens.

---

## Enhancements NOT built this batch (with notes)

- **Cash flight comparison (Skyscanner/Amadeus)** — not built. Cash search already has a working Google Flights/SerpAPI fallback plus the self-hosted fast-flights API option. Adding another cash source is lower priority until those are reliably configured.
- **Award seat opening alerts (proactive, 90-day baseline)** — partially done. The Track button + `/api/alerts` covers on-demand tracking. Proactive history baseline (compare to rolling 90-day avg) needs the alert store to be persistent; left as a follow-up once `ALERTS_JSON` / KV is wired.

---

## Env vars summary for new features

| Var | Purpose | Required for |
|-----|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | Bot API key from BotFather | Price alerts |
| `TELEGRAM_CHAT_ID` | Your personal Telegram chat ID | Price alerts |
| `DROP_THRESHOLD_PCT` | Alert threshold % (default 10) | Price alerts |
| `NEXT_PUBLIC_BASE_URL` | Deployed URL (for alerts runner) | Price alerts cron |
| `ALERTS_JSON` | Seed persistent alert list | Optional |
