import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createHalfTimeServer, type FileAccess } from "@halftime/mcp";
import { GET as healthGET } from "@/app/api/health/route";
import { POST as rulesPOST } from "@/app/api/rules/route";
import { facts } from "@/lib/facts";

/**
 * Examples on the docs pages are produced at build time by the real handlers, not typed by hand:
 * the /api/rules route, the /api/health route, and the same MCP server and transport that /mcp uses.
 */

/** The fixed "today" the examples use: the date the evaluation fixes as today. */
export const EXAMPLE_TODAY = ((facts.eval as { today?: string } | null)?.today ?? "2026-11-15") as string;

export const MCP_HEADERS = { "content-type": "application/json", accept: "application/json, text/event-stream" };

/** Stands in for disk access so the local server's tool list can be read; it is never called. */
const NO_DISK: FileAccess = {
  list: async () => [],
  read: async () => "",
  writeDocx: async (p) => p
};

/** One JSON-RPC exchange with the HalfTime MCP server, exactly as /mcp would answer it (minus the rate limit). */
export async function mcpExchange(body: unknown, opts: { local?: boolean } = {}): Promise<{ status: number; json: unknown }> {
  const server = createHalfTimeServer(opts.local ? { files: NO_DISK } : {});
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  const res = await transport.handleRequest(new Request("https://example.invalid/mcp", { method: "POST", headers: MCP_HEADERS, body: JSON.stringify(body) }));
  const text = await res.text();
  await server.close();
  return { status: res.status, json: JSON.parse(text) as unknown };
}

/** The text a tool call returns (the first text content block). */
export async function mcpToolText(name: string, args: Record<string, unknown>): Promise<string> {
  const r = await mcpExchange({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } });
  const content = (r.json as { result?: { content?: { type: string; text: string }[] } }).result?.content ?? [];
  return content.find((c) => c.type === "text")?.text ?? "";
}

export async function rulesExchange(body: unknown): Promise<{ status: number; json: unknown }> {
  const res = await rulesPOST(new Request("https://example.invalid/api/rules", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  return { status: res.status, json: (await res.json()) as unknown };
}

export async function healthExchange(): Promise<{ status: number; json: unknown }> {
  const res = await healthGET();
  return { status: res.status, json: (await res.json()) as unknown };
}

export const pretty = (v: unknown) => JSON.stringify(v, null, 2);

export interface ToolInfo {
  name: string;
  title?: string;
  description?: string;
  inputSchema: { properties?: Record<string, { type?: string | string[]; description?: string; enum?: string[] }>; required?: string[] };
}

/** The tools as tools/list describes them: the remote server, or the local one with file access. */
export async function mcpTools(local = false): Promise<ToolInfo[]> {
  const r = await mcpExchange({ jsonrpc: "2.0", id: 1, method: "tools/list" }, { local });
  return (r.json as { result: { tools: ToolInfo[] } }).result.tools;
}
