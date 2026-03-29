import { NextRequest, NextResponse } from 'next/server';

const GROQ_KEY = process.env.GROQ_API_KEY || '';
const GOOGLE_AI_KEY = process.env.GOOGLE_AI_API_KEY || '';

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

async function callGroq(messages: Message[]): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGemini(messages: Message[]): Promise<string> {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function POST(request: NextRequest) {
  try {
    const { messages }: { messages: Message[] } = await request.json();

    if (!messages || !messages.length) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    let text = '';
    let lastError = '';

    // Priority 1: Groq (fast, free, generous limits)
    if (!text && GROQ_KEY) {
      try {
        text = await callGroq(messages);
      } catch (e) {
        lastError = String(e);
        console.error('Groq failed:', lastError);
      }
    }

    // Priority 2: Gemini (free tier)
    if (!text && GOOGLE_AI_KEY) {
      try {
        text = await callGemini(messages);
      } catch (e) {
        lastError = String(e);
        console.error('Gemini failed:', lastError);
      }
    }

    if (!text) {
      return NextResponse.json({
        error: 'AI service unavailable',
        details: lastError,
      }, { status: 500 });
    }

    // Extract search block if present
    const searchMatch = text.match(/```SEARCH\n([\s\S]*?)\n```/);
    let searchParams = null;
    let displayText = text;

    if (searchMatch) {
      try {
        searchParams = JSON.parse(searchMatch[1]);
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
