import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const MCP_SERVERS: Record<string, string> = {
  skiplagged: 'https://mcp.skiplagged.com/mcp',
  kiwi: 'https://mcp.kiwi.com',
  trivago: 'https://mcp.trivago.com/mcp',
  ferryhopper: 'https://mcp.ferryhopper.com/mcp',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callMcpTool(server: string, toolName: string, args: Record<string, unknown>): Promise<any> {
  const url = MCP_SERVERS[server];
  if (!url) throw new Error(`Unknown MCP server: ${server}`);

  const transport = new StreamableHTTPClientTransport(new URL(url));
  const client = new Client({ name: 'travelcheckpoint', version: '1.0.0' });

  try {
    await client.connect(transport);
    const result = await client.callTool({ name: toolName, arguments: args });
    return result;
  } finally {
    try { await client.close(); } catch { /* ignore */ }
  }
}

export async function listMcpTools(server: string) {
  const url = MCP_SERVERS[server];
  if (!url) throw new Error(`Unknown MCP server: ${server}`);

  const transport = new StreamableHTTPClientTransport(new URL(url));
  const client = new Client({ name: 'travelcheckpoint', version: '1.0.0' });

  try {
    await client.connect(transport);
    const tools = await client.listTools();
    return tools;
  } finally {
    try { await client.close(); } catch { /* ignore */ }
  }
}
