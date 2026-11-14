/**
 * Smoke test for a remote HalfTime MCP endpoint, using the official client over
 * Streamable HTTP. Usage: tsx scripts/remote-smoke.ts https://halftime.prashantthakur.dev/mcp
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { readFileSync } from "node:fs";

const url = process.argv[2] ?? "http://localhost:3100/mcp";
const client = new Client({ name: "halftime-smoke", version: "1" });
await client.connect(new StreamableHTTPClientTransport(new URL(url)));

const tools = (await client.listTools()).tools.map((t) => t.name);
console.log("tools:", tools.join(", "));

const samples = JSON.parse(readFileSync(new URL("../../../data/samples/samples.json", import.meta.url), "utf8"));
const runs = JSON.parse(readFileSync(new URL("../../../apps/web/src/data/sample-runs.json", import.meta.url), "utf8"));
const s01 = samples.find((s: { id: string }) => s.id === "S01");
const r = (await client.callTool({ name: "check_order", arguments: { document_text: s01.text, extraction: runs.S01.extraction, today: "2026-11-15" } })) as {
  content: { text: string }[];
};
console.log(r.content[0]!.text.split("\n").slice(0, 3).join("\n"));
await client.close();
