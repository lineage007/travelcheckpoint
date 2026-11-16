/**
 * Debug-only API routes (`/api/mcp-test`) answer only under `next dev` and in tests.
 *
 * `/api/mcp-test` has no caller in the app: it lists the tool inventory of the
 * Skiplagged, Kiwi and Trivago MCP servers and opens three outbound MCP
 * sessions on every unauthenticated GET. The gate is an allowlist, so any
 * other `NODE_ENV` (production, unset, staging, a typo) keeps the route off.
 */
const DEBUG_NODE_ENVS: ReadonlySet<string> = new Set(['development', 'test']);

export function debugRoutesEnabled(env: { NODE_ENV?: string } = process.env): boolean {
  return DEBUG_NODE_ENVS.has(env.NODE_ENV ?? '');
}
