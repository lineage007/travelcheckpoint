/**
 * Debug-only API routes (`/api/mcp-test`) answer only outside production.
 *
 * `/api/mcp-test` has no caller in the app: it lists the tool inventory of the
 * Skiplagged, Kiwi and Trivago MCP servers and opens three outbound MCP
 * sessions on every unauthenticated GET. On Vercel (preview and production)
 * `NODE_ENV` is `production`, so the route is reachable only under `next dev`.
 */
export function debugRoutesEnabled(env: { NODE_ENV?: string } = process.env): boolean {
  return env.NODE_ENV !== 'production';
}
