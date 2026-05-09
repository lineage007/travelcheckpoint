import { NextResponse } from 'next/server';

const PROVIDERS = [
  { id: 'seats', label: 'Seats.aero awards', env: 'SEATS_AERO_API_KEY', feature: 'Award-seat search + rooms.aero hotel points' },
  { id: 'liteapi', label: 'LiteAPI hotels', env: 'LITEAPI_KEY', feature: 'Hotel inventory and rate checks' },
  { id: 'cash', label: 'Cash flights API', env: 'CASH_FLIGHTS_API_URL', feature: 'Fast cash fare search' },
  { id: 'serpapi', label: 'SerpAPI Google Flights', env: 'SERPAPI_KEY', feature: 'Backup cash fares via Google Flights' },
  { id: 'duffel', label: 'Duffel', env: 'DUFFEL_API_KEY', feature: 'Bookable airline offers' },
  { id: 'skiplagged', label: 'Skiplagged proxy', env: 'SKIPLAGGED_PROXY_URL', feature: 'Live hidden-city checks' },
  { id: 'groq', label: 'Groq chat', env: 'GROQ_API_KEY', feature: 'Travel assistant chat' },
  { id: 'google-ai', label: 'Google AI', env: 'GOOGLE_AI_API_KEY', feature: 'Fallback travel assistant chat' },
];

export async function GET() {
  const providers = PROVIDERS.map((provider) => ({
    ...provider,
    configured: Boolean(process.env[provider.env]),
    status: process.env[provider.env] ? 'configured' : 'missing-key',
  }));

  return NextResponse.json({
    providers,
    configured: providers.filter(p => p.configured).length,
    total: providers.length,
    timestamp: new Date().toISOString(),
  });
}
