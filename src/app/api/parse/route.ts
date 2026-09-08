import { NextRequest, NextResponse } from 'next/server';
import { parseQuery } from '@/lib/query-parser';

// Thin HTTP wrapper. All parsing logic lives in src/lib/query-parser.ts so it
// can be unit-tested without a request object; the response shape is unchanged.
export async function POST(request: NextRequest) {
  // H5: Accept homeAirport param so the user's saved home airport is used as default origin.
  const { query, homeAirport } = await request.json();
  if (!query) return NextResponse.json({ error: 'No query provided' }, { status: 400 });

  return NextResponse.json({ parsed: parseQuery(query, homeAirport), raw: query });
}
