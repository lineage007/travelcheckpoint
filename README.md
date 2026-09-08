# TravelCheckpoint

A personal, mobile-first flight and hotel search PWA. Type a trip in plain English
("Dubai to Europe, business, next week, direct") and it fans the query out across
award, cash and hotel providers, then shows the cheapest options side by side.

Next.js 16 (App Router) + React 19 + TypeScript. Single user, no auth, no database —
state lives in `localStorage` and everything else is fetched per request.

## Pages

| Route | What it does |
| --- | --- |
| `/` | Search entry — natural-language query box, recent searches, quick presets |
| `/search` | Results: Flights / Stay / Explore tabs, date strip, sort, fare + award cards |
| `/stays` | Hotel search on its own, independent of a flight query |
| `/book` (+ `/book/confirm`) | Hotel booking flow against LiteAPI |
| `/history` | Past searches saved locally |
| `/settings` | Home airport, passport, display currency, provider status |

## API routes and providers

| Route | Provider |
| --- | --- |
| `/api/parse` | None — local NLP in `src/lib/query-parser.ts` (unit-tested, zero API cost) |
| `/api/search` | Seats.aero partner API (awards), `CASH_FLIGHTS_API_URL` (cash), SerpAPI Google Flights as backup; PrivateFly empty legs; Google Flights / Skyscanner / Skiplagged deep links |
| `/api/duffel` | Duffel API — bookable airline offers |
| `/api/kiwi` | Kiwi, via the `kiwi` MCP server (`src/lib/mcp-client.ts`) |
| `/api/skiplagged` | Skiplagged, via a self-hosted proxy at `SKIPLAGGED_PROXY_URL` |
| `/api/liteapi` | LiteAPI (`api.liteapi.travel`) — hotel inventory and rates |
| `/api/book/prebook`, `/api/book/complete` | LiteAPI booking API (`book.liteapi.travel`) |
| `/api/rooms` | rooms.aero — hotel award/points rates (uses the Seats.aero key) |
| `/api/hotels` | No API call — builds affiliate deep links for Booking.com, Expedia, Agoda, Airbnb, Hotels.com |
| `/api/trivago` | Trivago, via the `trivago` MCP server |
| `/api/currency`, `/api/rates` | FX rates from the jsDelivr `currency-api` CDN (no key) |
| `/api/visa` | Static visa table in the route file |
| `/api/gems` | Static "hidden gems" table in the route file |
| `/api/chat` | Groq, falling back to Google Gemini |
| `/api/alerts` | Price alerts; polls `/api/search` and notifies via the Telegram Bot API |
| `/api/provider-status` | Reports which provider env vars are set (no secrets returned) |
| `/api/mcp-test` | Health check for the skiplagged / kiwi / trivago MCP servers |

## Environment variables

Names and purpose only — see `.env.example` for the file to copy. Never commit values.

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_BASE_URL` | Public base URL; the alert runner uses it to call `/api/search`. Falls back to `VERCEL_URL` |
| `TC_SECRET` | Pre-shared secret required on `POST /api/alerts` (header `X-TC-Secret`) |
| `TELEGRAM_BOT_TOKEN` | Bot token for price-drop notifications |
| `TELEGRAM_CHAT_ID` | Chat that notifications are sent to |
| `DROP_THRESHOLD_PCT` | Percentage price drop that triggers an alert |
| `SEATS_AERO_API_KEY` | Seats.aero award search and rooms.aero hotel points |
| `SERPAPI_KEY` | Backup cash fares via SerpAPI Google Flights |
| `CASH_FLIGHTS_API_URL` | Primary cash-fare API endpoint |
| `LITEAPI_KEY` | LiteAPI hotel search and booking |
| `GROQ_API_KEY` | Travel assistant chat |
| `GEMINI_API_KEY` | Chat fallback |
| `DUFFEL_ACCESS_TOKEN` | Bookable airline offers |

Two names in `.env.example` have drifted from the code: `/api/chat` reads
`GOOGLE_AI_API_KEY` (not `GEMINI_API_KEY`) and `/api/duffel` reads `DUFFEL_API_KEY`
(not `DUFFEL_ACCESS_TOKEN`). Three used names are missing from the file entirely:
`SKIPLAGGED_PROXY_URL`, `ALERTS_JSON`, and the `NEXT_PUBLIC_*` affiliate IDs in
`src/lib/affiliates.ts`. Set whichever the code actually reads.

Every provider is optional. A missing key degrades that one panel — routes return
`{ status: 'not-configured' }` rather than failing the search.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in whichever providers you want live
npm run dev                  # http://localhost:3000
```

```bash
npm run lint
npx tsc --noEmit
npm test                     # vitest, src/lib/query-parser.test.ts
npm run build
```

Note: `npm test` is wired up but `vitest` is not yet in `devDependencies` — until it is
added (with a matching lockfile update), the command resolves it through `npx`.

## Deploys

Vercel, auto-deploying from `main`. Live at
[travelcheckpoint.vercel.app](https://travelcheckpoint.vercel.app).
`travelcheckpoint.com` is attached to the project, but its nameservers are still
unset at the registrar, so the apex domain does not resolve yet.

Dependency updates come in via Renovate (`renovate.json`) — Mondays before 6am, no automerge.

## Known gaps

- **LiteAPI is sandbox-only.** Hotel rates and the `/book` flow return test data; no real reservation is made.
- **Skiplagged is blocked behind Cloudflare.** Direct scraping fails, so hidden-city results only appear when `SKIPLAGGED_PROXY_URL` points at a working proxy; otherwise the panel reports `unavailable`.
- **Alerts need `TC_SECRET`.** Without it, `POST /api/alerts` rejects every request, so the forms that create alerts silently do nothing.
- Award and cash results come from different providers and are not deduplicated against each other.
