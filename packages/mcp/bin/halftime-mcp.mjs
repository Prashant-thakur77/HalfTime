#!/usr/bin/env node
// Starts the HalfTime MCP server over stdio (TypeScript sources run through tsx).
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const tsx = createRequire(import.meta.url).resolve("tsx/cli");
const child = spawn(process.execPath, [tsx, join(here, "..", "src", "stdio.ts")], { stdio: "inherit", env: process.env });
child.on("exit", (code) => process.exit(code ?? 0));
