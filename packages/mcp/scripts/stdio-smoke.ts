/** Starts the stdio server as Claude Desktop would and lists its tools. */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "node:url";

const bin = fileURLToPath(new URL("../bin/halftime-mcp.mjs", import.meta.url));
const client = new Client({ name: "stdio-smoke", version: "1" });
await client.connect(new StdioClientTransport({ command: process.execPath, args: [bin], env: { ...process.env, HALFTIME_ROOTS: process.argv[2] ?? process.cwd() } as Record<string, string> }));
console.log((await client.listTools()).tools.map((t) => t.name).join(", "));
const files = (await client.callTool({ name: "list_order_files", arguments: { folder: process.argv[2] ?? process.cwd() } })) as { content: { text: string }[] };
console.log(files.content[0]!.text);
await client.close();
