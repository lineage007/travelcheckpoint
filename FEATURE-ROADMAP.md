# TravelCheckpoint — Feature Roadmap
*Research: 31 March 2026 · For: Gary*

---

## VISION: One prompt, all travel intelligence on the internet

---

## 🔴 HIGH PRIORITY — Add Now

### 1. Hidden City Fares (Skiplagged)
**What:** Flights where getting off at the layover is cheaper than flying direct. Can save 30-60%.
**Source:** Skiplagged API — FREE, no API key needed
**MCP Server:** Already exists: `@nicholasway/mcp-skiplagged`
**Implementation:** Add a "Hidden City" tab alongside Cash/Points/Jets. Query Skiplagged API for the same route, show savings vs direct fare.
**Example:** DXB→LHR direct $800. DXB→NYC via LHR $500. Get off at LHR, save $300.

### 2. Virtual Interlining (Kiwi.com)
**What:** Creative cross-airline routing that no single airline would ever sell. Kiwi stitches together separate tickets with their own guarantee.
**Source:** Kiwi.com Tequila API — FREE, no key needed
**MCP Server:** Already exists (travel-hacking-toolkit)
**Implementation:** Add a "Creative Routes" tab. Shows multi-airline combos with Kiwi's guarantee.
**Example:** DXB→IST on Flydubai + IST→LHR on Pegasus = $200 vs Emirates direct at $600.

### 3. Hotel Search (Cash)
**What:** Compare hotel prices across all OTAs (Booking, Expedia, Agoda, Hotels.com)
**Source options:**
- **Trivago MCP** — FREE, no key, already has MCP server
- **Makcorps API** — compares 200+ OTAs in one call (RapidAPI, free tier)
- **LiteAPI** — hotel search with live rates + booking capability (needs key)
**Implementation:** Add a "Stay" tab. Search by destination, dates, guests. Show cheapest across all platforms with booking links.

### 4. Hotel Points/Award Search (rooms.aero)
**What:** Find hotel rooms bookable with points across Hilton, Hyatt, Marriott, IHG, Choice
**Source:** rooms.aero — same team as seats.aero, included in Pro ($9.99/mo you already pay)
**Implementation:** In the "Stay" tab, show both cash rates AND points rates side by side. Calculate cents-per-point value. "Is it better to pay cash or use 40K Hilton points?"

### 5. Airbnb / Vacation Rentals
**What:** Search Airbnb listings, pricing, availability
**Source:** Airbnb MCP server (borski/mcp-server-airbnb) — FREE, no key
**Implementation:** Add an "Airbnb" section within the Stay tab. Especially useful for family travel (3+ bedrooms, full kitchen, pool).

### 6. Ferries
**What:** Ferry routes across 33 countries, 190+ operators — Mediterranean, Greek islands, Southeast Asia
**Source:** Ferryhopper MCP — FREE, no key
**Implementation:** For coastal/island destinations, auto-suggest ferry alternatives. "DXB to Bali" → also show ferry from Bali to Gili Islands.

---

## 🟡 MEDIUM PRIORITY — Build Next

### 7. Visa Requirements
**What:** Instant visa check for any passport + destination combo
**Source:** passport-visa-api (GitHub: nickypangers/passport-visa-api) — FREE
**Data:** passport-index-dataset (ilyankou/passport-index-dataset) — 199 countries, CSV, updated regularly
**Implementation:** User sets their passport(s) in profile. Every search result shows visa status: ✅ Visa-free (30 days), ⚠️ eVisa required, ❌ Visa required. Also show transit visa requirements for layover countries.

### 8. Currency Converter & Rate Intelligence
**What:** Live exchange rates for destination currency, ATM tips, card recommendations
**Source:** fawazahmed0/exchange-api — FREE, no rate limits, 200+ currencies
**Implementation:** Every destination card shows: "1 AED = X [local currency]". Also: "Best card for this destination" based on no-FX-fee cards.

### 9. Points Transfer Partner Map
**What:** Show which credit card points can transfer to which airlines/hotels, and the transfer ratios
**Source:** borski/travel-hacking-toolkit data files (JSON) — FREE
- `data/transfer-partners.json` — complete transfer partner map
- `data/points-valuations.json` — current cpp valuations
- `data/sweet-spots.json` — best value redemptions
**Implementation:** "You have 100K Amex MR → transfers 1:1 to Emirates Skywards → book DXB-LHR business for 62,500 miles (value: 3.2cpp)"

### 10. Price Alerts & Tracking
**What:** Set alerts for routes/dates, get notified when prices drop
**Source:** Custom — store searches in DB, re-run periodically, notify on drops
**Implementation:** "Track this route" button on any result. Daily cron checks prices. Push notification or Telegram message when price drops >10%.

### 11. Trip Cost Calculator (Full Package)
**What:** Flights + hotel + activities + food = total trip cost
**Source:** Aggregate from all search tools above + Numbeo cost-of-living API (free tier)
**Implementation:** "A week in Bali for family of 6" → shows: Flights $X + Hotel $Y + Food ~$Z + Activities ~$W = Total: $XXXX. Points alternative: XXX,000 miles + XXX,000 hotel points.

### 12. Duffel (Flight Booking)
**What:** Real-time flight search and booking across airlines
**Source:** Duffel API — free sandbox, pay-per-booking in production
**Skill:** Already exists in travel-hacking-toolkit
**Implementation:** For serious bookings, show Duffel results alongside Google Flights for price comparison. Eventually: book directly through TravelCheckpoint.

---

## 🔵 NICE TO HAVE — Later

### 13. Airport Lounge Finder
**What:** Which lounges you can access at any airport based on your cards/memberships
**Source:** LoungeBuddy data (scrape) + Priority Pass API
**Implementation:** Show lounges at departure/transit/arrival airports. "You have Priority Pass → 3 lounges at LHR Terminal 5"

### 14. eSIM / Data Plans
**What:** Compare eSIM providers for destination country — price, data, speed
**Source:** eSIMDB data (scrape esimdb.com) or Airalo affiliate API
**Implementation:** "Heading to Bali? 10GB eSIM from $4.50 (Airalo) vs $12 (local SIM)"

### 15. Travel Document Checklist
**What:** Auto-generated checklist: passport expiry, visa, covid requirements, customs limits, embassy contacts
**Source:** Passport API + IATA Timatic data (scrape) + custom
**Implementation:** Pre-trip checklist page: "Your Turkish passport expires in 8 months ✅ (6-month rule met). UK requires no visa for 6 months ✅. Pack adapter Type G ⚡"

### 16. Atlas Obscura (Hidden Gems)
**What:** Unique attractions, secret spots, unusual places near any destination
**Source:** Atlas Obscura skill (borski/travel-hacking-toolkit) — FREE
**Implementation:** Every destination result includes "3 hidden gems nearby" — makes the tool feel alive and inspiring.

### 17. Points Wallet
**What:** Track all your loyalty balances in one place
**Source:** AwardWallet Business API ($XX/mo) or manual entry
**Implementation:** Dashboard showing: Emirates Skywards 87K, Hilton 240K, Amex MR 150K. Auto-suggest "You have enough for DXB→LHR business class!"

### 18. Multi-City Trip Planner
**What:** Plan complex itineraries: DXB→London (3 nights)→Paris (2 nights)→Istanbul (4 nights)→DXB
**Source:** Combine all existing tools + Kiwi's multi-city search
**Implementation:** AI builds the optimal route: cheapest flights between cities, best hotel at each stop, total cost in cash and points.

### 19. Scandinavia / Europe Transit
**What:** Trains, buses, ferries across Europe — often cheaper than flying
**Source:** Entur API (Norway/Sweden/Denmark — FREE) + Trainline scrape + Rome2rio
**Implementation:** For European destinations: "Fly to Stockholm $300 OR Train from Copenhagen $89 (6h)"

### 20. Weather & Best Time to Visit
**What:** Historical weather data, crowd levels, event calendars for destinations
**Source:** Open-Meteo (free) + custom data
**Implementation:** "Bali in April: 28°C, low season, hotels 40% cheaper, 8 rainy days"

---

## ARCHITECTURE: One Prompt, Everything

The AI chat already exists. The goal is:

**User types:** "Plan a week in Bali for 6 people, mid-April, business class, try points first, need 3+ bedrooms"

**TravelCheckpoint responds with:**
1. ✈️ **Flights** — Award seats on Emirates (87K miles/pp) + Cash on Turkish ($1,706/pp) + Hidden city option ($1,200/pp)
2. 🏨 **Hotels** — Hilton for 40K points/night vs Booking.com $180/night + Airbnb villa with pool $250/night
3. 🔑 **Visa** — Turkish passport: visa-free 30 days ✅
4. 💱 **Currency** — 1 AED = 4,200 IDR. Use Wise card for best rate.
5. 📶 **Data** — Airalo eSIM 10GB $4.50
6. 🏛️ **Hidden gem** — Tirta Gangga water palace (Atlas Obscura)
7. 💰 **Total** — Cash: $14,200 | Points: 522K miles + 280K hotel points + $2,100 cash

All from one natural language query. That's the product.

---

## IMPLEMENTATION PRIORITY

| Phase | What | Cost | Time |
|-------|------|------|------|
| **V2 (this week)** | Skiplagged + Kiwi + Trivago + Airbnb + Ferryhopper | $0 | 2-3 days |
| **V3 (next week)** | Visa checker + currency + rooms.aero + transfer partner map | $0 | 2-3 days |
| **V4 (week after)** | Price alerts + trip calculator + Atlas Obscura | $0 | 3-4 days |
| **V5 (month 2)** | Duffel booking + eSIM + lounge finder + points wallet | ~$30/mo | 1 week |

Total cost to build the most comprehensive travel tool on the internet: **~$40/month** (Seats.aero Pro + Duffel sandbox).
