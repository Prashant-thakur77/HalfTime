import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createHalfTimeServer } from "@halftime/mcp";
import { appEnv } from "./env";
import { clientIp } from "./reader";

/**
 * Remote MCP endpoint: https://halftime.prashantthakur.dev/mcp
 * Stateless Streamable HTTP. The connected client's own model reads the papers;
 * these tools only verify quotes and apply the law, so no API key is involved.
 */
export const MAX_BODY_BYTES = 2_000_000;
export const PER_MINUTE = 120;

/** Fallback counter for when KV is not bound (local runs): per isolate, per minute. */
const local = new Map<string, number>();

async function limited(req: Request): Promise<boolean> {
  const k = `rl:mcp:${clientIp(req)}:${Math.floor(Date.now() / 60000)}`;
  const kv = (await appEnv()).CACHE;
  if (!kv) {
    const n = (local.get(k) ?? 0) + 1;
    if (local.size > 5000) local.clear();
    local.set(k, n);
    return n > PER_MINUTE;
  }
  const n = Number((await kv.get(k)) ?? 0);
  if (n >= PER_MINUTE) return true;
  await kv.put(k, String(n + 1), { expirationTtl: 120 });
  return false;
}

const rpcError = (status: number, message: string) =>
  Response.json({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }, { status });

export async function handleMcp(req: Request): Promise<Response> {
  if (req.method === "POST") {
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_BODY_BYTES) return rpcError(413, "Request too large (max 2 MB).");
    if (await limited(req)) return rpcError(429, "Too many requests; try again in a minute.");
    const body = await req.text();
    if (body.length > MAX_BODY_BYTES) return rpcError(413, "Request too large (max 2 MB).");
    req = new Request(req.url, { method: "POST", headers: req.headers, body });
  }
  const server = createHalfTimeServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(req);
}
