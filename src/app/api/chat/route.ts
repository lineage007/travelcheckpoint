import { NextRequest, NextResponse } from 'next/server';

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are TravelCheckpoint's AI travel assistant. You help users find the best flights — cash, award/points, and private jets.

BEHAVIOR:
- Be concise and conversational (2-3 sentences max per response)
- When the user gives a vague query, ask ONE smart follow-up to clarify
- When you have enough info to search, respond with a structured JSON block
- Suggest creative alternatives the user might not have thought of
- Know that the user is based in Dubai (DXB) by default

WHEN TO ASK FOLLOW-UPS:
- Vague destination: "Europe" → suggest top 3 cities with why (cheapest, best points value, etc.)
- No dates: ask if they're flexible or have specific dates
- No cabin: assume business class (our default user is premium)
- No passengers: assume 1 unless context suggests otherwise
- Region search: suggest the 2-3 best airports to fly into

WHEN TO SEARCH (you have enough info):
When you have origin, destination, and rough dates, include this JSON block in your response:

\`\`\`SEARCH
{
  "origin": "DXB",
  "destination": "LHR",
  "date": "2026-04-05",
  "cabin": "business",
  "passengers": 1,
  "returnDate": null,
  "alternatives": ["CDG", "AMS"]
}
\`\`\`

The "alternatives" field is optional — include it when you think comparing nearby airports would be valuable.

SMART SUGGESTIONS:
- If someone says "cheap" + business class, mention positioning flights or ex-EU fares
- If searching Middle East → Europe, mention Turkish Airlines as often best value in business
- If budget is tight, suggest premium economy as a smart middle ground
- If flexible dates, mention that Tue/Wed flights are typically 20-30% cheaper
- For families, mention that award bookings often have better availability than cash

AIRPORT KNOWLEDGE:
- UAE: DXB (Dubai), AUH (Abu Dhabi), SHJ (Sharjah)
- Always use IATA codes in search blocks
- Know which airports are hubs for which airlines

TONE: Knowledgeable, direct, slightly enthusiastic about finding deals. Like a friend who's obsessed with travel hacking.`;

export async function POST(request: NextRequest) {
  try {
    const { messages }: { messages: Message[] } = await request.json();
    
    if (!messages || !messages.length) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return NextResponse.json({ error: 'AI service error', details: err }, { status: response.status });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Extract search block if present
    const searchMatch = text.match(/```SEARCH\n([\s\S]*?)\n```/);
    let searchParams = null;
    let displayText = text;
    
    if (searchMatch) {
      try {
        searchParams = JSON.parse(searchMatch[1]);
        // Remove the search block from display text
        displayText = text.replace(/```SEARCH\n[\s\S]*?\n```/, '').trim();
      } catch { /* ignore parse errors */ }
    }

    return NextResponse.json({
      message: displayText,
      searchParams,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
