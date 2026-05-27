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
