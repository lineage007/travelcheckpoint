import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { debugRoutesEnabled } from './debug-routes';

describe('debugRoutesEnabled', () => {
  it('is off in production builds (Vercel preview and production)', () => {
    expect(debugRoutesEnabled({ NODE_ENV: 'production' })).toBe(false);
  });

  it('is on under next dev and in tests', () => {
    expect(debugRoutesEnabled({ NODE_ENV: 'development' })).toBe(true);
    expect(debugRoutesEnabled({ NODE_ENV: 'test' })).toBe(true);
  });

  it('gates /api/mcp-test before any MCP call', () => {
    const src = readFileSync(join(__dirname, '..', 'app', 'api', 'mcp-test', 'route.ts'), 'utf8');
    const gate = src.indexOf('if (!debugRoutesEnabled())');
    const firstCall = src.indexOf('listMcpTools(server)');
    expect(gate).toBeGreaterThan(-1);
    expect(firstCall).toBeGreaterThan(gate);
  });
});
