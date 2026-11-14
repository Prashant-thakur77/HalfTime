import { handleMcp } from "@/lib/server/mcp";

/**
 * Remote MCP endpoint: https://halftime.prashantthakur.dev/mcp
 * Stateless Streamable HTTP. The connected client's own model reads the papers;
 * these tools only verify quotes and apply the law, so no API key is involved.
 * Limits (body size, per-IP rate) live in lib/server/mcp.ts.
 */
export const POST = handleMcp;
export const GET = handleMcp;
export const DELETE = handleMcp;
