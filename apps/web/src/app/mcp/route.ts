import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createHalfTimeServer } from "@halftime/mcp";
import { appEnv } from "@/lib/server/env";
import { clientIp } from "@/lib/server/reader";

/**
 * Remote MCP endpoint: https://halftime.prashantthakur.dev/mcp
 * Stateless Streamable HTTP. The connected client's own model reads the papers;
 * these tools only verify quotes and apply the law, so no API key is involved.
 */
async function limited(req: Request): Promise<boolean> {
  const kv = (await appEnv()).CACHE;
  if (!kv) return false;
  const k = `rl:mcp:${clientIp(req)}:${Math.floor(Date.now() / 60000)}`;
  const n = Number((await kv.get(k)) ?? 0);
  if (n >= 120) return true;
  await kv.put(k, String(n + 1), { expirationTtl: 120 });
  return false;
}

async function handle(req: Request): Promise<Response> {
  if (req.method === "POST" && (await limited(req))) {
    return Response.json({ jsonrpc: "2.0", error: { code: -32000, message: "Too many requests; try again in a minute." }, id: null }, { status: 429 });
  }
  const server = createHalfTimeServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
