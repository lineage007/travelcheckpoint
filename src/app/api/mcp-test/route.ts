import { NextResponse } from 'next/server';
import { listMcpTools } from '@/lib/mcp-client';
import { debugRoutesEnabled } from '@/lib/debug-routes';

export async function GET() {
  if (!debugRoutesEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const results: Record<string, unknown> = {};

  for (const server of ['skiplagged', 'kiwi', 'trivago']) {
    try {
      const tools = await listMcpTools(server);
      results[server] = {
        status: 'ok',
        tools: tools.tools.map(t => ({ name: t.name, desc: (t.description || '').slice(0, 80) })),
      };
    } catch (e) {
      results[server] = { status: 'error', error: String(e) };
    }
  }

  return NextResponse.json(results);
}
