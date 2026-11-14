/** HalfTime MCP server over stdio, for Claude Desktop and Claude Code. */
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { nodeFiles } from "./files.js";
import { createHalfTimeServer } from "./tools.js";

const server = createHalfTimeServer({ files: nodeFiles() });
await server.connect(new StdioServerTransport());
